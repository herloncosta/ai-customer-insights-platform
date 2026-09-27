FROM node:20-alpine AS base

WORKDIR /app

# wget (healthcheck) + openssl (Prisma MySQL) no Alpine
RUN apk add --no-cache openssl wget

# Workspace raiz: instala uma vez para backend + shared (@insights/db).
# (os 3 package.jsons de serviço vêm juntos para o npm ci validar o lockfile)
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY worker/package*.json ./worker/
RUN npm ci

COPY shared ./shared/
COPY backend ./backend/

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) no generate — dummy de
# build, a URL real vem do compose em runtime (D-09).
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npm run generate --workspace shared
RUN npm run build --workspace shared
RUN npm run build --workspace backend

# Imagem final sem devDeps (onde moram as vulns de build) e sem root.
# chown restrito a logs + home (chown -R em /app com node_modules é proibitivo).
RUN npm prune --omit=dev && mkdir -p /app/logs /home/node && chown -R node:node /app/logs /home/node
ENV HOME=/home/node
USER node

EXPOSE 3001

# Aplica migrations pendentes no boot (RNF-06: stack sobe do zero em um comando).
CMD ["sh", "-c", "npm run migrate:deploy --workspace shared && node backend/dist/index.js"]
