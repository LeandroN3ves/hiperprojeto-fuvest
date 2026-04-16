import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Estatistica } from '../database/entities/estatistica.entity';
import { FallbackRegrasService } from './fallback/regras.service';

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly TIMEOUT_MS = 300000; // Aumentado para 300s (5min) para Ollama local

  constructor(
    private configService: ConfigService,
    @InjectRepository(Estatistica) private estatisticaRepo: Repository<Estatistica>,
    private fallbackService: FallbackRegrasService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────────────────────────────────

  async chat(usuarioId: string, mensagem: string, historico: MensagemChat[] = []) {
    const { contexto, temasFracos, mediaAcertos } = await this.montarContextoUsuario(usuarioId);

    // 1. Tentar Gemini (Recomendado para Produção)
    try {
      const resposta = await this.chamarGemini(contexto, mensagem, historico);
      return { resposta, fonte: 'gemini' };
    } catch (e) {
      this.logger.warn('Gemini não configurado ou erro, tentando Ollama...');
    }

    // 2. Tentar Ollama (Local)
    try {
      const resposta = await this.chamarOllama(contexto, mensagem, historico);
      return { resposta, fonte: 'ollama' };
    } catch (e) {
      this.logger.warn('Ollama indisponível, tentando alternativa...');
    }

    // 3. Tentar HuggingFace
    try {
      const resposta = await this.chamarHuggingFace(contexto, mensagem, historico);
      return { resposta, fonte: 'huggingface' };
    } catch (e) {
      this.logger.warn('HuggingFace indisponível, usando fallback por regras...');
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
    try {
      // Tentar Gemini primeiro para extração em produção
      const resposta = await this.chamarGemini(
        'Você é um assistente que extrai dados e responde estritamente em JSON válido.',
        `${prompt}\n\nTexto para processar:\n${textoBase}`,
        []
      ).catch(() => this.chamarOllama(
        'Você é um assistente que extrai dados e responde estritamente em JSON válido.',
        `${prompt}\n\nTexto para processar:\n${textoBase}`,
        []
      ));

      // Limpar possíveis marcas de markdown (```json ... ```)
      const jsonLimpo = resposta.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonLimpo);
    } catch (e) {
      this.logger.error('Erro ao gerar JSON estruturado via IA', e);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
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
      { timeout: this.TIMEOUT_MS },
    );

    return response.data.message?.content ?? '';
  }

  private async chamarHuggingFace(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const apiKey = this.configService.get<string>('huggingface.apiKey');
    if (!apiKey) throw new Error('HuggingFace API key não configurada');

    const prompt = `${systemPrompt}\n\nUsuário: ${mensagem}\nAssistente:`;

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      { inputs: prompt, parameters: { max_new_tokens: 500, temperature: 0.7 } },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: this.TIMEOUT_MS,
      },
    );

    const texto = response.data[0]?.generated_text ?? '';
    return texto.split('Assistente:').pop()?.trim() ?? '';
  }

  private async chamarGemini(
    systemPrompt: string, mensagem: string, historico: MensagemChat[]
  ): Promise<string> {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) throw new Error('Gemini API key não configurada');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    return response.text();
  }
}
