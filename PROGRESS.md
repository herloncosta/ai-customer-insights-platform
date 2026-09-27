# PROGRESS — AI-Powered Customer Insights Platform

> Documento vivo de continuidade (ver AGENTS.md D-12). Qualquer agente/modelo deve
> ler este arquivo + `AGENTS.md` (§1–§6) antes de codar. Atualizar a cada entrega.

- Repo: `herloncosta/ai-customer-insights-platform` (público)
- Fluxo: `main` (estável) + `develop` (integração) · conventional commits
- Branch ativa de trabalho: `develop`

## 0. Onboarding em 5 passos

1. `git pull origin develop`
2. `cp .env.example .env` (raiz), `cp backend/.env.example backend/.env` e `cp worker/.env.example worker/.env` (`.env` nunca commitados; `OPENAI_API_KEY` + `OPENAI_BASE_URL` para OpenRouter no `.env` da raiz e do worker)
3. Workspace npm na raiz: `npm install` (lockfile único), `npm run generate --workspace shared`, `npm run build` (shared → backend → worker); migrate via `npm run migrate --workspace shared`
4. Subir tudo: `docker compose up --build` (backend/worker buildam com contexto da raiz)
5. Respeitar as decisões do AGENTS.md §6 (não reverter sem registrar nova decisão)

## 1. Estado atual

### ✅ Pronto

- [x] Monorepo + `docker-compose.yml` (mysql, rabbitmq, backend, worker, frontend) com healthchecks MySQL/RabbitMQ
- [x] `shared/prisma/schema.prisma` (fonte única, Feedback + Analysis §3) + `shared/prisma.config.ts` (Prisma 7.10); pacote `@insights/db` (workspace npm) com singleton `prisma` + tipos — backend/worker importam dele, zero drift de schema
- [x] Schemas Zod entrada/saída (`backend/src/schemas/feedback.schema.ts`) + middleware `validate` aplicado às rotas + 9 testes vitest
- [x] Logger `pino` no backend e worker (`src/lib/logger.ts`): terminal pretty + `<root>/logs/app.log`, `LOG_LEVEL`, `redact`
- [x] Worker scaffold: consumer com retry, fila + DLQ declaradas, tipos `amqplib` corrigidos (`ChannelModel`)
- [x] Upgrades Prisma v5 → v6 → v7 (commits `06f2d6b`, `e1e1da6`)
- [x] **F1 — camada DB backend:** `@prisma/adapter-mariadb` + `src/lib/prisma.ts` (adapter obrigatório v7) + `src/lib/queue.ts` (singleton publish persistente, mesmos args DLQ D-05) + `migrate dev --name init` aplicada (`prisma/migrations/20260927114545_init/`); `generator output` movido para `../src/generated/prisma` (exigência do `rootDir: src` do tsc — importar de `prisma/generated` quebra o build); smoke test OK (insert PENDING + publish + delete, fila purgada); `npm run build` + 9 testes vitest verdes
- [x] **Refactor backend em camadas:** `src/app.ts` (factory Express, `GET /health`) + `src/routes/feedback.routes.ts` + `src/controllers/feedback.controller.ts` (HTTP + `toFeedbackDto`) + `src/services/feedback.service.ts` (Prisma + fila); `src/index.ts` só com boot/warmup; tipos Prisma importados do client gerado (`FeedbackWithAnalysis`); smoke e2e pós-refactor OK

### ⏳ Pendente (ordem sugerida)

