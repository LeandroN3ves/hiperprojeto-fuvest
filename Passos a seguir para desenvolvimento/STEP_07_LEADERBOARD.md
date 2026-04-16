# STEP 07 — Leaderboard em Tempo Real (REST + WebSocket)

## Contexto
Passo 7 da Plataforma Fuvest. Estatísticas prontas (Step 06).
Criar o leaderboard com atualização em tempo real via Socket.IO.

## Regras de negócio
- **Leaderboard global:** Top 10 por frequência (total de provas finalizadas)
- **Leaderboard por curso:** Top 10 por acertos na prova semanal da semana atual
- Curso aparece no ranking somente se houver participante na semana corrente
- Pontuação = apenas acertos (tempo NÃO influencia)
- Atualização em tempo real: emitir evento ao finalizar prova semanal
- Clientes se inscrevem em salas por curso: `leaderboard:{cursoId}`

---

## Tarefa 1 — Criar `src/leaderboard/leaderboard.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { Prova } from '../database/entities/prova.entity';

function getInicioSemanaAtual(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(new Date(hoje).setDate(diff));
  return seg.toISOString().split('T')[0];
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardSemanal) private leaderboardRepo: Repository<LeaderboardSemanal>,
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GLOBAL: top 10 por frequência de uso (total de provas finalizadas)
  // ─────────────────────────────────────────────────────────────────────────

  async getRankingGlobal() {
    const result = await this.provaRepo.query(`
      SELECT
        u.id,
        u.nome,
        COUNT(p.id) AS total_provas,
        ROUND(AVG(
          (SELECT COUNT(*) FROM respostas r WHERE r.prova_id = p.id AND r.correta = true)::NUMERIC /
          NULLIF((SELECT COUNT(*) FROM respostas r2 WHERE r2.prova_id = p.id), 0) * 100
        ), 1) AS media_acertos
      FROM provas p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.finalizada = true
      GROUP BY u.id, u.nome
      ORDER BY total_provas DESC
      LIMIT 10
    `);

    return {
      tipo: 'global',
      ranking: result.map((r: any, i: number) => ({
        posicao: i + 1,
        nome: r.nome,
        total_provas: parseInt(r.total_provas),
        media_acertos: parseFloat(r.media_acertos) || 0,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POR CURSO: top 10 por acertos na prova semanal
  // ─────────────────────────────────────────────────────────────────────────

  async getRankingCurso(cursoId: number, semana?: string) {
    const semanaAlvo = semana ?? getInicioSemanaAtual();

    const result = await this.leaderboardRepo.query(`
      SELECT
        u.nome,
        ls.acertos,
        ls.usuario_id
      FROM leaderboard_semanal ls
      JOIN usuarios u ON u.id = ls.usuario_id
      WHERE ls.curso_id = $1
        AND ls.semana = $2
      ORDER BY ls.acertos DESC
      LIMIT 10
    `, [cursoId, semanaAlvo]);

    return {
      curso_id: cursoId,
      semana: semanaAlvo,
      ranking: result.map((r: any, i: number) => ({
        posicao: i + 1,
        nome: r.nome,
        acertos: parseInt(r.acertos),
      })),
    };
  }

  // Listar cursos com participação ativa na semana atual
  async getCursosAtivos(): Promise<number[]> {
    const semana = getInicioSemanaAtual();
    const result = await this.leaderboardRepo.query(`
      SELECT DISTINCT curso_id FROM leaderboard_semanal WHERE semana = $1
    `, [semana]);
    return result.map((r: any) => r.curso_id);
  }
}
```

---

## Tarefa 2 — Criar `src/leaderboard/leaderboard.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200' },
  namespace: '/leaderboard',
})
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private leaderboardService: LeaderboardService) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Cliente se inscreve no ranking de um curso
  @SubscribeMessage('subscribe:leaderboard')
  async handleSubscribe(
    @MessageBody() payload: { curso_id: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `leaderboard:${payload.curso_id}`;
    client.join(room);

    // Envia o ranking atual imediatamente ao se inscrever
    const ranking = await this.leaderboardService.getRankingCurso(payload.curso_id);
    client.emit(`leaderboard:update:${payload.curso_id}`, ranking);
  }

  // Chamado pelo ProvasService ao finalizar prova semanal
  async emitirAtualizacao(cursoId: number) {
    const ranking = await this.leaderboardService.getRankingCurso(cursoId);
    this.server.to(`leaderboard:${cursoId}`).emit(`leaderboard:update:${cursoId}`, ranking);
  }
}
```

---

## Tarefa 3 — Criar `src/leaderboard/leaderboard.controller.ts`

```typescript
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  // Ranking global (público — exibir na landing page)
  @Get('global')
  getGlobal() {
    return this.leaderboardService.getRankingGlobal();
  }

  // Cursos com participação ativa na semana
  @Get('cursos-ativos')
  getCursosAtivos() {
    return this.leaderboardService.getCursosAtivos();
  }

  // Ranking de um curso específico na semana
  @Get('curso/:cursoId')
  getCurso(
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Query('semana') semana?: string,
  ) {
    return this.leaderboardService.getRankingCurso(cursoId, semana);
  }
}
```

---

## Tarefa 4 — Criar `src/leaderboard/leaderboard.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardGateway } from './leaderboard.gateway';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { Prova } from '../database/entities/prova.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaderboardSemanal, Prova])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardGateway],
  exports: [LeaderboardGateway],   // exportar para uso no ProvasModule
})
export class LeaderboardModule {}
```

---

## Tarefa 5 — Integrar LeaderboardGateway no ProvasService

No `provas.service.ts`, injetar o gateway e chamar `emitirAtualizacao` ao finalizar prova semanal:

```typescript
// provas.service.ts — adicionar injeção
constructor(
  // ... repositórios anteriores ...
  private leaderboardGateway: LeaderboardGateway,
) {}

