# PROGRESS — AI-Powered Customer Insights Platform

> Documento vivo de continuidade (ver AGENTS.md D-12). Qualquer agente/modelo deve
> ler este arquivo + `AGENTS.md` (§1–§6) antes de codar. Atualizar a cada entrega.

- Repo: `herloncosta/ai-customer-insights-platform` (público)
- Fluxo: `main` (estável) + `develop` (integração) · conventional commits
- Branch ativa de trabalho: `develop`

## 0. Onboarding em 5 passos

1. `git pull origin develop`
2. `cp .env.example .env` (raiz) e `cp backend/.env.example backend/.env` (`.env` nunca commitados)
3. Rodar `npm/npx/prisma` **sempre dentro da pasta do serviço** (`backend/`, `worker/`, `frontend/`) — ver D-08
4. Subir tudo: `docker compose up --build`
5. Respeitar as decisões do AGENTS.md §6 (não reverter sem registrar nova decisão)

## 1. Estado atual

### ✅ Pronto

- [x] Monorepo + `docker-compose.yml` (mysql, rabbitmq, backend, worker, frontend) com healthchecks MySQL/RabbitMQ
- [x] `backend/prisma/schema.prisma` (Feedback + Analysis, §3) + `backend/prisma.config.ts` (Prisma 7.10)
- [x] Schemas Zod entrada/saída (`backend/src/schemas/feedback.schema.ts`) + middleware `validate` aplicado às rotas + 9 testes vitest
- [x] Logger `pino` no backend e worker (`src/lib/logger.ts`): terminal pretty + `<root>/logs/app.log`, `LOG_LEVEL`, `redact`
- [x] Worker scaffold: consumer com retry, fila + DLQ declaradas, tipos `amqplib` corrigidos (`ChannelModel`)
- [x] Upgrades Prisma v5 → v6 → v7 (commits `06f2d6b`, `e1e1da6`)
- [x] **F1 — camada DB backend:** `@prisma/adapter-mariadb` + `src/lib/prisma.ts` (adapter obrigatório v7) + `src/lib/queue.ts` (singleton publish persistente, mesmos args DLQ D-05) + `migrate dev --name init` aplicada (`prisma/migrations/20260927114545_init/`); `generator output` movido para `../src/generated/prisma` (exigência do `rootDir: src` do tsc — importar de `prisma/generated` quebra o build); smoke test OK (insert PENDING + publish + delete, fila purgada); `npm run build` + 9 testes vitest verdes

### ⏳ Pendente (ordem sugerida)

1. ~~`prisma migrate dev` inicial + camada DB~~ ✅ feito (F1 acima)
2. `POST /api/v1/feedbacks` real: Zod → salva `PENDING` → publica na fila (SLA <100ms, RF-02/RNF-01)
3. `GET` lista real (paginação + filtros D-06, include `analysis`) + `GET /:id` (D-04) + `GET /metrics` real (D-02)
4. Worker: OpenAI `gpt-4o-mini` structured output (§5) + transições `PROCESSING → PROCESSED/FAILED` + DLQ (RF-03/RF-04, retry backoff RNF-03)
5. Frontend (RF-06): form, tabela com filtros, modal de análise, dashboard de métricas
6. Testes de integração + cobertura ≥80% (RNF-04); criar configs ESLint/Prettier (o script `lint` existe, os arquivos de config ainda não)
7. Seed de desenvolvimento (`prisma db seed`)

## 2. Comandos por serviço

```bash
# raiz
docker compose up --build

# backend/
npm install
npx prisma validate          # exige DATABASE_URL (via .env)
npx prisma generate
npx prisma migrate dev       # quando houver DB (cria backend/prisma/migrations/)
npm run dev | npm run build | npm start
npx vitest run

# worker/
npm install
npm run dev | npm run build | npm start

# frontend/
npm install
npm run dev | npm run build
```

## 3. Gotchas (não quebrar)

- `npx prisma` na raiz baixa o Prisma 8 RC (produto diferente) — sempre dentro de `backend/`
- `prisma generate` no v7 exige `DATABASE_URL` resolvível (no Docker, via `ARG` dummy — D-09)
- `new PrismaClient()` sem adapter lança erro no v7 (D-01)
- Após criar/editar `.env`, recarregar a janela do VS Code (Prisma Language Server)
- Migrations **devem** ser commitadas (D-10)
- `generator output` vive em `backend/src/generated/prisma` (não em `prisma/generated`): `rootDir: src` do tsc proíbe importar de fora de `src/`; `.gitignore` cobre `backend/src/generated/`
- `import { PrismaClient } from '@prisma/client'` **não funciona** no v7 (módulo `.prisma/client/default` ausente) — importar de `../generated/prisma/client`
- `PrismaMariaDb` aceita connection string direta: `new PrismaMariaDb(DATABASE_URL)`
- `insights_user` precisa de `GRANT ALL PRIVILEGES ON *.*` (shadow DB do `migrate dev`, erro P3014) — comando: `docker exec insights-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'insights_user'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"`