1. ~~`prisma migrate dev` inicial + camada DB~~ ✅ feito (F1 acima)
2. ~~`POST /api/v1/feedbacks` real~~ ✅ feito: salva `PENDING` → publica na fila → 202 (RF-01/RF-02); boot pré-aquece pool DB + AMQP (`initQueue`, RNF-01: ~90ms quente no sandbox, frio ~220ms)
3. ~~`GET` lista + `GET /:id` + `GET /metrics`~~ ✅ feito: lista com `page/limit/status/sentiment/urgency/category` + `include analysis` (mais recentes primeiro), `/:id` com 404/400, `metrics` com `total/bySentiment/byUrgency/topTags[10]`; serialização Date→ISO + Json→string[] (`toFeedbackDto`)
4. ~~Worker: OpenAI + transições + DLQ~~ ✅ feito: `worker/src/lib/analyzer.ts` (`gpt-4o-mini` structured output strict §5 + retry 3× backoff 1s/2s em 429/5xx/rede + `normalizeAnalysis` com teto 20 palavras) + consumer com `PROCESSING → (Analysis + PROCESSED) | FAILED`, idempotência via ack-skip + `upsert`, DLQ (RF-03/RF-04, RNF-03); `worker/Dockerfile` com generate (D-09); 4 testes vitest
- [x] **Worker em módulos:** `src/rabbitmq.ts` (conexão/retry + topologia/DLQ) + `src/feedback.processor.ts` (`processFeedback`, `markFailed`, idempotência) + `src/index.ts` só bootstrap; smoke e2e pós-split OK
- [x] **E2e real com OpenRouter:** `OPENAI_BASE_URL` no analyzer + compose + `.env.examples`; pipeline POST → `PROCESSED` com análise real (`NEGATIVE/HIGH/BUG`, resumo PT-BR) + redelivery sem duplicar + DLQ; `ANALYZER_PROVIDER=mock` segue para e2e sem cota
- [x] **RNF-06 validado:** `docker compose up --build` completo (mysql, rabbitmq, backend, worker, frontend) + `migrate:deploy` no boot do backend (stack sobe do zero); e2e POST → IA real → `PROCESSED` + frontend nginx 200
- [x] **Acesso LAN:** `CORS_ORIGIN` + `VITE_API_URL` no `.env` local apontando para o IP da máquina (`192.168.88.253`); `VITE_API_URL` é build-arg (rebuild do frontend ao trocar); CORS validado com `Origin` da LAN
5. ~~Frontend (RF-06)~~ ✅ feito + redesign UX: header fixo com indicador ao vivo, stat cards (total, aguardando IA, alta urgência, negativos), distribuições com barras, tabela com dots/pills, destaque em CRITICAL, `timeAgo`, skeleton, empty state, toast, erro com retry, layout form lateral + modal polido; Tailwind v4, sem libs extras
6. Testes de integração + cobertura ≥80% (RNF-04); criar configs ESLint/Prettier (o script `lint` existe, os arquivos de config ainda não)
7. Seed de desenvolvimento (`prisma db seed`)

## 2. Comandos por serviço

```bash
# raiz (workspace npm: backend + worker + shared)
npm install                          # lockfile único na raiz
npm run generate --workspace shared  # exige DATABASE_URL (dummy basta)
npm run build                        # shared → backend → worker
npm run migrate --workspace shared   # com DB no ar (shared/prisma/migrations/)
docker compose up --build

# backend/ e worker/ (importam @insights/db; sem prisma próprio)
npm run dev | npm run build | npm start
npx vitest run

# frontend/
npm install
npm run dev | npm run build
```

## 3. Gotchas (não quebrar)

- `npx prisma` na raiz baixa o Prisma 8 RC (produto diferente) — rodar via workspace: `npm run generate|migrate --workspace shared`
- `prisma generate` no v7 exige `DATABASE_URL` resolvível (no Docker, via `ARG` dummy — D-09)
- `new PrismaClient()` sem adapter lança erro no v7 (D-01); o singleton mora em `@insights/db` (`shared/src/index.ts`)
- Schema vive só em `shared/prisma/schema.prisma` — backend/worker importam `@insights/db`, nunca copiar (drift)
- `generator output` vive em `shared/src/generated/prisma`: `rootDir: src` do tsc proíbe importar de fora de `src/`; `.gitignore` cobre `shared/src/generated/` + `shared/dist/`
- `import { PrismaClient } from '@prisma/client'` **não funciona** no v7 (módulo `.prisma/client/default` ausente) — o shared reexporta do client gerado
- `PrismaMariaDb` aceita connection string direta: `new PrismaMariaDb(DATABASE_URL)`
- OpenRouter: `OPENAI_BASE_URL=https://openrouter.ai/api/v1` + model prefixado (`openai/gpt-4o-mini`); structured output `json_schema strict` passa pelo gateway
- `insights_user` precisa de `GRANT ALL PRIVILEGES ON *.*` (shadow DB do `migrate dev`, erro P3014) — comando: `docker exec insights-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'insights_user'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"`
