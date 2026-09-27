FROM node:20-alpine AS base

WORKDIR /app

# wget (healthcheck) + openssl (Prisma MySQL) no Alpine
RUN apk add --no-cache openssl wget

# Workspace raiz: instala uma vez para backend + shared (@insights/db)
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
RUN npm install

COPY shared ./shared/
COPY backend ./backend/

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) no generate — dummy de
# build, a URL real vem do compose em runtime (D-09).
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npm run generate --workspace shared
RUN npm run build --workspace shared
RUN npm run build --workspace backend

EXPOSE 3001

# Aplica migrations pendentes no boot (RNF-06: stack sobe do zero em um comando).
CMD ["sh", "-c", "npm run migrate:deploy --workspace shared && node backend/dist/index.js"]
