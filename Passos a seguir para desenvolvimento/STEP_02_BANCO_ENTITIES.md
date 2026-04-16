# STEP 02 — Banco de Dados: Entidades TypeORM e Migrations

## Contexto
Passo 2 da Plataforma Fuvest. O ambiente Docker já está rodando (postgres na porta 5432).
Agora você vai criar todas as entidades TypeORM, configurar o AppModule para conectar ao banco e gerar as migrations.

## Regras importantes do banco
- Banco: PostgreSQL 16
- ORM: TypeORM com decorators
- Dificuldade das questões é **calculada dinamicamente** — NÃO existe campo `dificuldade` fixo
- Alternativas das questões são armazenadas como `JSONB`
- IDs de usuários e provas são `UUID` (gen_random_uuid())
- IDs de questões, cursos e estatísticas são `SERIAL` (auto-increment)

---

## Tarefa 1 — Criar `src/database/entities/curso.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { CursoTema } from './curso-tema.entity';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nome: string;

  @Column({ nullable: true, type: 'text' })
  descricao: string;

  @OneToMany(() => CursoTema, (ct) => ct.curso, { eager: true })
  temas: CursoTema[];
}
```

---

## Tarefa 2 — Criar `src/database/entities/curso-tema.entity.ts`

```typescript
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity';

@Entity('cursos_temas')
export class CursoTema {
  @PrimaryColumn()
  curso_id: number;

  @PrimaryColumn({ length: 150 })
  tema: string;

  @ManyToOne(() => Curso, (curso) => curso.temas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;
}
```

---

## Tarefa 3 — Criar `src/database/entities/usuario.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 255, select: false })
  senha: string; // nullable para usuários OAuth

  @Column({ default: 'local', length: 20 })
  provider: string; // 'local' | 'google'

  @Column({ nullable: true })
  curso_id: number;

  @ManyToOne(() => Curso, { nullable: true, eager: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## Tarefa 4 — Criar `src/database/entities/questao.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questoes')
export class Questao {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  enunciado: string;

  // Estrutura: [{ "letra": "A", "texto": "..." }, ...]
  @Column({ type: 'jsonb' })
  alternativas: { letra: string; texto: string }[];

  @Column({ length: 1 })
  resposta_correta: string; // 'A' | 'B' | 'C' | 'D' | 'E'

  @Column({ nullable: true, length: 150 })
  tema: string;

  @Column({ nullable: true, length: 50 })
  categoria: string; // 'Exatas' | 'Humanas' | 'Biologicas'

  @Column({ nullable: true })
  ano_fuvest: number;

  @Column({ default: false })
  classificado: boolean;
}
```

---

## Tarefa 5 — Criar `src/database/entities/prova.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Curso } from './curso.entity';

export interface ConfiguracaoProva {
  qtd_questoes: number;
  temas?: string[];
  categoria?: string;
  distribuicao: { facil: number; medio: number; dificil: number };
  questoes_ids: number[]; // IDs na ordem de apresentação
}

@Entity('provas')
export class Prova {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 10, default: 'normal' })
  tipo: string; // 'normal' | 'semanal'

  @Column({ nullable: true })
  curso_id: number;

  @ManyToOne(() => Curso, { nullable: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ type: 'jsonb', nullable: true })
  configuracao: ConfiguracaoProva;

  @Column({ default: false })
  finalizada: boolean;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## Tarefa 6 — Criar `src/database/entities/resposta.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Questao } from './questao.entity';
import { Prova } from './prova.entity';

@Entity('respostas')
export class Resposta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  questao_id: number;

  @ManyToOne(() => Questao)
  @JoinColumn({ name: 'questao_id' })
  questao: Questao;

  @Column()
  prova_id: string;

  @ManyToOne(() => Prova, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prova_id' })
  prova: Prova;

  @Column({ length: 1 })
  resposta: string;

  @Column()
  correta: boolean;

  @CreateDateColumn()
  respondida_em: Date;
}
```

---

## Tarefa 7 — Criar `src/database/entities/estatistica.entity.ts`

```typescript
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('estatisticas')
export class Estatistica {
  @PrimaryColumn()
  usuario_id: string;

