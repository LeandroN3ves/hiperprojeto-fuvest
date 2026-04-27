# 📚 HiperprojetoFuvest — Documentação Completa do Projeto

> **Última atualização**: 15 de abril de 2026  
> **Propósito deste arquivo**: Servir como referência principal para retomar o desenvolvimento em qualquer conversa futura. Contém o estado completo do projeto, arquitetura, o que já foi feito e o que falta.

---

## 🎯 O que é o projeto?

Uma **plataforma web de preparação para a Fuvest** (vestibular da USP) com as seguintes funcionalidades:

| Funcionalidade | Descrição |
|---------------|-----------|
| **Provas personalizadas** | Gerar provas com filtros de tema, dificuldade e categoria |
| **Execução de provas** | UX de 1 questão por vez, feedback imediato, sem pular |
| **Dificuldade dinâmica** | Classificação baseada na taxa de acerto global de cada questão |
| **Estatísticas** | Dashboard de desempenho por tema, fraquezas, evolução |
| **Leaderboard** | Ranking global e por curso, atualização em tempo real via WebSocket |
| **Tutor IA** | Chat com Ollama/HuggingFace + fallback por regras |
| **Provas semanais** | Cron job gerando provas automáticas por curso (ainda não implementado) |
| **Dark Mode** | Toggle persistente com transição suave |

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | Angular (standalone components) | 21.x |
| **Backend** | NestJS (TypeScript) | 11.x |
| **Banco de Dados** | PostgreSQL | 16 (Alpine) |
| **ORM** | TypeORM | 0.3.x |
| **IA Local** | Ollama (llama3 + phi3) | latest |
| **WebSocket** | Socket.IO (NestJS Gateway) | 4.x |
| **Autenticação** | JWT + Passport (Google OAuth preparado) | — |
| **Container** | Docker Compose | — |
| **Design** | Tech Light (Outfit font, CSS variables, Dark Mode) | — |

---

## 📁 Estrutura de Pastas (Atualizada)

