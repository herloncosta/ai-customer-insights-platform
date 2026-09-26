import 'dotenv/config';
import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672';
const QUEUE = process.env.FEEDBACK_QUEUE ?? 'feedback_processing_queue';
const DLQ = process.env.FEEDBACK_DLQ ?? 'feedback_processing_queue.dlq';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connectWithRetry(url: string, attempts = 10): Promise<amqp.Connection> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await amqp.connect(url);
    } catch (err) {
      lastError = err;
      // eslint-disable-next-line no-console
      console.log(`[worker] rabbitmq connect attempt ${i}/${attempts} failed, retrying...`);
      await sleep(3000);
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  const conn = await connectWithRetry(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Fila principal + DLQ (RF-04). DLQ declarada aqui para bootstrap local.
  await ch.assertQueue(DLQ, { durable: true });
  await ch.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': DLQ },
  });
  await ch.prefetch(1);

  // eslint-disable-next-line no-console
  console.log(`[worker] waiting on "${QUEUE}" (dlq="${DLQ}")`);

  await ch.consume(
    QUEUE,
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString()) as { feedbackId?: string };
        // eslint-disable-next-line no-console
        console.log(`[worker] received feedbackId=${payload.feedbackId ?? 'unknown'}`);
        // TODO RF-03: PENDING -> PROCESSING, chamar OpenAI gpt-4o-mini (structured output),
        // TODO RF-04: persistir Analysis + PROCESSED, ou FAILED + nack -> DLQ em erro
        ch.ack(msg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[worker] processing failed, sending to DLQ', err);
        ch.nack(msg, false, false); // false = não requeue -> cai na DLQ via x-dead-letter
      }
    },
    { noAck: false },
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[worker] fatal', err);
  process.exit(1);
});