  @PrimaryColumn({ length: 150 })
  tema: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ default: 0 })
  acertos: number;

  @Column({ default: 0 })
  erros: number;
}
```

---

## Tarefa 8 — Criar `src/database/entities/leaderboard-semanal.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Curso } from './curso.entity';
import { Prova } from './prova.entity';

@Entity('leaderboard_semanal')
@Unique(['usuario_id', 'curso_id', 'semana'])
export class LeaderboardSemanal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  curso_id: number;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ type: 'date' })
  semana: string; // 'YYYY-MM-DD' — sempre segunda-feira da semana

  @Column({ default: 0 })
  acertos: number;

  @Column({ nullable: true })
  prova_id: string;

  @ManyToOne(() => Prova, { nullable: true })
  @JoinColumn({ name: 'prova_id' })
  prova: Prova;
}
```

---

## Tarefa 9 — Criar `src/app.module.ts` com TypeORM configurado

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';

// Entidades
import { Curso } from './database/entities/curso.entity';
import { CursoTema } from './database/entities/curso-tema.entity';
import { Usuario } from './database/entities/usuario.entity';
import { Questao } from './database/entities/questao.entity';
import { Prova } from './database/entities/prova.entity';
import { Resposta } from './database/entities/resposta.entity';
import { Estatistica } from './database/entities/estatistica.entity';
import { LeaderboardSemanal } from './database/entities/leaderboard-semanal.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [Curso, CursoTema, Usuario, Questao, Prova, Resposta, Estatistica, LeaderboardSemanal],
        synchronize: process.env.NODE_ENV !== 'production', // NUNCA true em produção
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Tarefa 10 — Criar seed de dados iniciais

Criar `src/database/seeds/seed.ts`:

```typescript
import { DataSource } from 'typeorm';
import { Curso } from '../entities/curso.entity';
import { CursoTema } from '../entities/curso-tema.entity';
import { Questao } from '../entities/questao.entity';

const AppDataSource = new DataSource({ /* mesma config do AppModule */ });

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
    const curso = await AppDataSource.getRepository(Curso).save({ nome: c.nome, descricao: c.descricao });
    for (const tema of c.temas) {
      await AppDataSource.getRepository(CursoTema).save({ curso_id: curso.id, tema });
    }
  }

  // Questões de exemplo (mínimo para testar)
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
    // Adicionar mais questões reais aqui
  ];

  await AppDataSource.getRepository(Questao).save(questoesExemplo);

  console.log('Seed concluído!');
  await AppDataSource.destroy();
}

seed().catch(console.error);
```

---

## Índices SQL — Rodar manualmente no postgres se necessário

```sql
CREATE INDEX IF NOT EXISTS idx_leaderboard_semanal_curso_semana
  ON leaderboard_semanal(curso_id, semana, acertos DESC);

CREATE INDEX IF NOT EXISTS idx_estatisticas_usuario
  ON estatisticas(usuario_id, erros DESC);

CREATE INDEX IF NOT EXISTS idx_questoes_tema_categoria
  ON questoes(tema, categoria);

CREATE INDEX IF NOT EXISTS idx_respostas_usuario_prova
  ON respostas(usuario_id, prova_id);
```

---

## Resultado esperado ao final deste passo
- [ ] 8 entidades TypeORM criadas e exportadas corretamente
- [ ] `AppModule` conecta ao PostgreSQL sem erro
- [ ] `synchronize: true` cria todas as tabelas automaticamente no primeiro boot
- [ ] Seed popula 5 cursos e questões de exemplo
- [ ] `npm run start:dev` sobe sem erros de conexão

## Próximo passo
`STEP_03_AUTH.md` — Módulo de autenticação (JWT + Google OAuth)
