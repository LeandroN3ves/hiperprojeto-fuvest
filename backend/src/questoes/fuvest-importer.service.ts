import { Injectable, Logger } from '@nestjs/common';
import { QuestoesService } from './questoes.service';
import { IaService } from '../ia/ia.service';
import * as fs from 'fs';
import * as path from 'path';

// pdf-parse v2 exporta PDFParse como classe
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

// Mapeamento de temas para categorias
const TEMA_CATEGORIA: Record<string, string> = {
  'Matemática': 'Exatas', 'Matematica': 'Exatas',
  'Física': 'Exatas', 'Fisica': 'Exatas',
  'Química': 'Exatas', 'Quimica': 'Exatas',
  'Biologia': 'Biologicas',
  'História': 'Humanas', 'Historia': 'Humanas',
  'Geografia': 'Humanas',
  'Português': 'Humanas', 'Portugues': 'Humanas',
  'Literatura': 'Humanas',
  'Filosofia': 'Humanas',
  'Sociologia': 'Humanas',
  'Inglês': 'Humanas', 'Ingles': 'Humanas',
};

function categoriaDeTema(tema: string): string {
  if (!tema) return 'Exatas';
  // Buscar por substring no mapeamento
  for (const [key, cat] of Object.entries(TEMA_CATEGORIA)) {
    if (tema.toLowerCase().includes(key.toLowerCase())) return cat;
  }
  return 'Exatas'; // fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class FuvestImporterService {
  private readonly logger = new Logger(FuvestImporterService.name);

  constructor(
    private questoesService: QuestoesService,
    private iaService: IaService,
  ) {}

  /**
   * Importa uma prova completa a partir de um PDF.
   * @param pdfPath Caminho absoluto para o PDF
   * @param ano Ano da prova (opcional, tenta detectar do nome)
   * @param dryRun Se true, salva JSON no disco ao invés do banco
   */
  async importarArquivo(pdfPath: string, ano?: number, dryRun = false) {
    this.logger.log(`=== Iniciando importação: ${path.basename(pdfPath)} ===`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Arquivo não encontrado: ${pdfPath}`);
    }

    // 1. Extrair texto do PDF (PDFParse v2 API)
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const textoCompleto: string = textResult.text;
    const numPages = textResult.pages?.length || 0;
    this.logger.log(`Texto extraído: ${textoCompleto.length} caracteres, ${numPages} páginas.`);

    if (textoCompleto.length < 100) {
      this.logger.warn('PDF com pouco texto — pode ser escaneado (imagem). Pulando...');
      return { questoesTotais: 0, erros: 0 };
    }

    // 2. Buscar gabarito correspondente
    const gabaritoTexto = await this.buscarGabarito(pdfPath);
    if (gabaritoTexto) {
      this.logger.log('Gabarito oficial encontrado!');
    } else {
      this.logger.warn('Gabarito não encontrado — IA tentará deduzir respostas.');
    }

    // 3. Detectar ano
    const anoDetectado = ano || this.extrairAnoDoNome(pdfPath);
    this.logger.log(`Ano detectado: ${anoDetectado || 'desconhecido'}`);

    // 4. Detectar tipo de prova
    const nomeArquivo = path.basename(pdfPath).toLowerCase();
    const ehSegundaFase = nomeArquivo.includes('2fase') || nomeArquivo.includes('segunda_fase') || nomeArquivo.includes('2_fase');
    this.logger.log(`Tipo: ${ehSegundaFase ? '2ª Fase (dissertativa → converter para múltipla escolha)' : '1ª Fase (múltipla escolha)'}`);

    // 5. Dividir o texto em chunks inteligentes
    const chunks = this.dividirEmChunks(textoCompleto);
    this.logger.log(`Dividido em ${chunks.length} chunks para processamento.`);

    // 6. Processar cada chunk com a IA
    const todasQuestoesExtraidas: any[] = [];
    let erros = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.log(`Processando chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

      try {
        const prompt = this.montarPrompt(ehSegundaFase, gabaritoTexto);
        const questoesJson = await this.iaService.gerarJsonEstruturado(prompt, chunk);

        if (Array.isArray(questoesJson)) {
          for (const q of questoesJson) {
            // Validar campos mínimos
            if (!q.enunciado || !q.alternativas || !q.resposta_correta) {
              this.logger.warn(`Questão ignorada (campos incompletos): ${JSON.stringify(q).substring(0, 100)}`);
              continue;
            }

            // Normalizar alternativas para o formato do banco
            const alternativasNormalizadas = this.normalizarAlternativas(q.alternativas);
            if (alternativasNormalizadas.length < 2) {
              this.logger.warn('Questão ignorada (menos de 2 alternativas)');
              continue;
            }

            const questaoFinal = {
              enunciado: q.enunciado.trim(),
              alternativas: alternativasNormalizadas,
              resposta_correta: q.resposta_correta.toUpperCase().trim(),
              tema: q.tema?.trim() || null,
              categoria: categoriaDeTema(q.tema),
              ano_fuvest: anoDetectado,
              explicacao: q.explicacao?.trim() || null,
              classificado: true,
            };

            todasQuestoesExtraidas.push(questaoFinal);

            if (!dryRun) {
              await this.questoesService.criar(questaoFinal as any);
            }
          }
          this.logger.log(`  → ${questoesJson.length} questões extraídas neste chunk.`);
        } else {
          this.logger.warn(`  → IA não retornou array válido.`);
          erros++;
        }
      } catch (e) {
        this.logger.error(`  → Erro no chunk ${i + 1}: ${e.message}`);
        erros++;
      }

      // Rate limiting — esperar 2s entre chunks para não sobrecarregar Ollama
      if (i < chunks.length - 1) {
        await sleep(2000);
      }
    }

    // 7. Salvar resultado em JSON se dry-run
    if (dryRun && todasQuestoesExtraidas.length > 0) {
      const fileName = path.basename(pdfPath).replace('.pdf', '_extraido.json');
      const outputDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, JSON.stringify(todasQuestoesExtraidas, null, 2), 'utf-8');
      this.logger.log(`Dry-run: resultado salvo em ${outputPath}`);
    }

    this.logger.log(`=== Importação concluída: ${todasQuestoesExtraidas.length} questões | ${erros} erros ===`);
    return { questoesTotais: todasQuestoesExtraidas.length, erros };
  }

  /**
   * Importa todos os PDFs de provas de um diretório.
   */
  async importarDiretorio(dirPath: string, dryRun = false) {
    const arquivos = fs.readdirSync(dirPath)
      .filter((f) => f.endsWith('.pdf'))
      .filter((f) => !this.ehGabarito(f)) // Excluir gabaritos
      .sort(); // Ordem alfabética (cronológica)

    this.logger.log(`Encontrados ${arquivos.length} PDFs de provas para importar.`);

    let totalQuestoes = 0;
    let totalErros = 0;

    for (const arquivo of arquivos) {
      const fullPath = path.join(dirPath, arquivo);
      try {
        const result = await this.importarArquivo(fullPath, undefined, dryRun);
        totalQuestoes += result.questoesTotais;
        totalErros += result.erros;
      } catch (e) {
        this.logger.error(`Erro fatal ao importar ${arquivo}: ${e.message}`);
        totalErros++;
      }
    }

    this.logger.log(`\n=== IMPORTAÇÃO COMPLETA ===`);
    this.logger.log(`Total de questões: ${totalQuestoes}`);
    this.logger.log(`Total de erros: ${totalErros}`);
    this.logger.log(`Arquivos processados: ${arquivos.length}`);

    return { totalQuestoes, totalErros, arquivosProcessados: arquivos.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  private montarPrompt(ehSegundaFase: boolean, gabaritoTexto: string | null): string {
    const instrucaoFase = ehSegundaFase
      ? `ATENÇÃO: Esta é uma prova de 2ª FASE (dissertativa). 
         Você DEVE criar 5 alternativas plausíveis (A, B, C, D, E) para cada questão.
         A alternativa correta deve ser baseada na resposta esperada.
         As alternativas incorretas devem ser distratores plausíveis.`
      : `Esta é uma prova de 1ª FASE (múltipla escolha).
         Extraia as alternativas exatamente como aparecem no texto.`;

    return `
Você receberá um trecho de uma prova da FUVEST (vestibular da USP).
Sua tarefa é extrair TODAS as questões presentes neste trecho.

${instrucaoFase}

Regras OBRIGATÓRIAS:
1. Identifique o enunciado completo de cada questão.
2. Liste as 5 alternativas (A, B, C, D, E) no formato: [{"letra": "A", "texto": "..."}, ...].
3. Identifique o tema de forma granular (ex: "Biologia - Genética", "Matemática - Geometria Analítica", "História - Brasil Colonial").
4. Identifique a resposta correta (apenas a letra: A, B, C, D ou E).
5. Forneça uma breve explicação da resposta correta no campo "explicacao".

${gabaritoTexto ? `GABARITO OFICIAL (use para confirmar respostas corretas):\n${gabaritoTexto.substring(0, 2000)}` : 'Gabarito NÃO disponível — deduza a resposta correta.'}

Retorne APENAS um JSON válido (array), sem nenhum texto extra, no formato:
[
  {
    "enunciado": "Texto completo do enunciado...",
    "alternativas": [
      {"letra": "A", "texto": "..."},
      {"letra": "B", "texto": "..."},
      {"letra": "C", "texto": "..."},
      {"letra": "D", "texto": "..."},
      {"letra": "E", "texto": "..."}
    ],
    "resposta_correta": "B",
    "tema": "Biologia - Ecologia",
    "explicacao": "Breve explicação..."
  }
]

Se o trecho não contiver questões identificáveis, retorne um array vazio: []
    `.trim();
  }

  /**
   * Divide o texto em chunks inteligentes — tenta manter questões inteiras.
   * Se o regex não conseguir separar, divide por parágrafos respeitando maxChunkSize.
   */
  private dividirEmChunks(texto: string, maxChunkSize = 3500): string[] {
    // Padrões comuns de início de questão Fuvest (ampliado)
    const padraoQuestao = /(?=(?:Questão\s+\d+|Q\s*\.?\s*\d+|QUESTÃO\s+\d+|\n\s*\d{1,2}\s*[\.\)]\s|\nQ\d{1,2}\b))/gi;

    const partes = texto.split(padraoQuestao).filter((p) => p.trim().length > 50);

    let chunks: string[];

    if (partes.length > 2) {
      // Regex funcionou — agrupar questões em chunks
      chunks = [];
      let chunkAtual = '';

      for (const parte of partes) {
        if (chunkAtual.length + parte.length > maxChunkSize && chunkAtual.length > 0) {
          chunks.push(chunkAtual.trim());
          chunkAtual = '';
        }
        chunkAtual += parte;
      }
      if (chunkAtual.trim().length > 50) {
        chunks.push(chunkAtual.trim());
      }
    } else {
      // Regex não conseguiu separar questões — fallback
      chunks = [];
    }

    // Garantir que NENHUM chunk exceda maxChunkSize (dividir chunks grandes)
    const chunksFinal: string[] = [];
    const source = chunks.length > 0 ? chunks : [texto];

    for (const chunk of source) {
      if (chunk.length <= maxChunkSize) {
        chunksFinal.push(chunk);
      } else {
        // Sub-dividir por parágrafos
        chunksFinal.push(...this.dividirPorTamanho(chunk, maxChunkSize));
      }
    }

    return chunksFinal.filter((c) => c.trim().length > 100);
  }

  private dividirPorTamanho(texto: string, maxSize: number): string[] {
    const chunks: string[] = [];
    // Dividir por quebras de linha para evitar cortar no meio de frases
    const linhas = texto.split(/\n/);
    let chunkAtual = '';

    for (const linha of linhas) {
      if (chunkAtual.length + linha.length + 1 > maxSize && chunkAtual.length > 200) {
        chunks.push(chunkAtual.trim());
        chunkAtual = '';
      }
      chunkAtual += linha + '\n';
    }

    if (chunkAtual.trim().length > 100) {
      chunks.push(chunkAtual.trim());
    }

    return chunks;
  }

  /**
   * Busca o gabarito correspondente ao PDF da prova.
   * Tenta vários padrões de nome de arquivo.
   */
  private async buscarGabarito(pdfPath: string): Promise<string | null> {
    const dir = path.dirname(pdfPath);
    const base = path.basename(pdfPath).toLowerCase();

    // Extrair ano do nome
    const anoMatch = base.match(/(\d{4})/);
    if (!anoMatch) return null;
    const ano = anoMatch[1];

    // Listar todos os arquivos do diretório
    const arquivos = fs.readdirSync(dir);

    // Procurar gabarito que corresponda ao ano
    const gabaritoCandidato = arquivos.find((f) => {
      const fl = f.toLowerCase();
      return fl.includes(ano) && this.ehGabarito(fl);
    });

    if (gabaritoCandidato) {
      try {
        const gabPath = path.join(dir, gabaritoCandidato);
        const gabBuffer = fs.readFileSync(gabPath);
        const gabParser = new PDFParse({ data: gabBuffer });
        const gabResult = await gabParser.getText();
        this.logger.log(`Gabarito encontrado: ${gabaritoCandidato}`);
        await gabParser.destroy();
        return gabResult.text;
      } catch (e) {
        this.logger.warn(`Erro ao ler gabarito: ${e.message}`);
      }
    }

    return null;
  }

  /**
   * Verifica se um nome de arquivo é um gabarito.
   */
  private ehGabarito(fileName: string): boolean {
    const fl = fileName.toLowerCase();
    return fl.includes('gab') || fl.includes('gabarito');
  }

  /**
   * Normaliza alternativas para o formato do banco: [{letra, texto}]
   */
  private normalizarAlternativas(alternativas: any): { letra: string; texto: string }[] {
    if (!Array.isArray(alternativas)) return [];

    const resultado: { letra: string; texto: string }[] = [];

    for (const alt of alternativas) {
      // Se já está no formato {letra, texto}
      if (alt && alt.letra && alt.texto) {
        resultado.push({ letra: alt.letra.toUpperCase().trim(), texto: alt.texto.trim() });
        continue;
      }
      // Se é apenas uma string
      if (typeof alt === 'string') {
        const match = alt.match(/^([A-E])\s*[\.\)\-:]\s*(.+)/i);
        if (match) {
          resultado.push({ letra: match[1].toUpperCase(), texto: match[2].trim() });
        }
      }
    }

    return resultado;
  }

  /**
   * Extrai o ano do nome do arquivo PDF.
   */
  private extrairAnoDoNome(filePath: string): number | null {
    const base = path.basename(filePath);
    const match = base.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }
}
