# Estágio 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código e gerar build
COPY . .
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine

WORKDIR /app

# Copiar apenas o necessário do estágio de build
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

# Rodar a aplicação
CMD ["node", "dist/main"]
