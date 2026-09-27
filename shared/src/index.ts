import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';
import type { Analysis, Feedback } from './generated/prisma/client';

// Backend e worker importam o singleton daqui — o schema tem fonte única, sem drift.

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
