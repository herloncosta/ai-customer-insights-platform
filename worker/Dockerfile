FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

# Workspace raiz: instala uma vez para worker + shared (@insights/db).
# (os 3 package.jsons de serviço vêm juntos para o npm ci validar o lockfile)
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY worker/package*.json ./worker/
RUN npm ci

COPY shared ./shared/
COPY worker ./worker/

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) no generate — dummy de
# build, a URL real vem do compose em runtime (mesmo padrão do backend, D-09).
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npm run generate --workspace shared
RUN npm run build --workspace shared
RUN npm run build --workspace worker

# Imagem final sem devDeps (onde moram as vulns de build) e sem root.
# chown restrito a logs + home (chown -R em /app com node_modules é proibitivo).
RUN npm prune --omit=dev && mkdir -p /app/logs /home/node && chown -R node:node /app/logs /home/node
ENV HOME=/home/node
USER node

# Sem porta exposta: background consumer (RF-03 / RF-04)
CMD ["node", "worker/dist/index.js"]