```
HiperprojetoFuvest/
├── .env                          # Variáveis de ambiente (DB, JWT, Ollama, etc.)
├── .env.example                  # Template do .env
├── docker-compose.yml            # PostgreSQL + Ollama + Backend
├── FORMATO_QUESTOES_PARA_IMPORTACAO.md  # Spec do JSON para importar questões
├── PROJETO.md                    # ← ESTE ARQUIVO (documentação central)
│
├── Passos a seguir para desenvolvimento/   # Guias de implementação (STEPs 01–12)
│   ├── STEP_01_SETUP_AMBIENTE.md
│   ├── STEP_02_BANCO_ENTITIES.md
│   ├── STEP_03_AUTH.md
│   ├── STEP_04_QUESTOES_CURSOS.md
│   ├── STEP_05_PROVAS.md
│   ├── STEP_06_ESTATISTICAS.md
│   ├── STEP_07_LEADERBOARD.md
│   ├── STEP_08_IA.md
│   ├── STEP_09_FRONTEND_BASE.md
│   ├── STEP_10_FRONTEND_PROVAS.md
│   ├── STEP_11_FRONTEND_STATS_LEADERBOARD.md
│   └── STEP_12_PROVAS_SEMANAIS_DEPLOY.md
│
├── ProvasFuvest/                 # 75 PDFs das provas Fuvest (2010–2026)
│   ├── fuvest_2010_1fase_prova_V.pdf
│   ├── fuvest_2010_1fase_prova_gab_cor.pdf
│   ├── ... (provas + gabaritos)
│   └── fuvest2026-fase1-prova-V1.pdf
│
├── ProvasFuvestJson/             # 15 JSONs pré-processados (1ª fase, 2010–2026)
│   ├── fuvest_2010_fase_1.json
│   ├── ... (73-89 questões por arquivo)
│   └── fuvest_2026_fase_1.json
│
├── backend/                      # API NestJS
│   ├── src/
│   │   ├── main.ts               # Bootstrap da aplicação (porta 3000)
│   │   ├── app.module.ts         # Módulo raiz (registra todos os módulos)
│   │   ├── config/
│   │   │   └── configuration.ts  # Configuração centralizada (.env → objeto)
│   │   │
│   │   ├── database/
│   │   │   ├── entities/         # 8 entidades TypeORM
│   │   │   │   ├── usuario.entity.ts
│   │   │   │   ├── questao.entity.ts
│   │   │   │   ├── prova.entity.ts
│   │   │   │   ├── resposta.entity.ts
│   │   │   │   ├── estatistica.entity.ts
│   │   │   │   ├── leaderboard-semanal.entity.ts
│   │   │   │   ├── curso.entity.ts
│   │   │   │   └── curso-tema.entity.ts
│   │   │   ├── migrations/       # (vazio — usando synchronize em dev)
│   │   │   └── seeds/
│   │   │       └── seed.ts       # Seed de cursos, temas e questão-exemplo
│   │   │
│   │   ├── auth/                 # Autenticação (JWT + Google OAuth)
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts   # Login, registro, hash bcrypt
│   │   │   ├── auth.controller.ts
│   │   │   ├── dto/              # LoginDto, RegisterDto
│   │   │   ├── guards/           # JwtAuthGuard
│   │   │   └── strategies/       # JwtStrategy
│   │   │
│   │   ├── questoes/             # Questões e importação
│   │   │   ├── questoes.module.ts
│   │   │   ├── questoes.service.ts      # CRUD, busca por dificuldade, temas
│   │   │   ├── questoes.controller.ts
│   │   │   └── fuvest-importer.service.ts  # Importador de PDFs via Ollama
│   │   │
│   │   ├── cursos/               # Cursos e temas
│   │   │   ├── cursos.module.ts
│   │   │   ├── cursos.service.ts
│   │   │   └── cursos.controller.ts
│   │   │
│   │   ├── provas/               # Geração, execução e finalização de provas
│   │   │   ├── provas.module.ts
│   │   │   ├── provas.service.ts        # Core: gerarProva, responder, finalizar
│   │   │   ├── provas.controller.ts
│   │   │   └── dto/                     # GerarProvaDto, ResponderQuestaoDto
│   │   │
│   │   ├── estatisticas/         # Dashboard de desempenho
│   │   │   ├── estatisticas.module.ts
│   │   │   ├── estatisticas.service.ts  # Dashboard, fraquezas, stats diárias
│   │   │   └── estatisticas.controller.ts
│   │   │
│   │   ├── leaderboard/          # Ranking global e por curso
│   │   │   ├── leaderboard.module.ts
│   │   │   ├── leaderboard.service.ts   # Ranking, cursos ativos
│   │   │   ├── leaderboard.controller.ts
│   │   │   └── leaderboard.gateway.ts   # WebSocket Gateway (tempo real)
│   │   │
│   │   ├── ia/                   # Tutor IA (Ollama + HuggingFace + Fallback)
│   │   │   ├── ia.module.ts
│   │   │   ├── ia.service.ts            # Chat, sugestões, gerarJsonEstruturado
│   │   │   ├── ia.controller.ts
│   │   │   ├── dto/
│   │   │   └── fallback/
│   │   │       └── regras.service.ts    # Respostas por regras (sem IA)
│   │   │
│   │   ├── common/               # Utilitários compartilhados
│   │   │   ├── decorators/       # @GetUser()
│   │   │   ├── filters/          # Filtros de exceção
│   │   │   └── interceptors/
│   │   │
│   │   └── scripts/              # Scripts CLI para importação
│   │       ├── import-json.ts    # ✅ Importar questões dos JSONs pré-processados
│   │       ├── import-fuvest.ts  # Importar via Ollama (legado, não usado)
│   │       └── test-extraction.ts # Testar extração de 1 prova (dry-run)
│   │
│   └── package.json              # Deps: NestJS, TypeORM, Passport, pdf-parse, etc.
│
└── frontend/                     # Angular SPA
    ├── src/
    │   ├── main.ts               # Bootstrap Angular
    │   ├── index.html
    │   ├── styles.scss           # Design system: CSS variables, Dark Mode, Outfit font
    │   │
    │   └── app/
    │       ├── app.component.ts  # Navbar + Toggle Dark Mode + RouterOutlet
    │       ├── app.config.ts     # HttpClient, Router providers
    │       ├── app.routes.ts     # Lazy-loaded routes (auth, dashboard, provas, etc.)
    │       │
    │       ├── core/
    │       │   ├── guards/
    │       │   │   └── auth.guard.ts         # Redireciona para /login se não logado
    │       │   ├── interceptors/
    │       │   │   └── jwt.interceptor.ts    # Adiciona Bearer token em todas requests
    │       │   ├── models/
    │       │   │   └── index.ts              # Interfaces TypeScript (Usuario, Questao, etc.)
    │       │   └── services/
    │       │       ├── auth.service.ts        # Login, registro, logout, estado do usuário
    │       │       ├── provas.service.ts      # Gerar, responder, finalizar provas
    │       │       ├── estatisticas.service.ts # Dashboard, fraquezas
    │       │       ├── leaderboard.service.ts  # Ranking global/curso
    │       │       ├── ia.service.ts           # Chat com IA
    │       │       ├── websocket.service.ts    # Socket.IO para leaderboard ao vivo
    │       │       └── theme.service.ts        # Dark Mode (Signal + localStorage)
    │       │
    │       ├── features/
    │       │   ├── auth/
    │       │   │   ├── login/                # Tela de login
    │       │   │   └── register/             # Tela de registro (com seleção de curso)
    │       │   ├── dashboard/                # Dashboard (ações rápidas + stats + sugestões IA)
    │       │   ├── provas/
    │       │   │   ├── configurar/           # Configurar prova (temas, dificuldade, qtd)
    │       │   │   ├── executar/             # Executar prova (1 questão por vez)
    │       │   │   └── resultado/            # Resultado (placar + temas + sugestão)
    │       │   ├── estatisticas/             # Dashboard de desempenho por tema
    │       │   ├── leaderboard/              # Ranking (global + por curso + ao vivo)
    │       │   └── ia-chat/                  # Chat com tutor IA
    │       │
    │       └── shared/
    │           ├── components/               # (preparado para componentes reutilizáveis)
    │           └── pipes/                    # (preparado para pipes customizados)
    │
    └── package.json              # Deps: Angular 21, Socket.IO Client, RxJS
```

