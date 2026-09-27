FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) no generate — dummy de
# build, a URL real vem do compose em runtime (mesmo padrão do backend, D-09).
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npx prisma generate
RUN npm run build

# Sem porta exposta: background consumer (RF-03 / RF-04)
CMD ["node", "dist/index.js"]
