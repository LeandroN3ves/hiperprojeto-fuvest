# STEP 01 — Setup do Ambiente e Estrutura de Pastas

## Contexto
Você está iniciando o desenvolvimento da Plataforma de Estudos Fuvest.
Este é o primeiro passo: criar toda a estrutura de pastas, arquivos de configuração e ambiente Docker.

## Stack
- **Backend:** Node.js 20+ com NestJS (TypeScript)
- **Frontend:** Angular 19 (standalone components)
- **Banco:** PostgreSQL 16
- **IA local (opcional):** Ollama
- **ORM:** TypeORM
- **Auth:** Passport.js + JWT

---

## Tarefa 1 — Criar estrutura do backend

Crie a estrutura de pastas do backend NestJS exatamente como abaixo:

```
backend/
├── src/
│   ├── auth/
│   │   ├── strategies/
│   │   └── guards/
│   ├── provas/
│   │   └── dto/
│   ├── questoes/
│   │   └── entities/
│   ├── estatisticas/
│   ├── leaderboard/
│   ├── ia/
│   │   └── fallback/
│   ├── cursos/
│   ├── database/
│   │   ├── entities/
│   │   └── migrations/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── interceptors/
│   └── config/
├── docker-compose.yml
├── .env
├── .env.example
└── package.json
```

---

## Tarefa 2 — Criar `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fuvest_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: fuvest_db
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - /app/node_modules

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  postgres_data:
  ollama_data:
```

---

## Tarefa 3 — Criar `.env.example`

```env
# Banco
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=fuvest_db

# JWT
JWT_SECRET=sua_chave_secreta_muito_longa_aqui
JWT_EXPIRATION=7d

# Google OAuth
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

## Tarefa 4 — Criar `backend/package.json` com todas as dependências

Dependências necessárias:
```json
{
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/typeorm": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/websockets": "^10",
    "@nestjs/platform-socket.io": "^10",
    "@nestjs/schedule": "^4",
    "@nestjs/config": "^3",
    "passport": "^0.7",
    "passport-jwt": "^4",
    "passport-google-oauth20": "^2",
    "bcrypt": "^5",
    "typeorm": "^0.3",
    "pg": "^8",
    "socket.io": "^4",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "axios": "^1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10",
    "@types/bcrypt": "^5",
    "@types/passport-jwt": "^4",
    "@types/passport-google-oauth20": "^2",
    "typescript": "^5"
  }
}
```

---

## Tarefa 5 — Criar `backend/src/config/configuration.ts`

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
});
```

---

## Tarefa 6 — Criar estrutura do frontend Angular 19

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── dashboard/
│   │   │   ├── provas/
│   │   │   │   ├── configurar/
│   │   │   │   ├── executar/
│   │   │   │   └── resultado/
│   │   │   ├── estatisticas/
│   │   │   ├── leaderboard/
│   │   │   └── ia-chat/
│   │   └── shared/
│   │       ├── components/
│   │       └── pipes/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── styles/
│       └── _variables.scss
```

Criar `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

---

## Resultado esperado ao final deste passo
- [ ] Estrutura de pastas do backend criada
- [ ] `docker-compose.yml` funcional
- [ ] `.env` e `.env.example` criados
- [ ] `package.json` com todas as dependências listadas
- [ ] `configuration.ts` criado
- [ ] Estrutura de pastas do frontend criada
- [ ] `docker-compose up -d` sobe postgres sem erro

## Próximo passo
`STEP_02_BANCO_ENTITIES.md` — Criar todas as entidades TypeORM e migrations