---

## 🗄️ Schema do Banco de Dados

### Entidades (8 tabelas)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   usuarios   │     │    cursos    │     │  curso_temas │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (UUID PK) │     │ id (PK)      │     │ id (PK)      │
│ nome         │──┐  │ nome         │──┬──│ curso_id     │
│ email (UQ)   │  │  │ descricao    │  │  │ tema         │
│ senha_hash   │  │  └──────────────┘  │  └──────────────┘
│ curso_id(FK) │──┘                    │
│ provider     │     ┌──────────────┐  │  ┌──────────────┐
└──────────────┘     │   questoes   │  │  │   provas     │
                     ├──────────────┤  │  ├──────────────┤
                     │ id (PK)      │  │  │ id (UUID PK) │
                     │ enunciado    │  │  │ usuario_id   │
                     │ alternativas │  │  │ tipo         │ normal/semanal
                     │ resp_correta │  │  │ curso_id     │
                     │ tema         │  │  │ configuracao │ (JSONB)
                     │ categoria    │  │  │ finalizada   │
                     │ ano_fuvest   │  │  │ created_at   │
                     │ explicacao   │  │  └──────────────┘
                     │ classificado │  │
                     └──────────────┘  │  ┌──────────────┐
                                       │  │  respostas   │
┌──────────────────┐                   │  ├──────────────┤
│  estatisticas    │                   │  │ id (PK)      │
├──────────────────┤                   │  │ usuario_id   │
│ id (PK)          │                   │  │ questao_id   │
│ usuario_id       │                   │  │ prova_id     │
│ tema             │                   │  │ resposta     │
│ acertos          │                   │  │ correta      │
│ erros            │                   │  │ respondida_em│
└──────────────────┘                   │  └──────────────┘
                                       │
