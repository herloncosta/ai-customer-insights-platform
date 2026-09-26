# 🚀 PLANO DE IMPLEMENTAÇÃO: AI-Powered Customer Insights Platform

---

## 1. Visão Geral da Arquitetura

O sistema é composto por 3 serviços/camadas desacopladas executadas via Docker Compose:

```
[ Frontend: React + Vite + TS ]
          │ (HTTP REST)
          ▼
[ Backend API: Node.js + Express + TS + Prisma ] ──► [ DB: MySQL 8.0 ]
          │ (Publica Eventos)
          ▼
[ Message Broker: RabbitMQ ]
          │ (Consome Mensagens)
          ▼
[ Worker Engine: Node.js + TS + OpenAI API ]

```

---

## 2. Especificações de Requisitos

### 2.1 Requisitos Funcionais (RF)

- **RF-01 (Gestão de Feedbacks):** A API deve permitir a criação, listagem, filtragem e leitura de feedbacks/chamados de suporte.
- **RF-02 (Fila de Processamento Assíncrono):** Ao receber um novo feedback, a API deve salvá-lo no banco com status `PENDING` e publicar uma mensagem na fila `feedback_processing_queue` do RabbitMQ.
- **RF-03 (Análise Sensorial por IA):** O Worker de background deve consumir a fila, enviar o texto para a OpenAI API (`gpt-4o-mini`) e extrair:
- **Sentimento:** `POSITIVE`, `NEGATIVE`, `NEUTRAL`
- **Urgência:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Categoria:** `BUG`, `FEATURE_REQUEST`, `BILLING`, `USABILITY`, `OTHER`
- **Resumo executivo:** máximo de 20 palavras
- **Tags sugeridas:** lista de palavras-chave (array de strings)

- **RF-04 (Atualização de Estado):** O Worker atualiza o registro no MySQL para `PROCESSED` e anexa os dados analisados. Em caso de falha de IA/Rede, deve atualizar para `FAILED` e publicar em uma _Dead Letter Queue_ (DLQ).
- **RF-05 (Dashboard Métricas):** Endpoint no backend que retorne métricas agregadas: total de chamados por sentimento, distribuição por urgência e tags mais frequentes.
- **RF-06 (Interface React):** O front-end deve exibir:
- Formulário de submissão de feedback.
- Tabela interativa com filtros por status, sentimento e urgência.
- Modal/Card exibindo a análise detalhada gerada pela IA.

---

### 2.2 Requisitos Não-Funcionais (RNF)

- **RNF-01 (Performance / SLA REST):** Endpoint `POST /api/feedbacks` deve responder em **< 100ms** (não aguarda o processamento de IA).
- **RNF-02 (Tipagem e Manutenibilidade):** Código 100% TypeScript com `strict: true` e ESLint/Prettier configurados.
- **RNF-03 (Resiliência e Idempotência):** Garantia de processamento da fila sem duplicação no banco e suporte a retentativas em falhas transitórias de rede na chamada da OpenAI API.
- **RNF-04 (Cobertura de Testes):** Mínimo de **80% de cobertura** em testes unitários e testes de integração com banco de teste executados via Vitest/Jest.
- **RNF-05 (Segurança - OWASP):** Validação estrita de input via `Zod`, sanitize de dados contra SQL Injection (garantido por ORM), CORS restrito e sem API Keys expostas no cliente/repositório.
- **RNF-06 (Ambiente Contêinerizado):** Subida completa do ecossistema local (API, Worker, React, MySQL, RabbitMQ) em um único comando `docker compose up --build`.

---

## 3. Modelo de Dados (Prisma Schema Reference)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "mysql"
}

generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

enum Status {
  PENDING
  PROCESSING
  PROCESSED
  FAILED
}

enum Sentiment {
  POSITIVE
  NEGATIVE
  NEUTRAL
}

enum Urgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum Category {
  BUG
  FEATURE_REQUEST
  BILLING
  USABILITY
  OTHER
}

model Feedback {
  id          String    @id @default(uuid())
  customerName String
  email       String
  content     String    @db.Text
  status      Status    @default(PENDING)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  analysis    Analysis?
}

model Analysis {
  id          String    @id @default(uuid())
  feedbackId  String    @unique
  feedback    Feedback  @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  sentiment   Sentiment
  urgency     Urgency
  category    Category
  summary     String    @db.VarChar(255)
  tags        Json      // Array de strings armazenado como JSON
  createdAt   DateTime  @default(now())
}

```
// ⚠️ Prisma 7: `url` foi removido do bloco `datasource` e o generator
// `prisma-client-js` foi substituído por `prisma-client` (com `output`
// obrigatório). A URL de conexão do CLI vive em `backend/prisma.config.ts`:
```ts
// backend/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
```
// Runtime (quando houver código que instancia o client): `new PrismaClient()`
// puro lança erro no v7 — usar driver adapter `@prisma/adapter-mariadb`:
// `new PrismaClient({ adapter })`. Ver §6 (D-01).

---

## 4. Contratos de API (OpenAPI Specification / REST)

### 1. Criar Feedback

- **POST** `/api/v1/feedbacks`
- **Request Body (Zod Schema Validation):**

```json
{
  "customerName": "John Doe",
  "email": "john@example.com",
  "content": "O sistema está apresentando erro 500 ao tentar gerar relatório financeiro desde hoje de manhã."
}
```

- **Response (202 Accepted):**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "PENDING",
  "message": "Feedback recebido e enviado para análise."
}
```

