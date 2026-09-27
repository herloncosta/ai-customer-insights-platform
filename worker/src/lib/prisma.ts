import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');

// Prisma 7 exige driver adapter em runtime (D-01).
const adapter = new PrismaMariaDb(DATABASE_URL);

export const prisma = new PrismaClient({ adapter });