┌──────────────────────┐               │
│  leaderboard_semanal │               │
├──────────────────────┤               │
│ id (PK)              │               │
│ usuario_id           │               │
│ curso_id             │───────────────┘
│ semana               │
│ acertos              │
│ prova_id             │
│ UQ(usuario,curso,sem)│
└──────────────────────┘
```

### Estado atual do banco
- **Cursos**: **87 cursos cadastrados** (importados via `cursos_fuvest.json`), abrangendo diversas áreas da USP.
- **Temas por curso**: **719 temas vinculados**, baseados na relevância para o desempenho de cada curso.
- **Questões**: **1.235 questões** — 1.234 importadas de 15 provas (2010–2026, 1ª fase) + 1 exemplo do seed
- **Anos disponíveis**: 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2019, 2020, 2022, 2023, 2024, 2025, 2026
- **Anos faltando**: 2018, 2021 (JSONs não disponíveis)
- **Usuários/Provas/Respostas**: Tabelas criadas, sem dados

---

## ✅ Progresso por STEP

| # | Step | Status | Observações |
|---|------|--------|-------------|
| 01 | Setup do Ambiente | ✅ Completo | Docker, Node, NestJS CLI, Angular CLI |
| 02 | Banco & Entidades | ✅ Completo | 8 entidades TypeORM, seed de cursos |
| 03 | Autenticação | ✅ Completo | JWT + bcrypt (Google OAuth sem credenciais) |
| 04 | Questões & Cursos | ✅ Completo | CRUD, busca por dificuldade dinâmica |
| 05 | Provas (Core) | ✅ Completo | Geração, execução 1-por-1, finalização |
| 06 | Estatísticas | ✅ Completo | Dashboard, fraquezas, stats diárias |
| 07 | Leaderboard | ✅ Completo | Global + por curso + WebSocket tempo real |
| 08 | IA + Fallback | ✅ Completo | Ollama → HuggingFace → Fallback regras |
| 09 | Frontend Base + Auth | ✅ Completo | Login, registro, navbar, routing, design |
| 10 | Frontend Provas | ✅ Completo | Configurar, executar, resultado |
| 11 | Frontend Stats/Leaderboard/Chat | ✅ Completo | Estatísticas, ranking, chat IA |
| 12 | Provas Semanais + Deploy | ✅ Completo | Cron job + Dockerfile + vercel.json (Finalizado, aguardando execução manual do Deploy) |

### Design Extras (fora dos STEPs)
- ✅ **Design Tech Light** — Outfit font, gradientes suaves, glassmorphism
- ✅ **Dark Mode** — ThemeService com Signals, persistência localStorage
- ✅ **CSS Variables** — Centralizado no `styles.scss` com `:root` e `body.dark`

---

## 🔴 Onde Paramos — Próximos Passos

### ✅ CONCLUÍDO: Importação de questões reais

Em 15/04/2026, foram importadas **1.234 questões** de 15 provas da Fuvest (1ª fase, 2010–2026) via `npm run import:json`. O script (`src/scripts/import-json.ts`) leu os JSONs da pasta `ProvasFuvestJson/`, limpou artefatos de extração PDF, validou e inseriu no banco. Total no banco: **1.235 questões**.

### ✅ CONCLUÍDO: Importação de todos os cursos da Fuvest

Em 16/04/2026, foram importados **87 cursos** com **719 temas** associados via `npm run import:cursos`. O script leu a base `cursos_fuvest.json` e as injetou nas tabelas `cursos` e `cursos_temas`.

### ✅ CONCLUÍDO: STEP 12 — Provas Semanais + Infraestrutura de Deploy
Nos dias recentes, o cron job (`ProvasSemanaisService` rodando às segundas 00:00) e todo o código de infra (Dockerfile, `vercel.json` e `environment.prod.ts`) foram implementados. O arquivo explicativo `DEPLOY.md` foi criado.

### ✅ CONCLUÍDO: Correções Pós-Deploy e Polimento (Abril 2026)

- **Correção de Encoding no Banco (Supabase):** Os dados inseridos inicialmente no banco de dados de produção apresentavam problemas de *mojibake* (acentos corrompidos, ex: "Fásica" ao invés de "Física"). Criou-se o script `regenerate_seeds.py` para extrair os dados dos JSONs originais e gerar 3 arquivos de seed limpos e com decodificação correta (`seed_1_clean.sql`, `seed_2_clean.sql`, `seed_3_clean.sql`). Eles foram executados e a base de dados de produção agora exibe todos os caracteres em PT-BR perfeitos.
- **Tratamento de Questões com Imagem:** Como a plataforma não suporta imagens em perguntas neste momento, um script identificou e apagou 145 questões da base de produção que dependiam da *tag* `[IMAGEM]`. Assim, restaram 1090 questões na plataforma que podem ser solucionadas sem contexto visual.
- **Atualização da Inteligência Artificial:** O *tutor* embutido na aplicação estava retornando respostas padronizadas pois o modelo original do Google Gemini vinculado API (`gemini-1.5-flash`) foi descontinuado. O backend em `src/ia/ia.service.ts` foi refatorado para utilizar a versão nova (`gemini-2.0-flash`), incluindo também *logs* apropriados de detecção de erros. As correções foram enviadas ao GitHub acionando um rebuild bem sucedido no Railway.

### Próximos Passos (Para a próxima sessão):

1. **Testar IA em Produção:** Verificar e conversar com o chatbot no painel ao vivo para averiguar se está usando o Gemini. A API Key no Railway continuou a mesma, logo ele deve conectar automaticamente.
2. **Futuro - Recuperar as 145 Questões (Opcional):** Implementar um suporte de storage (S3 ou Supabase Storage) para hospedar imagens que compõem essas questões e adicioná-las novamente na UI, bem como no parsing.
3. **Futuro - Importar provas faltantes:**
   - Adicionar arquivos JSON de edições faltando (2018 e 2021 — os respectivos PDFs já estão em `ProvasFuvest/`).
   - Avaliar importar *também* as questões de 2ª fase e converte-las logicamente para múltipla escolha.

---

## 🐳 Docker

### Serviços no `docker-compose.yml`

| Serviço | Imagem | Porta | Status |
|---------|--------|-------|--------|
| `postgres` | `postgres:16-alpine` | 5432 | ✅ Funcional |
| `ollama` | `ollama/ollama` | 11434 | ✅ Funcional (llama3 + phi3 baixados) |
| `backend` | Build local (`./backend`) | 3000 | ⚠️ Não testado via Docker (roda local) |

### Como subir
```bash
docker compose up -d postgres ollama
```

### Modelos Ollama disponíveis
- `llama3:latest` (4.7 GB)
- `phi3:latest` (2.2 GB)

---

## ⚙️ Variáveis de Ambiente (.env)

```env
# Banco
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fuvest_db

