# STEP 12 — Provas Semanais (Cron Job) + Deploy

## Contexto
Passo 12 — Último passo do MVP. Frontend e backend completos (Steps 01-11).
Implementar o cron job de geração automática de provas semanais e configurar deploy.

---

## PARTE A — Provas Semanais Automáticas

### Tarefa 1 — Criar `src/provas/provas-semanais.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prova } from '../database/entities/prova.entity';
import { CursosService } from '../cursos/cursos.service';
import { QuestoesService } from '../questoes/questoes.service';

function getInicioSemanaAtual(): string {
  const hoje = new Date();
  const dia = hoje.getDay();
  const diff = hoje.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(new Date(hoje).setDate(diff));
  return seg.toISOString().split('T')[0];
}

@Injectable()
export class ProvasSemanaisService {
  private readonly logger = new Logger(ProvasSemanaisService.name);

  constructor(
    @InjectRepository(Prova) private provaRepo: Repository<Prova>,
    private cursosService: CursosService,
    private questoesService: QuestoesService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Executa toda segunda-feira às 00:00
  // ─────────────────────────────────────────────────────────────────────────
  @Cron('0 0 * * 1')
  async gerarProvasSemanaiss() {
    this.logger.log('Iniciando geração de provas semanais...');

    const cursos = await this.cursosService.findAll();
    const semana = getInicioSemanaAtual();

    for (const curso of cursos) {
      try {
        // Verificar se já existe prova semanal para este curso nesta semana
        const jaExiste = await this.provaRepo.findOne({
          where: { tipo: 'semanal', curso_id: curso.id },
        });

        if (jaExiste) {
          this.logger.log(`Prova semanal já existe para curso ${curso.nome} na semana ${semana}`);
          continue;
        }

        // Coletar top 10 temas mais respondidos nesta semana para o curso
        const topTemas = await this.questoesService.getTopTemasSemanais(curso.id, semana, 10);

        if (topTemas.length === 0) {
          this.logger.warn(`Sem dados de temas para curso ${curso.nome} — usando temas do curso`);
          // Fallback: usar temas cadastrados no curso
          const temasCurso = await this.cursosService.getTemasDoCurso(curso.id);
          topTemas.push(...temasCurso.slice(0, 10));
        }

        // Gerar prova semanal (template — cada usuário responderá esta prova)
        const prova = this.provaRepo.create({
          tipo: 'semanal',
          curso_id: curso.id,
          configuracao: {
            qtd_questoes: 20,
            temas: topTemas,
            distribuicao: { facil: 33, medio: 34, dificil: 33 },
            questoes_ids: [], // será preenchido quando o usuário iniciar
          },
          finalizada: false,
        });

        await this.provaRepo.save(prova);
        this.logger.log(`Prova semanal criada para ${curso.nome}: ${topTemas.join(', ')}`);
      } catch (err) {
        this.logger.error(`Erro ao gerar prova semanal para ${curso.nome}:`, err);
      }
    }

    this.logger.log('Geração de provas semanais concluída');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Endpoint para verificar/iniciar prova semanal do usuário
  // ─────────────────────────────────────────────────────────────────────────
  async getProvaSemanais(usuarioId: string, cursoId: number) {
    const semana = getInicioSemanaAtual();

    // Verificar se o usuário já participou esta semana
    const participacaoExistente = await this.provaRepo.findOne({
      where: { usuario_id: usuarioId, tipo: 'semanal', curso_id: cursoId, finalizada: true },
    });

    if (participacaoExistente) {
      return {
        disponivel: true,
        ja_participou: true,
        prova_id: participacaoExistente.id,
        semana,
      };
    }

    // Verificar se existe template semanal para o curso
    const template = await this.provaRepo.findOne({
      where: { tipo: 'semanal', curso_id: cursoId },
      order: { created_at: 'DESC' },
    });

    return {
      disponivel: template !== null,
      ja_participou: false,
      prova_id: null,
      semana,
      configuracao: template?.configuracao ?? null,
    };
  }
}
```

---

### Tarefa 2 — Adicionar endpoint no ProvasController

```typescript
// Em provas.controller.ts — adicionar:
@Get('semanal/atual')
getProvaSemanaisAtual(@GetUser() usuario: Usuario) {
  return this.provasSemanaisService.getProvaSemanais(
    usuario.id,
    usuario.curso_id
  );
}
```

---

### Tarefa 3 — Adicionar ProvasSemanaisService e ScheduleModule

No `provas.module.ts`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { ProvasSemanaisService } from './provas-semanais.service';

@Module({
  imports: [
    // ... anteriores ...
    ScheduleModule.forRoot(), // apenas uma vez no root
  ],
  providers: [ProvasService, ProvasSemanaisService],
  exports: [ProvasService, ProvasSemanaisService],
})
```

No `provas.controller.ts`, injetar `ProvasSemanaisService`:
```typescript
constructor(
  private provasService: ProvasService,
  private provasSemanaisService: ProvasSemanaisService,
) {}
```

---

## PARTE B — Deploy

### Tarefa 4 — Configurar variáveis de ambiente para produção

#### Backend (Railway/Render)
```env
NODE_ENV=production
DB_HOST=<supabase_host>
DB_PORT=5432
DB_USERNAME=<supabase_user>
DB_PASSWORD=<supabase_password>
DB_DATABASE=postgres
JWT_SECRET=<string_aleatoria_segura_64_chars>
JWT_EXPIRATION=7d
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
GOOGLE_CALLBACK_URL=https://sua-api.railway.app/api/auth/google/callback
OLLAMA_BASE_URL=http://localhost:11434
FRONTEND_URL=https://seu-app.vercel.app
PORT=3000
```

#### Frontend (Vercel)
Criar `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://sua-api.railway.app',
};
```

---

### Tarefa 5 — Criar `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main"]
```

---

### Tarefa 6 — Criar `frontend/vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Isso garante que o Angular Router funcione em produção (sem 404 em reload).

---

### Tarefa 7 — Scripts `package.json` do backend

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "migration:run": "typeorm migration:run -d dist/data-source.js",
    "seed": "ts-node src/database/seeds/seed.ts"
  }
}
```

---

### Tarefa 8 — Checklist de deploy

#### Supabase (Banco)
1. Criar projeto em supabase.com
2. Copiar connection string
3. Garantir que `synchronize: false` em produção (usar migrations)

#### Railway (Backend)
1. Conectar repositório GitHub
2. Definir todas as variáveis de ambiente
3. Build command: `npm run build`
4. Start command: `npm run start`

#### Vercel (Frontend)
1. Conectar repositório GitHub
2. Framework preset: Angular
3. Build command: `ng build --configuration production`
4. Output directory: `dist/frontend/browser`
5. Definir variável: `VITE_API_URL` ou usar `environment.prod.ts`

---

## Checklist Final do MVP

### Backend
- [ ] Auth (JWT + Google OAuth)
- [ ] Questões com dificuldade dinâmica
- [ ] Geração de provas (distribuição proporcional)
- [ ] Execução (1 questão por vez, sem pular, sem repetir)
- [ ] Finalização com resultado por tema
- [ ] Estatísticas (dashboard, fraquezas, stats diárias)
- [ ] Leaderboard global + por curso
- [ ] WebSocket em tempo real
- [ ] IA com fallback por regras (sistema nunca quebra)
- [ ] Provas semanais automáticas (cron)

### Frontend
- [ ] Auth (login + registro com seleção de curso)
- [ ] Configurar prova (temas, dificuldade, categoria)
- [ ] Executar prova (UX: feedback imediato, sem pular)
- [ ] Resultado (placar + breakdown por tema + sugestão IA)
- [ ] Dashboard (ações rápidas + stats do dia + sugestões)
- [ ] Estatísticas (gráficos por tema + destaque de fraqueza)
- [ ] Leaderboard (global + por curso + ao vivo via WS)
- [ ] Chat com IA (histórico + sugestões rápidas + fallback)

### Infraestrutura
- [ ] Docker Compose para desenvolvimento local
- [ ] Supabase com tabelas criadas
- [ ] Backend deployado no Railway/Render
- [ ] Frontend deployado no Vercel
- [ ] Variáveis de ambiente configuradas nos dois ambientes

---

## Ordem de implementação recomendada

```
Step 01 → Ambiente e estrutura
Step 02 → Banco e entidades
Step 03 → Auth backend
Step 04 → Questões e Cursos
Step 05 → Provas (core)
Step 06 → Estatísticas
Step 07 → Leaderboard + WebSocket
Step 08 → IA + fallback
Step 09 → Frontend base + auth
Step 10 → Frontend provas
Step 11 → Frontend stats + leaderboard + chat
Step 12 → Cron semanal + deploy
```

**Regra de ouro:** Nunca avançar para o próximo step sem os testes manuais do step atual passando.
