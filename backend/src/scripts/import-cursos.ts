import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Curso } from '../database/entities/curso.entity';
import { CursoTema } from '../database/entities/curso-tema.entity';
import * as fs from 'fs';
import * as path from 'path';

// Configuração do banco
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'fuvest_db',
  entities: [Curso, CursoTema],
  synchronize: false,
});

const JSON_PATH = path.resolve(__dirname, '..', '..', '..', 'cursos_fuvest.json');

interface CursoJson {
  nome: string;
  descricao: string;
  temas: string[];
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    IMPORTADOR DE CURSOS FUVEST — JSON → PostgreSQL       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${JSON_PATH}`);
    process.exit(1);
  }

  // Conectar ao banco
  console.log('🔌 Conectando ao PostgreSQL...');
  await AppDataSource.initialize();
  console.log('✅ Conectado!\n');

  const cursoRepo = AppDataSource.getRepository(Curso);
  const cursoTemaRepo = AppDataSource.getRepository(CursoTema);

  let cursosJson: CursoJson[];
  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    cursosJson = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Erro ao ler/parsear ${JSON_PATH}: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`📄 Arquivo lido: ${cursosJson.length} cursos encontrados.`);
  console.log('─────────────────────────────────────────────────────────');

  let importados = 0;
  let ignorados = 0;
  let temasAdicionados = 0;

  for (const item of cursosJson) {
    if (!item.nome || item.nome.trim() === '') {
      console.warn(`⚠️ Curso ignorado: Nome vazio ou ausente.`);
      ignorados++;
      continue;
    }

    if (!Array.isArray(item.temas)) {
      console.warn(`⚠️ Curso ${item.nome} ignorado: 'temas' não é array.`);
      ignorados++;
      continue;
    }

    const nome = item.nome.trim();
    const descricao = item.descricao ? item.descricao.trim() : '';

    // Verifica se existe
    const existe = await cursoRepo.findOneBy({ nome });
    if (existe) {
      console.log(`⏭️  Ignorado (já existe): ${nome}`);
      ignorados++;
      continue;
    }

    // Salvar o curso
    try {
      const novoCurso = cursoRepo.create({ nome, descricao });
      const cursoSalvo = await cursoRepo.save(novoCurso);

      // Salvar os temas associados
      const temasParaSalvar = item.temas
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Usamos map para criar um array de promessas
      const promessasTemas = temasParaSalvar.map(async tema => {
        const ct = cursoTemaRepo.create({ curso_id: cursoSalvo.id, tema });
        await cursoTemaRepo.save(ct);
        temasAdicionados++;
      });
      await Promise.all(promessasTemas);

      console.log(`✅ Importado: ${nome} com ${temasParaSalvar.length} temas`);
      importados++;
    } catch (err) {
      console.error(`❌ Erro ao inserir curso '${nome}': ${(err as Error).message}`);
    }
  }

  console.log('─────────────────────────────────────────────────────────');
  console.log();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADO FINAL                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Cursos importados:     ${String(importados).padStart(6)}                           ║`);
  console.log(`║  Cursos ignorados:      ${String(ignorados).padStart(6)}                           ║`);
  console.log(`║  Temas vinculados:      ${String(temasAdicionados).padStart(6)}                           ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
