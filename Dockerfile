FROM node:20.9.0-slim AS builder

WORKDIR /app

# Instala dependências do sistema (inclui openssl)
RUN apt-get update && apt-get install -y openssl

# Instala o PNPM
RUN npm install -g pnpm

# Copia tudo
COPY . .

# Instala as dependências com hoisting (requerido pelo Prisma + pnpm)
RUN pnpm install --frozen-lockfile --shamefully-hoist --force

# Gera o cliente Prisma
RUN pnpm prisma generate

# Imagem final (mais leve)
FROM node:20.9.0-slim

WORKDIR /app

# Instala o PNPM
RUN npm install -g pnpm

COPY --from=builder /app /app

EXPOSE 3000

CMD ["pnpm", "start"]
