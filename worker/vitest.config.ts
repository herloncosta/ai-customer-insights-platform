import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Banco de teste + analyzer determinístico (sem chave/cota).
process.env.DATABASE_URL ??=
  'mysql://insights_user:insightspass123@localhost:3306/insights_db_test';
process.env.ANALYZER_PROVIDER ??= 'mock';

export default defineConfig({
  resolve: { alias: { '@insights/db': path.resolve(__dirname, '../shared/src/index.ts') } },
  test: { include: ['src/**/*.test.ts'], testTimeout: 30000 },
  coverage: {
    provider: 'v8',
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts'],
    thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
  },
});