// Em finalizarProva(), após atualizarLeaderboardSemanal():
if (prova.tipo === 'semanal' && prova.curso_id) {
  await this.atualizarLeaderboardSemanal(usuarioId, prova.curso_id, acertos, provaId);
  await this.leaderboardGateway.emitirAtualizacao(prova.curso_id); // ← linha nova
}
```

Atualizar `ProvasModule` para importar `LeaderboardModule`:
```typescript
imports: [
  // anteriores...
  LeaderboardModule,
]
```

---

## Tarefa 6 — Adicionar LeaderboardModule no AppModule

```typescript
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({ imports: [..., LeaderboardModule] })
export class AppModule {}
```

---

## Fluxo WebSocket completo

```
[FRONTEND] conecta em: ws://localhost:3000/leaderboard
[FRONTEND] emite: subscribe:leaderboard { curso_id: 1 }
[BACKEND]  entra na sala: leaderboard:1
[BACKEND]  emite de volta: leaderboard:update:1 { ranking: [...] }  ← ranking atual

[OUTRO USUÁRIO] finaliza prova semanal do curso 1
[BACKEND] ProvasService → LeaderboardGateway.emitirAtualizacao(1)
[BACKEND] emite para todos na sala leaderboard:1: leaderboard:update:1 { ranking: [...] }
[FRONTEND] recebe e atualiza UI em tempo real
```

---

## Endpoints REST gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| GET | `/api/leaderboard/global` | Pública | Top 10 por frequência |
| GET | `/api/leaderboard/cursos-ativos` | Pública | Cursos com participantes na semana |
| GET | `/api/leaderboard/curso/:id` | Pública | Top 10 por curso na semana |

## Eventos WebSocket (namespace `/leaderboard`)

| Evento (client → server) | Payload | Descrição |
|---|---|---|
| `subscribe:leaderboard` | `{ curso_id: number }` | Inscrever em ranking de curso |

| Evento (server → client) | Payload | Descrição |
|---|---|---|
| `leaderboard:update:{cursoId}` | `{ ranking: [...] }` | Novo ranking disponível |

---

## Resultado esperado ao final deste passo
- [ ] `GET /api/leaderboard/global` retorna top 10 com total de provas
- [ ] `GET /api/leaderboard/curso/1` retorna ranking da semana atual (vazio se ninguém participou)
- [ ] Ao finalizar prova semanal, todos os clientes conectados no curso recebem atualização
- [ ] `GET /api/leaderboard/cursos-ativos` lista apenas cursos com participação real

## Próximo passo
`STEP_08_IA.md` — Módulo de IA com fallback por regras
