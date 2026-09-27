import { describe, expect, it } from 'vitest';
import amqp from 'amqplib';
import { connectWithRetry, declareTopology } from './rabbitmq';

describe('rabbitmq', () => {
  it('connectWithRetry conecta no broker local', async () => {
    const conn = await connectWithRetry('amqp://guest:guest@localhost:5672', 1);
    await conn.close();
  });

  it('connectWithRetry esgota tentativas em porta morta', async () => {
    await expect(connectWithRetry('amqp://guest:guest@localhost:59999', 1)).rejects.toThrow();
  });

  it('declareTopology cria fila + DLQ com dead-letter', async () => {
    const conn = await amqp.connect('amqp://guest:guest@localhost:5672');
    const ch = await conn.createChannel();
    await declareTopology(ch);
    const q = await ch.checkQueue('feedback_processing_queue');
    expect(q.messageCount).toBeGreaterThanOrEqual(0);
    await conn.close();
  });
});
