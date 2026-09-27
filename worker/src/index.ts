import 'dotenv/config';
import amqp from 'amqplib';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { analyzeFeedback } from './lib/analyzer';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672';
const QUEUE = process.env.FEEDBACK_QUEUE ?? 'feedback_processing_queue';
const DLQ = process.env.FEEDBACK_DLQ ?? 'feedback_processing_queue.dlq';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connectWithRetry(url: string, attempts = 10): Promise<amqp.ChannelModel> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await amqp.connect(url);
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt: i, attempts }, 'rabbitmq connection failed, retrying');
      await sleep(3000);
    }
  }
  throw lastError;
}

// RF-03/RF-04: PROCESSING → IA → (Analysis + PROCESSED) | FAILED.
// Idempotente (RNF-03): redelivery de um já PROCESSADO só dá ack.
async function processFeedback(feedbackId: string): Promise<void> {
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { analysis: true },
  });
  if (!existing) throw new Error(`feedback ${feedbackId} não encontrado`);
  if (existing.status === 'PROCESSED' && existing.analysis) {
    logger.info({ feedbackId }, 'já processado — ack sem duplicar');
    return;
  }

  await prisma.feedback.update({ where: { id: feedbackId }, data: { status: 'PROCESSING' } });
  const result = await analyzeFeedback(existing.content);
  await prisma.$transaction([
    prisma.analysis.upsert({
      where: { feedbackId },
      create: { feedbackId, ...result },
      update: { ...result },
    }),
    prisma.feedback.update({ where: { id: feedbackId }, data: { status: 'PROCESSED' } }),
  ]);
  logger.info({ feedbackId, ...result }, 'feedback processado');
}

async function main(): Promise<void> {
  // Fail fast: sem chave não há como cumprir RF-03 — melhor nem consumir.
  if ((process.env.ANALYZER_PROVIDER ?? 'openai') === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não definida (ou use ANALYZER_PROVIDER=mock localmente)');
  }

  const conn = await connectWithRetry(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Fila principal + DLQ (RF-04, D-05). DLQ declarada aqui para bootstrap local.
  await ch.assertQueue(DLQ, { durable: true });
  await ch.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': DLQ },
  });
  await ch.prefetch(1);

  logger.info({ queue: QUEUE, dlq: DLQ }, 'waiting for messages');

  await ch.consume(
    QUEUE,
    async (msg) => {
      if (!msg) return;
      let feedbackId: string | undefined;
      try {
        feedbackId = (JSON.parse(msg.content.toString()) as { feedbackId?: string }).feedbackId;
        if (!feedbackId) throw new Error('payload sem feedbackId');
        await processFeedback(feedbackId);
        ch.ack(msg);
      } catch (err) {
        logger.error({ err, feedbackId }, 'processing failed, sending to DLQ');
        if (feedbackId) {
          await prisma.feedback
            .update({ where: { id: feedbackId }, data: { status: 'FAILED' } })
            .catch((dbErr) => logger.warn({ dbErr }, 'não foi possível marcar FAILED'));
        }
        ch.nack(msg, false, false); // false = não requeue -> cai na DLQ via x-dead-letter
      }
    },
    { noAck: false },
  );
}

main().catch((err) => {
  logger.fatal({ err }, 'worker fatal');
  process.exit(1);
});
