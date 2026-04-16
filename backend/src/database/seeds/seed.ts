import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Curso } from '../entities/curso.entity';
import { CursoTema } from '../entities/curso-tema.entity';
import { Questao } from '../entities/questao.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'fuvest_db',
  entities: [Curso, CursoTema, Questao],
  synchronize: false,
});

async function seed() {
  await AppDataSource.initialize();

  // Cursos
  const cursos = [
    {
      nome: 'Medicina',
      descricao: 'Foco em Biologia, Quimica e Fisica',
      temas: ['Biologia', 'Quimica', 'Fisica', 'Matematica', 'Portugues']
    },
    {
      nome: 'Engenharia',
      descricao: 'Foco em Matematica, Fisica e Quimica',
      temas: ['Matematica', 'Fisica', 'Quimica', 'Portugues']
    },
    {
      nome: 'Direito',
      descricao: 'Foco em Historia, Geografia e Portugues',
      temas: ['Historia', 'Geografia', 'Portugues', 'Filosofia', 'Sociologia']
    },
    {
      nome: 'Computacao',
      descricao: 'Foco em Matematica e Fisica',
      temas: ['Matematica', 'Fisica', 'Portugues']
    },
    {
      nome: 'Arquitetura',
      descricao: 'Foco em Matematica, Historia da Arte e Fisica',
      temas: ['Matematica', 'Fisica', 'Historia', 'Portugues']
    },
  ];

  for (const c of cursos) {
    const cursoRepo = AppDataSource.getRepository(Curso);
    let curso = await cursoRepo.findOne({ where: { nome: c.nome }});
    if (!curso) {
      curso = await cursoRepo.save({ nome: c.nome, descricao: c.descricao });
    }
    for (const tema of c.temas) {
      const temaRepo = AppDataSource.getRepository(CursoTema);
      const ct = await temaRepo.findOne({ where: { curso_id: curso.id, tema }});
      if (!ct) {
        await temaRepo.save({ curso_id: curso.id, tema });
      }
    }
  }

  // Questões de exemplo
  const questoesExemplo = [
    {
      enunciado: 'Qual é o resultado de 2 + 2?',
      alternativas: [
        { letra: 'A', texto: '3' },
        { letra: 'B', texto: '4' },
        { letra: 'C', texto: '5' },
        { letra: 'D', texto: '6' },
        { letra: 'E', texto: '7' },
      ],
      resposta_correta: 'B',
      tema: 'Matematica',
      categoria: 'Exatas',
      ano_fuvest: 2023,
      classificado: true,
    },
  ];

  const questaoRepo = AppDataSource.getRepository(Questao);
  for (const q of questoesExemplo) {
    const exists = await questaoRepo.findOne({ where: { enunciado: q.enunciado }});
    if (!exists) {
      await questaoRepo.save(q);
    }
  }

  console.log('Seed concluído!');
  await AppDataSource.destroy();
}

seed().catch(console.error);