# JWT
JWT_SECRET=kdSLtbKQR8DfCZA8K1CrJ7g4QiEWfMr4NbfiC/K6gDs=
JWT_EXPIRATION=7d

# Google OAuth (não configurado ainda)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# IA
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
HUGGINGFACE_API_KEY=
OPENROUTER_API_KEY=

# App
PORT=3000
FRONTEND_URL=http://localhost:4200
```

---

## 🔑 Endpoints da API

### Auth (`/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta (nome, email, senha, curso_id) |
| POST | `/auth/login` | Login (email, senha) → JWT |

### Questões (`/questoes`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/questoes/temas` | Listar temas disponíveis |

### Provas (`/provas`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/provas/gerar` | Gerar prova (temas, qtd, distribuicao, categoria) |
| POST | `/provas/:id/responder` | Responder questão (questao_id, resposta) |
| POST | `/provas/:id/finalizar` | Finalizar prova → resultado com breakdown |

### Estatísticas (`/estatisticas`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/estatisticas` | Dashboard completo do usuário |
| GET | `/estatisticas/fraquezas` | Top 3 temas com mais erro |

### Leaderboard (`/leaderboard`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/leaderboard/global` | Ranking global |
| GET | `/leaderboard/curso/:id` | Ranking por curso (semana atual) |
| GET | `/leaderboard/cursos-ativos` | IDs de cursos com participantes |

