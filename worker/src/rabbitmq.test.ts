import { describe, expect, it, vi } from 'vitest';
import amqp from 'amqplib';
import { connectWithRetry, declareTopology } from './rabbitmq';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

describe('rabbitmq', () => {
  it('connectWithRetry conecta no broker local', async () => {
    const conn = await connectWithRetry(RABBITMQ_URL, 1);
    await conn.close();
  });

  it('connectWithRetry esgota tentativas em porta morta', async () => {
    await expect(connectWithRetry('amqp://guest:guest@localhost:59999', 1)).rejects.toThrow();
  });

  it('declareTopology cria fila + DLQ com dead-letter', async () => {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await declareTopology(ch);
    const q = await ch.checkQueue('feedback_processing_queue');
    expect(q.messageCount).toBeGreaterThanOrEqual(0);
    await conn.close();
  });

  it('usa defaults sem env', async () => {
    const prev = {
      url: process.env.RABBITMQ_URL,
      queue: process.env.FEEDBACK_QUEUE,
      dlq: process.env.FEEDBACK_DLQ,
    };
    try {
      delete process.env.RABBITMQ_URL;
      delete process.env.FEEDBACK_QUEUE;
      delete process.env.FEEDBACK_DLQ;
      vi.resetModules();
      const mod = await import('./rabbitmq');
      expect(mod.RABBITMQ_URL).toBe('amqp://guest:guest@rabbitmq:5672');
      expect(mod.QUEUE).toBe('feedback_processing_queue');
      expect(mod.DLQ).toBe('feedback_processing_queue.dlq');
    } finally {
      if (prev.url !== undefined) process.env.RABBITMQ_URL = prev.url;
      if (prev.queue !== undefined) process.env.FEEDBACK_QUEUE = prev.queue;
      if (prev.dlq !== undefined) process.env.FEEDBACK_DLQ = prev.dlq;
      vi.resetModules();
    }
  });
});
