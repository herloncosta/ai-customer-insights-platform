FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

# Workspace raiz: instala uma vez para worker + shared (@insights/db)
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY worker/package*.json ./worker/
RUN npm install

COPY shared ./shared/
COPY worker ./worker/

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) no generate — dummy de
# build, a URL real vem do compose em runtime (mesmo padrão do backend, D-09).
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npm run generate --workspace shared
RUN npm run build --workspace shared
RUN npm run build --workspace worker

# Sem porta exposta: background consumer (RF-03 / RF-04)
CMD ["node", "worker/dist/index.js"]
