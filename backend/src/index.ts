import 'dotenv/config';
import { createApp } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { initQueue } from './lib/queue';

const PORT = Number(process.env.PORT ?? 3001);

// Pré-aquece pool DB + conexão AMQP no boot para não cobrar handshakes da 1ª requisição (RNF-01).
async function start(): Promise<void> {
  try {
    await prisma.$connect();
    await initQueue();
  } catch (err) {
    logger.warn({ err }, 'warmup parcial — singletons recuperam por requisição');
  }
  createApp().listen(PORT, () => {
    logger.info({ port: PORT }, 'backend listening');
  });
}

void start();
