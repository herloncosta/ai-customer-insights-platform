import amqp, { type Channel, type ChannelModel } from 'amqplib';
import { logger } from './logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const QUEUE = process.env.FEEDBACK_QUEUE ?? 'feedback_processing_queue';
const DLQ = process.env.FEEDBACK_DLQ ?? 'feedback_processing_queue.dlq';

let conn: ChannelModel | null = null;
let channel: Channel | null = null;

// Singleton preguiçoso: conecta uma vez, garante fila + DLQ (mesmos args do worker, D-05).
async function ensureChannel(): Promise<Channel> {
  if (!channel) {
    conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertQueue(DLQ, { durable: true });
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': DLQ },
    });
    channel.on('error', (err) => {
      logger.error({ err }, 'rabbitmq channel error — resetando singleton');
      channel = null;
    });
    conn.on('error', (err) => {
      logger.error({ err }, 'rabbitmq connection error — resetando singleton');
      channel = null;
      conn = null;
    });
  }
  return channel;
}

// Pré-aquece a conexão no boot para não cobrar o handshake da primeira requisição (RNF-01).
export async function initQueue(): Promise<void> {
  await ensureChannel();
  logger.info('rabbitmq conectado');
}

// Publica mensagens persistentes. RNF-01: publish é fire-and-forget (<100ms, sem aguardar IA).
export async function publishFeedback(feedbackId: string): Promise<void> {
  const ch = await ensureChannel();
  ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify({ feedbackId })), { persistent: true });
  logger.info({ feedbackId }, 'feedback publicado na fila');
}
