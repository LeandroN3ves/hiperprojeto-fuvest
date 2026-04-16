# STEP 06 — Módulo de Estatísticas e Análise de Desempenho

## Contexto
Passo 6 da Plataforma Fuvest. Provas funcionando (Step 05).
Criar o módulo de estatísticas: dashboard de desempenho, análise por tema, fraquezas e stats diárias.

## Regras de negócio
- Fraqueza = tema com maior taxa de erro `erros / (acertos + erros)`
- Sugestão automática: gerar config de prova focada nos temas mais fracos
- Stats diárias: rastreiam aparições e acertos de questões no dia atual
- Todas as rotas exigem JWT

---

## Tarefa 1 — Criar `src/estatisticas/estatisticas.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estatistica } from '../database/entities/estatistica.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Prova } from '../database/entities/prova.entity';

@Injectable()
export class EstatisticasService {
  constructor(
    @InjectRepository(Estatistica) private estatisticaRepo: Repository<Estatistica>,
    @InjectRepository(Resposta) private respostaRepo: Repository<Resposta>,
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD COMPLETO
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboard(usuarioId: string) {
    const [porTema, statsHoje, totalProvas] = await Promise.all([
      this.getStatsPorTema(usuarioId),
      this.getStatsHoje(usuarioId),
      this.provaRepo.count({ where: { usuario_id: usuarioId, finalizada: true } }),
    ]);

    const totalQuestoes = porTema.reduce((acc, t) => acc + t.acertos + t.erros, 0);
    const totalAcertos = porTema.reduce((acc, t) => acc + t.acertos, 0);
    const mediaAcertos = totalQuestoes > 0
      ? Math.round((totalAcertos / totalQuestoes) * 100 * 10) / 10
      : 0;

    const temaMaisFraco = porTema.length > 0
      ? porTema.sort((a, b) => b.taxa_erro - a.taxa_erro)[0].tema
      : null;

    return {
      total_provas: totalProvas,
      total_questoes_respondidas: totalQuestoes,
      media_acertos: mediaAcertos,
      por_tema: porTema,
      tema_mais_fraco: temaMaisFraco,
      hoje: statsHoje,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATS POR TEMA
  // ─────────────────────────────────────────────────────────────────────────

  async getStatsPorTema(usuarioId: string) {
    const stats = await this.estatisticaRepo.find({ where: { usuario_id: usuarioId } });

    return stats.map((s) => {
      const total = s.acertos + s.erros;
      const taxa_acerto = total > 0 ? Math.round((s.acertos / total) * 100 * 10) / 10 : 0;
      const taxa_erro = total > 0 ? Math.round((s.erros / total) * 100 * 10) / 10 : 0;
      return { tema: s.tema, acertos: s.acertos, erros: s.erros, taxa_acerto, taxa_erro };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FRAQUEZAS E SUGESTÃO DE PROVA
  // ─────────────────────────────────────────────────────────────────────────

  async getFraquezas(usuarioId: string, limite = 3) {
    const porTema = await this.getStatsPorTema(usuarioId);

    // Só considerar temas com pelo menos 3 tentativas (dados suficientes)
    const temasComDados = porTema.filter((t) => t.acertos + t.erros >= 3);

    const piores = temasComDados
      .sort((a, b) => b.taxa_erro - a.taxa_erro)
      .slice(0, limite);

    const sugestaoProva =
      piores.length > 0
        ? {
            qtd_questoes: 10,
            temas: piores.map((t) => t.tema),
            distribuicao: { facil: 20, medio: 40, dificil: 40 },
          }
        : null;

    return { temas_fracos: piores, sugestao_prova: sugestaoProva };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATS DIÁRIAS
  // ─────────────────────────────────────────────────────────────────────────

  async getStatsHoje(usuarioId: string) {
    const hoje = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const [provasHoje, questoesHoje] = await Promise.all([
      this.provaRepo
        .createQueryBuilder('p')
        .where('p.usuario_id = :uid', { uid: usuarioId })
        .andWhere('DATE(p.created_at) = :hoje', { hoje })
        .andWhere('p.finalizada = true')
        .getCount(),

      this.respostaRepo
        .createQueryBuilder('r')
        .where('r.usuario_id = :uid', { uid: usuarioId })
        .andWhere('DATE(r.respondida_em) = :hoje', { hoje })
        .getCount(),
    ]);

    return { provas_realizadas: provasHoje, questoes_respondidas: questoesHoje };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RASTREAMENTO DE QUESTÃO NO DIA
  // ─────────────────────────────────────────────────────────────────────────

  async getQuestaoStatsDiaria(usuarioId: string, questaoId: number) {
    const hoje = new Date().toISOString().split('T')[0];

    const result = await this.respostaRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'aparicoes')
      .addSelect('SUM(CASE WHEN r.correta THEN 1 ELSE 0 END)', 'acertos')
      .where('r.usuario_id = :uid', { uid: usuarioId })
      .andWhere('r.questao_id = :qid', { qid: questaoId })
      .andWhere('DATE(r.respondida_em) = :hoje', { hoje })
      .getRawOne();

    const aparicoes = parseInt(result.aparicoes) || 0;
    const acertos = parseInt(result.acertos) || 0;

    return {
      questao_id: questaoId,
      aparicoes_hoje: aparicoes,
      acertos_hoje: acertos,
      mensagem: aparicoes > 0
        ? `A questão ${questaoId} apareceu ${aparicoes} vezes e você acertou ${acertos}/${aparicoes}`
        : `A questão ${questaoId} não foi respondida hoje`,
    };
  }
}
```

---

## Tarefa 2 — Criar `src/estatisticas/estatisticas.controller.ts`

```typescript
import { Controller, Get, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Usuario } from '../database/entities/usuario.entity';
import { EstatisticasService } from './estatisticas.service';

@Controller('estatisticas')
@UseGuards(JwtAuthGuard)
export class EstatisticasController {
  constructor(private estatisticasService: EstatisticasService) {}

  // Dashboard completo
  @Get()
  getDashboard(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getDashboard(usuario.id);
  }

  // Apenas stats por tema
  @Get('temas')
  getTemas(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getStatsPorTema(usuario.id);
  }

  // Fraquezas + sugestão de prova
  @Get('fraquezas')
  getFraquezas(@GetUser() usuario: Usuario, @Query('limite') limite?: number) {
    return this.estatisticasService.getFraquezas(usuario.id, limite ?? 3);
  }

  // Stats de hoje
  @Get('hoje')
  getHoje(@GetUser() usuario: Usuario) {
    return this.estatisticasService.getStatsHoje(usuario.id);
  }

  // Rastreamento diário de questão específica
  @Get('questao-diaria/:questaoId')
  getQuestaoStats(
    @Param('questaoId', ParseIntPipe) questaoId: number,
    @GetUser() usuario: Usuario,
  ) {
    return this.estatisticasService.getQuestaoStatsDiaria(usuario.id, questaoId);
  }
}
```

---

## Tarefa 3 — Criar `src/estatisticas/estatisticas.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstatisticasController } from './estatisticas.controller';
import { EstatisticasService } from './estatisticas.service';
import { Estatistica } from '../database/entities/estatistica.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Prova } from '../database/entities/prova.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estatistica, Resposta, Prova])],
  controllers: [EstatisticasController],
  providers: [EstatisticasService],
  exports: [EstatisticasService],
})
export class EstatisticasModule {}
```

---

## Tarefa 4 — Adicionar EstatisticasModule no AppModule

```typescript
import { EstatisticasModule } from './estatisticas/estatisticas.module';

@Module({ imports: [..., EstatisticasModule] })
export class AppModule {}
```

---

## Endpoints gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| GET | `/api/estatisticas` | JWT | Dashboard completo |
| GET | `/api/estatisticas/temas` | JWT | Stats por tema |
| GET | `/api/estatisticas/fraquezas` | JWT | Temas fracos + sugestão |
| GET | `/api/estatisticas/hoje` | JWT | Stats do dia |
| GET | `/api/estatisticas/questao-diaria/:id` | JWT | Rastreamento de questão no dia |

---

## Exemplo de resposta `GET /api/estatisticas`

```json
{
  "total_provas": 12,
  "total_questoes_respondidas": 240,
  "media_acertos": 68.5,
  "por_tema": [
    { "tema": "Matematica", "acertos": 45, "erros": 15, "taxa_acerto": 75.0, "taxa_erro": 25.0 },
    { "tema": "Historia", "acertos": 10, "erros": 30, "taxa_acerto": 25.0, "taxa_erro": 75.0 }
  ],
  "tema_mais_fraco": "Historia",
  "hoje": {
    "provas_realizadas": 2,
    "questoes_respondidas": 40
  }
}
```

## Exemplo de resposta `GET /api/estatisticas/fraquezas`

```json
{
  "temas_fracos": [
    { "tema": "Historia", "acertos": 10, "erros": 30, "taxa_erro": 75.0 }
  ],
  "sugestao_prova": {
    "qtd_questoes": 10,
    "temas": ["Historia"],
    "distribuicao": { "facil": 20, "medio": 40, "dificil": 40 }
  }
}
```

---

## Resultado esperado ao final deste passo
- [ ] `GET /api/estatisticas` retorna dashboard completo
- [ ] `tema_mais_fraco` é calculado corretamente com base na taxa de erro
- [ ] `sugestao_prova` em `/fraquezas` pode ser passado diretamente para `POST /provas/gerar`
- [ ] Stats diárias rastreiam apenas questões do dia atual
- [ ] Questão respondida múltiplas vezes no dia aparece corretamente no rastreamento

## Próximo passo
`STEP_07_LEADERBOARD.md` — Módulo de Leaderboard com WebSocket em tempo real
