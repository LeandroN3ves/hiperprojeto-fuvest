# STEP 04 — Módulo de Questões e Cursos

## Contexto
Passo 4 da Plataforma Fuvest. Auth funcionando (Step 03).
Criar os módulos de Questões e Cursos — base de tudo, sem questões nada funciona.

## Regras críticas
- **Dificuldade é calculada dinamicamente** via taxa de acerto global — nunca campo fixo
- Fórmula: `>= 70% acerto → fácil | >= 40% → médio | < 40% → difícil`
- Questão sem respostas → classificada como `medio` por padrão
- Questão sem tema → `classificado = false`, não aparece em buscas por tema específico

---

## Tarefa 1 — Criar `src/questoes/questoes.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Questao } from '../database/entities/questao.entity';

export type Dificuldade = 'facil' | 'medio' | 'dificil';

@Injectable()
export class QuestoesService {
  constructor(
    @InjectRepository(Questao)
    private questaoRepo: Repository<Questao>,
  ) {}

  /**
   * Busca questões por dificuldade calculada dinamicamente.
   * Dificuldade = taxa de acerto global:
   *   >= 70% → facil | >= 40% → medio | < 40% → dificil
   *
   * @param dificuldade - 'facil' | 'medio' | 'dificil'
   * @param quantidade - número de questões a retornar
   * @param temas - filtrar por temas (opcional)
   * @param categoria - filtrar por categoria (opcional)
   * @param excluirIds - IDs a excluir (já usados na prova)
   */
  async buscarPorDificuldade(
    dificuldade: Dificuldade,
    quantidade: number,
    temas?: string[],
    categoria?: string,
    excluirIds: number[] = [],
  ): Promise<Questao[]> {
    if (quantidade <= 0) return [];

    // Condição de dificuldade baseada na taxa de acerto
    const dificuldadeCondicao = {
      facil: 'taxa_acerto >= 0.7',
      medio: 'taxa_acerto >= 0.4 AND taxa_acerto < 0.7',
      dificil: 'taxa_acerto < 0.4',
    }[dificuldade];

    // Questões sem respostas → tratadas como 'medio'
    const semRespostasCondicao = dificuldade === 'medio'
      ? 'OR total_respostas = 0'
      : '';

    const excluirClause = excluirIds.length > 0
      ? `AND q.id NOT IN (${excluirIds.join(',')})`
      : '';

    const temasClause = temas && temas.length > 0
      ? `AND q.tema IN (${temas.map((_, i) => `$${i + 2}`).join(',')})`
      : '';

    const categoriaClause = categoria ? `AND q.categoria = $${temas ? temas.length + 2 : 2}` : '';

    const query = `
      SELECT q.*, COALESCE(sub.taxa_acerto, 0.5) AS taxa_calculada
      FROM questoes q
      LEFT JOIN (
        SELECT
          questao_id,
          COUNT(*) AS total_respostas,
          ROUND(SUM(CASE WHEN correta THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 4) AS taxa_acerto
        FROM respostas
        GROUP BY questao_id
      ) sub ON sub.questao_id = q.id
      WHERE (${dificuldadeCondicao} ${semRespostasCondicao})
        ${excluirClause}
        ${temasClause}
        ${categoriaClause}
      ORDER BY RANDOM()
      LIMIT $1
    `;

    const params: any[] = [quantidade];
    if (temas && temas.length > 0) params.push(...temas);
    if (categoria) params.push(categoria);

    return this.questaoRepo.query(query, params);
  }

  /**
   * Retorna questões sem restrição de dificuldade.
   * Usado como fallback quando não há questões suficientes de uma dificuldade específica.
   */
  async buscarGenerico(
    quantidade: number,
    temas?: string[],
    categoria?: string,
    excluirIds: number[] = [],
  ): Promise<Questao[]> {
    const qb = this.questaoRepo.createQueryBuilder('q')
      .orderBy('RANDOM()')
      .limit(quantidade);

    if (temas && temas.length > 0) qb.andWhere('q.tema IN (:...temas)', { temas });
    if (categoria) qb.andWhere('q.categoria = :categoria', { categoria });
    if (excluirIds.length > 0) qb.andWhere('q.id NOT IN (:...ids)', { ids: excluirIds });

    return qb.getMany();
  }

