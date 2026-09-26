FROM node:20-alpine AS base

WORKDIR /app

# wget (healthcheck) + openssl (Prisma MySQL) no Alpine
RUN apk add --no-cache openssl wget

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
