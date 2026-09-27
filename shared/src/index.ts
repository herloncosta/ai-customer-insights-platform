import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';
import type { Analysis, Feedback } from './generated/prisma/client';

// Fonte única de DB do monorepo (backend + worker importam daqui).
// Cada serviço roda em processo próprio, então cada um tem seu singleton.

function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida`);
  return value;
}

// Prisma 7 exige driver adapter em runtime (D-01) — sem ele, new PrismaClient() lança erro.
const adapter = new PrismaMariaDb(mustGetEnv('DATABASE_URL'));

export const prisma = new PrismaClient({ adapter });

export { PrismaClient };
export type { Analysis, Feedback };
export type FeedbackWithAnalysis = Feedback & { analysis: Analysis | null };
