import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Questao } from '../database/entities/questao.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Configuração do banco (mesmo padrão do seed.ts)
// ─────────────────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'fuvest_db',
  entities: [Questao],
  synchronize: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Diretório dos JSONs
// ─────────────────────────────────────────────────────────────────────────────
const JSON_DIR = path.resolve(
  __dirname,
  '..', '..', '..', 'ProvasFuvestJson',
);

// ─────────────────────────────────────────────────────────────────────────────
// Categorias válidas
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIAS_VALIDAS = ['Exatas', 'Humanas', 'Biologicas'];
const RESPOSTAS_VALIDAS = ['A', 'B', 'C', 'D', 'E'];

// ─────────────────────────────────────────────────────────────────────────────
// Limpar artefatos de extração PDF
// ─────────────────────────────────────────────────────────────────────────────
function limparTexto(texto: string): string {
  if (!texto || typeof texto !== 'string') return texto;

  return texto
    // Substituir ¬ por espaço
    .replace(/¬/g, ' ')
    // Remover padrões ##### e variações
    .replace(/#####\s*/g, '')
    // Colapsar múltiplos espaços em um
    .replace(/ {2,}/g, ' ')
    // Remover espaços no início/fim
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Gerar hash curto do enunciado para detecção de duplicatas
// ─────────────────────────────────────────────────────────────────────────────
function hashEnunciado(enunciado: string, ano: number): string {
  const base = `${ano}::${enunciado.substring(0, 200).toLowerCase()}`;
  return crypto.createHash('md5').update(base).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Validar uma questão
// ─────────────────────────────────────────────────────────────────────────────
interface QuestaoJson {
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  tema?: string;
  categoria?: string;
  ano_fuvest?: number;
  explicacao?: string | null;
}

function validarQuestao(q: QuestaoJson, index: number): string | null {
  if (!q.enunciado || q.enunciado.trim().length === 0) {
    return `Questão ${index + 1}: enunciado vazio`;
  }
  if (!Array.isArray(q.alternativas) || q.alternativas.length < 2) {
    return `Questão ${index + 1}: alternativas inválidas (precisa ≥ 2)`;
  }
  if (!q.resposta_correta || !RESPOSTAS_VALIDAS.includes(q.resposta_correta.toUpperCase())) {
    return `Questão ${index + 1}: resposta_correta inválida ("${q.resposta_correta}")`;
  }
  return null; // válida
}

// ─────────────────────────────────────────────────────────────────────────────
// Processar um arquivo JSON
// ─────────────────────────────────────────────────────────────────────────────
async function processarArquivo(
  filePath: string,
  questaoRepo: any,
  hashesExistentes: Set<string>,
): Promise<{ importadas: number; ignoradas: number; erros: number }> {
  const fileName = path.basename(filePath);
  const stats = { importadas: 0, ignoradas: 0, erros: 0 };

  let questoes: QuestaoJson[];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    questoes = JSON.parse(raw);
  } catch (err) {
    console.error(`  ❌ Erro ao ler/parsear ${fileName}: ${(err as Error).message}`);
    stats.erros = 1;
    return stats;
  }

  if (!Array.isArray(questoes)) {
    console.error(`  ❌ ${fileName}: conteúdo não é um array`);
    stats.erros = 1;
    return stats;
  }

  console.log(`  📄 ${fileName}: ${questoes.length} questões encontradas`);

  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i];

    // Validar
    const erro = validarQuestao(q, i);
    if (erro) {
      console.warn(`    ⚠️  ${erro}`);
      stats.ignoradas++;
      continue;
    }

    // Limpar textos
    const enunciadoLimpo = limparTexto(q.enunciado);
    const alternativasLimpas = q.alternativas.map((alt) => ({
      letra: alt.letra.toUpperCase(),
      texto: limparTexto(alt.texto),
    }));

    // Normalizar categoria
    let categoria = q.categoria || 'Exatas';
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      categoria = 'Exatas';
    }

    const anoFuvest = q.ano_fuvest || 0;

    // Verificar duplicata
    const hash = hashEnunciado(enunciadoLimpo, anoFuvest);
    if (hashesExistentes.has(hash)) {
      stats.ignoradas++;
      continue;
    }

    // Inserir
    try {
      await questaoRepo.save({
        enunciado: enunciadoLimpo,
        alternativas: alternativasLimpas,
        resposta_correta: q.resposta_correta.toUpperCase(),
        tema: q.tema ? limparTexto(q.tema) : null,
        categoria,
        ano_fuvest: anoFuvest,
        explicacao: q.explicacao ? limparTexto(q.explicacao) : null,
        classificado: true,
      });

      hashesExistentes.add(hash);
      stats.importadas++;
    } catch (err) {
      console.error(`    ❌ Erro ao inserir questão ${i + 1}: ${(err as Error).message}`);
      stats.erros++;
    }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   IMPORTADOR DE QUESTÕES FUVEST — JSON → PostgreSQL    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  // Verificar pasta
  if (!fs.existsSync(JSON_DIR)) {
    console.error(`❌ Pasta não encontrada: ${JSON_DIR}`);
    process.exit(1);
  }

  // Listar JSONs
  const jsonFiles = fs.readdirSync(JSON_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    console.error('❌ Nenhum arquivo .json encontrado na pasta');
    process.exit(1);
  }

  console.log(`📂 Pasta: ${JSON_DIR}`);
  console.log(`📁 Arquivos encontrados: ${jsonFiles.length}`);
  console.log();

  // Conectar ao banco
  console.log('🔌 Conectando ao PostgreSQL...');
  await AppDataSource.initialize();
  console.log('✅ Conectado!\n');

  const questaoRepo = AppDataSource.getRepository(Questao);

  // Carregar hashes existentes para evitar duplicatas
  const existentes = await questaoRepo.find({ select: ['enunciado', 'ano_fuvest'] });
  const hashesExistentes = new Set<string>();
  for (const e of existentes) {
    hashesExistentes.add(hashEnunciado(e.enunciado, e.ano_fuvest || 0));
  }
  console.log(`📊 Questões já existentes no banco: ${existentes.length}\n`);

  // Processar cada arquivo
  let totalImportadas = 0;
  let totalIgnoradas = 0;
  let totalErros = 0;

  console.log('─────────────────────────────────────────────────────────');

  for (const fileName of jsonFiles) {
    const filePath = path.join(JSON_DIR, fileName);
    const stats = await processarArquivo(filePath, questaoRepo, hashesExistentes);

    console.log(`  ✅ Importadas: ${stats.importadas} | ⏭️  Ignoradas: ${stats.ignoradas} | ❌ Erros: ${stats.erros}`);
    console.log('─────────────────────────────────────────────────────────');

    totalImportadas += stats.importadas;
    totalIgnoradas += stats.ignoradas;
    totalErros += stats.erros;
  }

  // Contagem final no banco
  const totalFinal = await questaoRepo.count();

  console.log();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADO FINAL                      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Arquivos processados:  ${String(jsonFiles.length).padStart(6)}                        ║`);
  console.log(`║  Questões importadas:   ${String(totalImportadas).padStart(6)}                        ║`);
  console.log(`║  Questões ignoradas:    ${String(totalIgnoradas).padStart(6)}                        ║`);
  console.log(`║  Erros:                 ${String(totalErros).padStart(6)}                        ║`);
  console.log(`║  Total no banco agora:  ${String(totalFinal).padStart(6)}                        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
