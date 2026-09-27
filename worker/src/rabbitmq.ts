import amqp from 'amqplib';
import { logger } from './lib/logger';

export const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672';
export const QUEUE = process.env.FEEDBACK_QUEUE ?? 'feedback_processing_queue';
export const DLQ = process.env.FEEDBACK_DLQ ?? 'feedback_processing_queue.dlq';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function connectWithRetry(url: string, attempts = 10): Promise<amqp.ChannelModel> {
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

// DLQ declarada no consumer para bootstrap local.
export async function declareTopology(ch: amqp.Channel): Promise<void> {
  await ch.assertQueue(DLQ, { durable: true });
  await ch.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': DLQ },
  });
  await ch.prefetch(1);
}
