import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Credenciais locais (senhas rotacionadas, nunca commitadas) — o banco é FORÇADO
// para teste (derivado da URL local, trocando só o database), nunca o de dev.
// Analyzer determinístico (sem chave/cota).
dotenv.config({ path: path.join(__dirname, '.env') });
const baseUrl =
  process.env.DATABASE_URL ?? 'mysql://insights_user:insightspass123@localhost:3306/insights_db';
process.env.DATABASE_URL = baseUrl.replace(/\/[^/?]*(\?|$)/, '/insights_db_test$1');
// Forçado (não ??=): o .env local pode ter openai real, mas teste nunca chama a API.
process.env.ANALYZER_PROVIDER = 'mock';

export default defineConfig({
  resolve: { alias: { '@insights/db': path.resolve(__dirname, '../shared/src/index.ts') } },
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    // Testes dividem o mesmo banco/fila — paralelismo entre arquivos causa flake.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  coverage: {
    provider: 'v8',
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts'],
    thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
  },
});