### IA (`/ia`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/ia/chat` | Chat com tutor (mensagem + historico) |
| GET | `/ia/sugestoes` | Sugestões personalizadas de estudo |

### Cursos (`/cursos`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/cursos` | Listar cursos + temas |

---

## 🖥️ Rotas do Frontend

| Rota | Componente | Guard |
|------|-----------|-------|
| `/login` | LoginComponent | — |
| `/register` | RegisterComponent | — |
| `/dashboard` | DashboardComponent | authGuard |
| `/provas/configurar` | ConfigurarComponent | authGuard |
| `/provas/:id/executar` | ExecutarComponent | authGuard |
| `/provas/:id/resultado` | ResultadoComponent | authGuard |
| `/estatisticas` | EstatisticasComponent | authGuard |
| `/leaderboard` | LeaderboardComponent | authGuard |
| `/ia-chat` | IaChatComponent | authGuard |

---

## 🎨 Design System

- **Font**: Google Fonts — Outfit (300-700)
- **Modo Claro**: Fundo `#f8fafc`, cards brancos, texto `#0f172a`
- **Modo Noturno**: Fundo `#020617` (Slate 950), cards `#0f172a`, texto `#f8fafc`
- **Accent**: `#3b82f6` (claro) / `#60a5fa` (escuro)
- **Componentes**: Glassmorphism, borders sutis, shadows responsivas
- **Animações**: fadeIn, hover scales, transições suaves em 0.2-0.3s

---

## 📌 Notas Importantes

1. **`synchronize: true`** está ativo em dev — TypeORM auto-cria/altera tabelas. Em produção DEVE ser `false` (usar migrations).
2. **Google OAuth** está preparado no código mas sem credenciais (campos vazios no `.env`).
3. O **FuvestImporterService** existe mas tem limitações com Ollama local. O script `import-json.ts` é a abordagem definitiva para importar questões via JSONs pré-processados.
4. O **ScheduleModule** já está nas dependências (`@nestjs/schedule`) mas NÃO está importado em nenhum módulo ainda (STEP 12).
5. **WebSocket** para leaderboard está implementado no backend (Gateway) e no frontend (WebsocketService).
6. **Script de importação**: `npm run import:json` — lê JSONs da pasta `ProvasFuvestJson/`, limpa artefatos, valida, e insere no banco com proteção contra duplicatas.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Docker Desktop rodando
- Node.js 20+
- NPM

### Backend
```bash
cd backend
npm install
docker compose up -d postgres ollama      # Subir banco + IA
npm run seed                               # Popular cursos/temas
npm run import:json                        # Importar questões Fuvest (1.234 questões)
npm run start:dev                          # Rodar em modo dev (porta 3000)
```

### Frontend
```bash
cd frontend
npm install
npm start                                  # Rodar em modo dev (porta 4200)
```

### Verificar
- Backend: http://localhost:3000
- Frontend: http://localhost:4200
- Ollama: http://localhost:11434
