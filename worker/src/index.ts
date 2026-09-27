import 'dotenv/config';
import type amqp from 'amqplib';
import { logger } from './lib/logger';
import { DLQ, QUEUE, RABBITMQ_URL, connectWithRetry, declareTopology } from './rabbitmq';
import { markFailed, processFeedback } from './feedback.processor';

type AckChannel = {
  ack(msg: amqp.ConsumeMessage): void;
  nack(msg: amqp.ConsumeMessage, allUpTo: boolean, requeue: boolean): void;
};

// Corpo do consumer extraído para ser testável sem broker.
export async function dispatch(channel: AckChannel, msg: amqp.ConsumeMessage | null): Promise<void> {
  if (!msg) return;
  let feedbackId: string | undefined;
  try {
    feedbackId = (JSON.parse(msg.content.toString()) as { feedbackId?: string }).feedbackId;
    if (!feedbackId) throw new Error('payload sem feedbackId');
    await processFeedback(feedbackId);
    channel.ack(msg);
  } catch (err) {
    logger.error({ err, feedbackId }, 'processing failed, sending to DLQ');
    if (feedbackId) await markFailed(feedbackId);
    channel.nack(msg, false, false); // sem requeue: cai na DLQ
  }
}

async function main(): Promise<void> {
  assertAnalyzerConfigured();

  const conn = await connectWithRetry(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await declareTopology(ch);

  logger.info({ queue: QUEUE, dlq: DLQ }, 'waiting for messages');

  await ch.consume(QUEUE, (msg) => void dispatch(ch, msg), { noAck: false });
}

// Fail fast: sem chave não há como cumprir a classificação — melhor nem consumir.
export function assertAnalyzerConfigured(): void {
  if ((process.env.ANALYZER_PROVIDER ?? 'openai') === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não definida (ou use ANALYZER_PROVIDER=mock localmente)');
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'worker fatal');
  process.exit(1);
});
