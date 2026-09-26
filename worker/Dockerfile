FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Sem porta exposta: background consumer (RF-03 / RF-04)
CMD ["node", "dist/index.js"]
