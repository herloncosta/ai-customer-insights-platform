FROM node:20-alpine AS base

WORKDIR /app

# wget (healthcheck) + openssl (Prisma MySQL) no Alpine
RUN apk add --no-cache openssl wget

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .

# Prisma 7 resolve prisma.config.ts (env("DATABASE_URL")) em todo comando do CLI,
# inclusive generate — que não conecta no banco. Dummy de build; a URL real vem
# do ambiente em runtime via compose. (.env está no .dockerignore)
ARG DATABASE_URL="mysql://placeholder:placeholder@mysql:3306/placeholder"
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