  async findById(id: number): Promise<Questao> {
    return this.questaoRepo.findOne({ where: { id } });
  }

  // Admin: criar questão
  async criar(dto: Partial<Questao>): Promise<Questao> {
    return this.questaoRepo.save(dto);
  }

  // Buscar todos os temas distintos disponíveis
  async getTemas(): Promise<string[]> {
    const result = await this.questaoRepo
      .createQueryBuilder('q')
      .select('DISTINCT q.tema', 'tema')
      .where('q.tema IS NOT NULL')
      .getRawMany();
    return result.map((r) => r.tema);
  }

  // Top N temas mais respondidos em uma semana (para prova semanal)
  async getTopTemasSemanais(cursoId: number, semana: string, limite = 10): Promise<string[]> {
    const result = await this.questaoRepo.query(`
      SELECT q.tema, COUNT(r.id) AS total
      FROM respostas r
      JOIN questoes q ON q.id = r.questao_id
      JOIN provas p ON p.id = r.prova_id
      WHERE p.curso_id = $1
        AND DATE_TRUNC('week', r.respondida_em) = $2::date
        AND q.tema IS NOT NULL
      GROUP BY q.tema
      ORDER BY total DESC
      LIMIT $3
    `, [cursoId, semana, limite]);
    return result.map((r: any) => r.tema);
  }
}
```

---

## Tarefa 2 — Criar `src/questoes/questoes.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestoesService } from './questoes.service';
import { Questao } from '../database/entities/questao.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Questao])],
  providers: [QuestoesService],
  exports: [QuestoesService],
})
export class QuestoesModule {}
```

---

## Tarefa 3 — Criar `src/cursos/cursos.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from '../database/entities/curso.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
  ) {}

  findAll(): Promise<Curso[]> {
    return this.cursoRepo.find({ relations: ['temas'] });
  }

  findById(id: number): Promise<Curso> {
    return this.cursoRepo.findOne({ where: { id }, relations: ['temas'] });
  }

  getTemasDoCurso(cursoId: number): Promise<string[]> {
    return this.cursoRepo
      .findOne({ where: { id: cursoId }, relations: ['temas'] })
      .then((c) => c?.temas.map((t) => t.tema) ?? []);
  }
}
```

---

## Tarefa 4 — Criar `src/cursos/cursos.controller.ts`

```typescript
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CursosService } from './cursos.service';

@Controller('cursos')
export class CursosController {
  constructor(private cursosService: CursosService) {}

  @Get()
  findAll() {
    return this.cursosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.findById(id);
  }
}
```

---

## Tarefa 5 — Criar `src/cursos/cursos.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CursosController } from './cursos.controller';
import { CursosService } from './cursos.service';
import { Curso } from '../database/entities/curso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Curso])],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
```

---

## Tarefa 6 — Adicionar módulos no AppModule

```typescript
import { QuestoesModule } from './questoes/questoes.module';
import { CursosModule } from './cursos/cursos.module';

@Module({
  imports: [
    // ... anteriores ...
    QuestoesModule,
    CursosModule,
  ],
})
export class AppModule {}
```

---

## Endpoints gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| GET | `/api/cursos` | Pública | Lista todos os cursos com temas |
| GET | `/api/cursos/:id` | Pública | Detalhe de um curso |

---

## Teste manual (curl)

```bash
# Listar cursos (deve retornar os 5 cursos do seed)
curl http://localhost:3000/api/cursos

# Detalhe de um curso
curl http://localhost:3000/api/cursos/1
```

---

## Resultado esperado ao final deste passo
- [ ] `GET /api/cursos` retorna lista de cursos com `temas` populados
- [ ] `QuestoesService.buscarPorDificuldade()` funciona com e sem respostas no banco
- [ ] `QuestoesService.buscarGenerico()` funciona como fallback
- [ ] `QuestoesModule` exporta `QuestoesService` para uso em `ProvasModule`
- [ ] `CursosModule` exporta `CursosService` para uso em `ProvasModule` e `IaModule`

## Próximo passo
`STEP_05_PROVAS.md` — Módulo de Provas (geração, execução, finalização)
