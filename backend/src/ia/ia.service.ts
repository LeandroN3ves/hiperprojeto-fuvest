import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Estatistica } from '../database/entities/estatistica.entity';
import { Questao } from '../database/entities/questao.entity';
import { Prova } from '../database/entities/prova.entity';
import { FallbackRegrasService } from './fallback/regras.service';

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly TIMEOUT_MS = 30000; // 30s para APIs cloud

  constructor(
    private configService: ConfigService,
    @InjectRepository(Estatistica) private estatisticaRepo: Repository<Estatistica>,
    @InjectRepository(Questao) private questaoRepo: Repository<Questao>,
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
    private fallbackService: FallbackRegrasService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────────────────────────────────

  async chat(usuarioId: string, mensagem: string, historico: MensagemChat[] = []) {
    const { contexto, temasFracos, mediaAcertos } = await this.montarContextoUsuario(usuarioId);

    // 1. Tentar OpenRouter (modelos gratuitos)
    const openrouterKey = this.configService.get<string>('openrouter.apiKey');
    if (openrouterKey) {
      try {
        const resposta = await this.chamarOpenRouter(contexto, mensagem, historico);
        return { resposta, fonte: 'openrouter' };
      } catch (e) {
        this.logger.warn(`OpenRouter falhou: ${e?.message || e}. Tentando Gemini direto...`);
      }
    } else {
      this.logger.warn('OpenRouter API key não está configurada. Pulando para Gemini...');
    }

    // 2. Tentar Gemini direto (backup)
    try {
      const resposta = await this.chamarGemini(contexto, mensagem, historico);
      return { resposta, fonte: 'gemini' };
    } catch (e) {
      this.logger.warn(`Gemini falhou: ${e?.message || e}. Tentando Ollama...`);
    }

    // 3. Tentar Ollama (Local — só funciona em dev)
    try {
      const resposta = await this.chamarOllama(contexto, mensagem, historico);
      return { resposta, fonte: 'ollama' };
    } catch (e) {
      this.logger.warn(`Ollama indisponível: ${e?.message || e}. Usando fallback por regras...`);
    }

    // 4. Fallback garantido
    const resposta = this.fallbackService.responderChat(mensagem, { temasFracos, mediaAcertos });
    return { resposta, fonte: 'fallback' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUGESTÕES
  // ─────────────────────────────────────────────────────────────────────────

  async getSugestoes(usuarioId: string) {
    const { temasFracos, mediaAcertos } = await this.montarContextoUsuario(usuarioId);

    const sugestoes = [];

    if (temasFracos.length > 0) {
      sugestoes.push({
        tipo: 'prova_focada',
        titulo: `Prova focada em ${temasFracos[0].tema}`,
        descricao: `Seu tema mais fraco é "${temasFracos[0].tema}" com ${Math.round(temasFracos[0].taxa_erro)}% de erro. Pratique mais!`,
        acao: {
          temas: [temasFracos[0].tema],
          qtd_questoes: 10,
          distribuicao: { facil: 20, medio: 40, dificil: 40 },
        },
      });
    }

    if (temasFracos.length > 1) {
      sugestoes.push({
        tipo: 'prova_mista',
        titulo: 'Prova de revisão múltipla',
        descricao: 'Combine seus temas mais fracos em uma prova única para otimizar o tempo.',
        acao: {
          temas: temasFracos.slice(0, 3).map((t) => t.tema),
          qtd_questoes: 15,
          distribuicao: { facil: 30, medio: 40, dificil: 30 },
        },
      });
    }

    sugestoes.push({
      tipo: 'prova_geral',
      titulo: 'Simulado geral',
      descricao: 'Mantenha a consistência com uma prova abrangendo todos os temas do seu curso.',
      acao: {
        qtd_questoes: 20,
        distribuicao: { facil: 33, medio: 34, dificil: 33 },
      },
    });

    return { sugestoes, fonte: 'fallback' };
  }

  /**
   * Método genérico para solicitar JSON estruturado da IA.
   */
  async gerarJsonEstruturado(prompt: string, textoBase: string): Promise<any> {
    const systemPrompt = 'Você é um assistente que extrai dados e responde estritamente em JSON válido.';
    const mensagemCompleta = `${prompt}\n\nTexto para processar:\n${textoBase}`;

    try {
      // Tentar OpenRouter primeiro, depois Gemini, depois Ollama
      const resposta = await this.chamarOpenRouter(systemPrompt, mensagemCompleta, [])
        .catch(() => this.chamarGemini(systemPrompt, mensagemCompleta, []))
        .catch(() => this.chamarOllama(systemPrompt, mensagemCompleta, []));

      // Limpar possíveis marcas de markdown (```json ... ```)
      const jsonLimpo = resposta.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonLimpo);
    } catch (e) {
      this.logger.error('Erro ao gerar JSON estruturado via IA', e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GERAÇÃO DE PROVA POR IA
  // ─────────────────────────────────────────────────────────────────────────

  async gerarProvaIA(temas: string[], qtdQuestoes: number, usuarioId: string) {
    // Limitar temas para caber no prompt (evitar prompts gigantes)
    const temasLimpos = temas.map(t => t.substring(0, 80).trim()).slice(0, 5);
    const temasTexto = temasLimpos.join(', ').substring(0, 500);

    this.logger.log(`Gerando prova IA: ${qtdQuestoes} questões sobre [${temasTexto}]`);

    const prompt = `Você é um elaborador de provas da FUVEST (vestibular da USP), reconhecido por criar questões desafiadoras que exigem raciocínio crítico.

Gere exatamente ${qtdQuestoes} questões de múltipla escolha DIFÍCEIS sobre: ${temasTexto}.

NÍVEL DE DIFICULDADE — FUVEST 1ª FASE:
- Questões que exigem ANÁLISE, INTERPRETAÇÃO e APLICAÇÃO de conceitos (nunca apenas memorização)
- Alternativas com distratores plausíveis que testem compreensão profunda
- Inclua questões que cruzem subtemas ou exijam raciocínio em múltiplas etapas
- Evite perguntas triviais como "o que é X?" ou definições diretas
- Pelo menos metade das questões deve exigir resolução de problemas ou análise de situações

FORMATO OBRIGATÓRIO:
- 5 alternativas (A-E), apenas 1 correta
- NÃO numere as questões
- Enunciados podem ter até 3 frases para contextualizar o problema
- Alternativas objetivas (1 frase cada)

Responda APENAS com JSON válido, sem markdown:
[{"enunciado":"pergunta","alternativas":[{"letra":"A","texto":"..."},...],"resposta_correta":"A","tema":"tema"}]`;

    let questoesGeradas: any[];

    try {
      // Tentar OpenRouter primeiro (com mais tokens para provas)
      const respostaRaw = await this.chamarOpenRouterParaProva(prompt);
      questoesGeradas = this.parseQuestoesJSON(respostaRaw);
    } catch (e) {
      this.logger.warn(`OpenRouter falhou para geração de prova: ${e?.message}. Tentando Gemini...`);
      try {
        const respostaRaw = await this.chamarGemini(
          'Responda estritamente em JSON válido, sem markdown.',
          prompt, []
        );
        questoesGeradas = this.parseQuestoesJSON(respostaRaw);
      } catch (e2) {
        this.logger.error(`Nenhum provedor de IA disponível para gerar prova: ${e2?.message}`);
        throw new BadRequestException(
          'Não foi possível gerar a prova no momento. Tente novamente em alguns instantes.'
        );
      }
    }

    // Validar quantidade mínima
    if (!questoesGeradas || questoesGeradas.length === 0) {
      throw new BadRequestException('A IA não conseguiu gerar questões válidas. Tente novamente.');
    }

    this.logger.log(`IA gerou ${questoesGeradas.length} questões. Salvando no banco...`);

    // Salvar questões no banco
    const questoesSalvas: Questao[] = [];
    for (const q of questoesGeradas) {
      const novaQuestao = new Questao();
      novaQuestao.enunciado = q.enunciado;
      novaQuestao.alternativas = q.alternativas;
      novaQuestao.resposta_correta = q.resposta_correta?.toUpperCase();
      novaQuestao.tema = q.tema || temas[0];
      novaQuestao.categoria = null as any;
      novaQuestao.ano_fuvest = null as any;
      novaQuestao.imagem_url = null as any;
      novaQuestao.explicacao = null as any;
      novaQuestao.classificado = false;
      novaQuestao.gerada_por_ia = true;
      novaQuestao.usuario_id_gerador = usuarioId;
      const salva = await this.questaoRepo.save(novaQuestao);
      questoesSalvas.push(salva);
    }

    // Criar prova
    const prova = this.provaRepo.create({
      usuario_id: usuarioId,
      tipo: 'ia_gerada',
      configuracao: {
        qtd_questoes: questoesSalvas.length,
        temas,
        distribuicao: { facil: 33, medio: 34, dificil: 33 },
        questoes_ids: questoesSalvas.map(q => q.id),
      },
    });
    const provaSalva = await this.provaRepo.save(prova);

    this.logger.log(`Prova IA criada: ${provaSalva.id} com ${questoesSalvas.length} questões`);

    return {
      prova_id: provaSalva.id,
      primeira_questao: {
        id: questoesSalvas[0].id,
        enunciado: questoesSalvas[0].enunciado,
        alternativas: questoesSalvas[0].alternativas,
        numero: 1,
        total: questoesSalvas.length,
      },
    };
  }

  /**
   * Chamada OpenRouter com mais tokens para geração de provas
   */
  private async chamarOpenRouterParaProva(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('openrouter.apiKey');
    if (!apiKey) throw new Error('OpenRouter API key não configurada');

    const modelos = [
      'nvidia/llama-3.3-nemotron-super-49b-v1:free',
      'google/gemma-3-27b-it:free',
      'openrouter/auto',
    ];

    for (const modelo of modelos) {
      try {
        this.logger.log(`OpenRouter (prova) tentando modelo: ${modelo}...`);
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: modelo,
            messages: [
              { role: 'system', content: 'Você é um gerador de questões de vestibular. Responda APENAS com JSON válido, sem texto adicional.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 4000,
            temperature: 0.8,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://hiperprojeto-fuvest.vercel.app',
              'X-Title': 'HiperprojetoFuvest',
            },
            timeout: 90000, // 90s — geração de prova demora mais
          },
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          this.logger.log(`OpenRouter (prova) respondeu via modelo: ${modelo}`);
          return content;
        }
        this.logger.warn(`OpenRouter modelo ${modelo} retornou vazio, tentando próximo...`);
      } catch (e) {
        const errorMsg = e?.response?.data?.error?.message || e?.message || 'erro desconhecido';
        this.logger.warn(`OpenRouter (prova) modelo ${modelo} falhou: ${errorMsg}`);
        if (modelo === modelos[modelos.length - 1]) {
          throw new Error(`Todos os modelos OpenRouter falharam. Último erro: ${errorMsg}`);
        }
      }
    }
    throw new Error('Todos os modelos OpenRouter falharam');
  }

  /**
   * Parse e validação do JSON de questões retornado pela IA.
   * Robusto contra JSON truncado (extrai questões completas mesmo se a resposta foi cortada).
   */
  private parseQuestoesJSON(raw: string): any[] {
    // Limpar possíveis marcas de markdown
    let limpo = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    // Tentar encontrar array JSON na resposta
    const inicioArray = limpo.indexOf('[');
    if (inicioArray !== -1) {
      limpo = limpo.substring(inicioArray);
    }

    // Tentar parse direto primeiro
    let questoes: any[] | null = null;
    try {
      questoes = JSON.parse(limpo);
    } catch (e) {
      this.logger.warn(`JSON completo falhou, tentando recuperar questões parciais...`);
      
      // Estratégia: encontrar objetos JSON completos individualmente
      // Procurar cada {...} que contenha "enunciado" e "resposta_correta"
      questoes = [];
      let profundidade = 0;
      let inicioObj = -1;
      
      for (let i = 0; i < limpo.length; i++) {
        if (limpo[i] === '{') {
          if (profundidade === 0) inicioObj = i;
          profundidade++;
        } else if (limpo[i] === '}') {
          profundidade--;
          if (profundidade === 0 && inicioObj !== -1) {
            const objStr = limpo.substring(inicioObj, i + 1);
            try {
              const obj = JSON.parse(objStr);
              if (obj.enunciado && obj.alternativas && obj.resposta_correta) {
                questoes.push(obj);
              }
            } catch {
              // Objeto incompleto, ignorar
            }
            inicioObj = -1;
          }
        }
      }
      
      this.logger.log(`Recuperadas ${questoes.length} questões de JSON truncado`);
    }

    if (!Array.isArray(questoes)) {
      throw new Error('A resposta da IA não é um array de questões');
    }

    // Validar cada questão
    const validas = questoes.filter(q => {
      if (!q.enunciado || !q.alternativas || !q.resposta_correta) return false;
      if (!Array.isArray(q.alternativas) || q.alternativas.length < 4) return false;
      const letrasValidas = ['A', 'B', 'C', 'D', 'E'];
      if (!letrasValidas.includes(q.resposta_correta?.toUpperCase())) return false;
      return true;
    });

    this.logger.log(`${validas.length} questões válidas após filtragem`);
    return validas;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROVIDERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * OpenRouter — Provider principal (modelos gratuitos)
   * Usa o roteador automático gratuito do OpenRouter.
   */
  private async chamarOpenRouter(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const apiKey = this.configService.get<string>('openrouter.apiKey');
    if (!apiKey) throw new Error('OpenRouter API key não configurada');

    // Modelos gratuitos disponíveis (Abril 2026)
    // openrouter/auto seleciona automaticamente o melhor modelo grátis disponível
    const modelos = [
      'nvidia/llama-3.3-nemotron-super-49b-v1:free',
      'google/gemma-3-27b-it:free',
      'openrouter/auto',
    ];

    for (const modelo of modelos) {
      try {
        this.logger.log(`OpenRouter tentando modelo: ${modelo}...`);
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: modelo,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historico.map(h => ({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: h.content,
              })),
              { role: 'user', content: mensagem },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://hiperprojeto-fuvest.vercel.app',
              'X-Title': 'HiperprojetoFuvest',
            },
            timeout: 60000, // 60s para modelos gratuitos (mais lentos)
          },
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          this.logger.log(`OpenRouter respondeu via modelo: ${modelo}`);
          return content;
        }

        // Verificar se houve erro na resposta
        const errorMsg = response.data?.error?.message;
        if (errorMsg) {
          this.logger.warn(`OpenRouter modelo ${modelo} erro: ${errorMsg}`);
          continue;
        }

        this.logger.warn(`OpenRouter modelo ${modelo} retornou resposta vazia, tentando próximo...`);
      } catch (e) {
        const status = e?.response?.status;
        const errorData = e?.response?.data;
        const errorMsg = errorData?.error?.message || e?.message || 'erro desconhecido';
        
        this.logger.warn(`OpenRouter modelo ${modelo} falhou (status: ${status || 'N/A'}): ${errorMsg}`);
        
        // Se não é o último modelo, tenta o próximo
        if (modelo !== modelos[modelos.length - 1]) {
          continue;
        }
        throw new Error(`Todos os modelos OpenRouter falharam. Último erro: ${errorMsg}`);
      }
    }

    throw new Error('Todos os modelos OpenRouter falharam');
  }

  /**
   * Gemini direto — Backup
   */
  private async chamarGemini(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) throw new Error('Gemini API key não configurada');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelos = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

    for (const modeloNome of modelos) {
      try {
        const model = genAI.getGenerativeModel({ model: modeloNome });

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemPrompt + "\n\nEntendido?" }] },
            { role: 'model', parts: [{ text: "Sim, entendi. Estou pronto para atuar como seu tutor especializado na Fuvest." }] },
            ...historico.map(h => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            }))
          ],
        });

        const result = await chat.sendMessage(mensagem);
        const response = await result.response;
        this.logger.log(`Gemini respondeu via modelo: ${modeloNome}`);
        return response.text();
      } catch (e) {
        const is429 = e?.message?.includes('429') || e?.message?.includes('quota');
        if (is429 && modeloNome !== modelos[modelos.length - 1]) {
          this.logger.warn(`Modelo ${modeloNome} com quota esgotada, tentando próximo...`);
          continue;
        }
        throw e;
      }
    }

    throw new Error('Todos os modelos Gemini falharam');
  }

  /**
   * Ollama — Apenas para desenvolvimento local
   */
  private async chamarOllama(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const baseUrl = this.configService.get<string>('ollama.baseUrl');
    const model = this.configService.get<string>('ollama.model');

    const response = await axios.post(
      `${baseUrl}/api/chat`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historico,
          { role: 'user', content: mensagem },
        ],
        stream: false,
      },
      { timeout: 300000 }, // 5min para Ollama local (modelos pesados)
    );

    return response.data.message?.content ?? '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async montarContextoUsuario(usuarioId: string) {
    const stats = await this.estatisticaRepo.find({ where: { usuario_id: usuarioId } });

    const temasFracos = stats
      .map((s) => ({
        tema: s.tema,
        acertos: s.acertos,
        erros: s.erros,
        taxa_erro: s.acertos + s.erros > 0
          ? (s.erros / (s.acertos + s.erros)) * 100
          : 0,
      }))
      .filter((t) => t.acertos + t.erros >= 3)
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, 3);

    const totalQuestoes = stats.reduce((acc, s) => acc + s.acertos + s.erros, 0);
    const totalAcertos = stats.reduce((acc, s) => acc + s.acertos, 0);
    const mediaAcertos = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;

    const contexto = `
Você é um tutor especializado na Fuvest (vestibular da USP).
Responda sempre em português brasileiro de forma didática e objetiva.

Dados do aluno:
- Taxa de acerto geral: ${Math.round(mediaAcertos)}%
- Temas com mais erro: ${temasFracos.map((t) => `${t.tema} (${Math.round(t.taxa_erro)}% erro)`).join(', ') || 'nenhum identificado ainda'}
- Total de questões respondidas: ${totalQuestoes}

Foque nas dificuldades do aluno e dê conselhos práticos para a Fuvest.
`.trim();

    return { contexto, temasFracos, mediaAcertos };
  }
}