### 2. Listar Feedbacks (Com Paginação e Filtros)

- **GET** `/api/v1/feedbacks?page=1&limit=10&sentiment=NEGATIVE&urgency=HIGH`
- **Response (200 OK):**

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "customerName": "John Doe",
      "email": "john@example.com",
      "content": "O sistema está apresentando erro 500...",
      "status": "PROCESSED",
      "createdAt": "2026-10-15T10:00:00.000Z",
      "analysis": {
        "sentiment": "NEGATIVE",
        "urgency": "HIGH",
        "category": "BUG",
        "summary": "Erro 500 ao gerar relatórios financeiros.",
        "tags": ["erro 500", "relatório", "financeiro"]
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### 3. Obter Métricas do Dashboard

- **GET** `/api/v1/feedbacks/metrics`
- **Response (200 OK):**

```json
{
  "total": 150,
  "bySentiment": { "POSITIVE": 80, "NEUTRAL": 30, "NEGATIVE": 40 },
  "byUrgency": { "LOW": 50, "MEDIUM": 60, "HIGH": 30, "CRITICAL": 10 }
}
```

---

## 5. Instrução Específica para Prompt de IA (Prompts do Worker)

Ao implementar o worker com IA, oriente o agente a utilizar o parâmetro **Structured Outputs / JSON Mode** da OpenAI API para evitar erros de parser:

```typescript
// Exemplo de payload esperado da OpenAI no Worker Engine:
const systemPrompt = `Você é um motor de IA especializado em classificação de suporte ao cliente. 
Analise a mensagem e retorne EXATAMENTE um objeto JSON seguindo o schema informado, sem textos adicionais.`;

const jsonSchema = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
    urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    category: {
      type: "string",
      enum: ["BUG", "FEATURE_REQUEST", "BILLING", "USABILITY", "OTHER"],
    },
    summary: { type: "string", description: "Resumo em no máximo 20 palavras" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["sentiment", "urgency", "category", "summary", "tags"],
};
```

---

## 6. Decisões de Implementação (log — ler antes de codar)

- **D-01 (Prisma 7):** repo usa `prisma` + `@prisma/client` v7 (`prisma-client`, `prisma.config.ts`, sem `url` no schema). Runtime exige `@prisma/adapter-mariadb` (`new PrismaClient({ adapter })`). Migração v5→v6→v7 registrada nos commits; não reverter para `prisma-client-js`.
- **D-02 (Métricas):** `GET /api/v1/feedbacks/metrics` inclui `topTags: [{tag, count}]` (RF-05 exige; exemplo do §4.3 estava incompleto).
- **D-03 (Rotas):** base canônica `/api/v1` (RNF-01 citava `/api` sem versão — desconsiderar).
- **D-04 (Leitura unitária):** implementar `GET /api/v1/feedbacks/:id` (UUID, RF-01) mesmo sem contrato detalhado no §4.
- **D-05 (DLQ):** `feedback_processing_queue.dlq` via `x-dead-letter-exchange=""` + `x-dead-letter-routing-key` (RF-04).
- **D-06 (Filtros do GET lista):** `page, limit, status, sentiment, urgency, category` (Zod com coerce + defaults `page=1, limit=10, max 100`).
- **D-07 (Logs):** `pino` com 2 transports — `pino-pretty` no terminal e JSON em `<raiz-do-serviço>/logs/app.log`; nível via `LOG_LEVEL`, segredos com `redact`. Zero `console.*` nos entrypoints.
- **D-08 (CWD e env):** rodar `npm/npx/prisma` sempre na pasta do serviço (`backend/`, `worker/`, `frontend/`) — a raiz não tem `package.json` e o `npx` baixa o Prisma 8 RC errado. Pré-requisito local: `cp .env.example .env` (raiz e `backend/`); arquivos `.env` nunca commitados.
- **D-09 (Docker):** `RUN npx prisma generate` exige `DATABASE_URL` resolvível no v7 → `backend/Dockerfile` usa `ARG` dummy (runtime usa a var do compose; `.env` está no `.dockerignore`).
- **D-10 (Git):** repo `herloncosta/ai-customer-insights-platform` (público); fluxo `main` (estável) + `develop` (integração); conventional commits (`feat/fix/chore` + escopo). Migrations do Prisma **devem** ser versionadas (nunca gitignored).
- **D-11 (Validação):** Zod `.strict()` nos inputs (anti mass-assignment); `email` normalizado para minúsculas; `content` 10–5000 chars.
- **D-12 (Estado em PROGRESS.md):** o que está pronto vs. pendente vive em `PROGRESS.md` (documento vivo) — atualizar a cada entrega.
