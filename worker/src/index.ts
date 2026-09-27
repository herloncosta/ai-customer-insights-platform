import 'dotenv/config';
import { logger } from './lib/logger';
import { DLQ, QUEUE, RABBITMQ_URL, connectWithRetry, declareTopology } from './rabbitmq';
import { markFailed, processFeedback } from './feedback.processor';

async function main(): Promise<void> {
  if ((process.env.ANALYZER_PROVIDER ?? 'openai') === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não definida (ou use ANALYZER_PROVIDER=mock localmente)');
  }

  const conn = await connectWithRetry(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await declareTopology(ch);

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
        if (feedbackId) await markFailed(feedbackId);
        ch.nack(msg, false, false); // sem requeue: cai na DLQ
      }
    },
    { noAck: false },
  );
}

main().catch((err) => {
  logger.fatal({ err }, 'worker fatal');
  process.exit(1);
});
