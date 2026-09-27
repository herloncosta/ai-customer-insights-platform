import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type amqp from 'amqplib';
import { prisma } from '@insights/db';
import { assertAnalyzerConfigured, dispatch } from './index';

function fakeChannel() {
  return { ack: vi.fn(), nack: vi.fn() };
}

function fakeMsg(payload: unknown): amqp.ConsumeMessage {
  return { content: Buffer.from(JSON.stringify(payload)) } as amqp.ConsumeMessage;
}

beforeAll(async () => {
  process.env.ANALYZER_PROVIDER = 'mock';
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
});

afterAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.$disconnect();
});

describe('assertAnalyzerConfigured', () => {
  it('lança sem chave no provider openai; passa com mock ou chave', () => {
    const prevProvider = process.env.ANALYZER_PROVIDER;
    const prevKey = process.env.OPENAI_API_KEY;
    try {
      process.env.ANALYZER_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY;
      expect(() => assertAnalyzerConfigured()).toThrow('OPENAI_API_KEY');
      process.env.OPENAI_API_KEY = 'k';
      expect(() => assertAnalyzerConfigured()).not.toThrow();
      process.env.ANALYZER_PROVIDER = 'mock';
      delete process.env.OPENAI_API_KEY;
      expect(() => assertAnalyzerConfigured()).not.toThrow();
    } finally {
      if (prevProvider === undefined) delete process.env.ANALYZER_PROVIDER;
      else process.env.ANALYZER_PROVIDER = prevProvider;
      if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
    }
  });
});

describe('dispatch', () => {
  it('processa e dá ack', async () => {
    const fb = await prisma.feedback.create({
      data: { customerName: 'Dispatch', email: 'd@teste.com', content: 'Conteúdo para teste do dispatch aqui mesmo.' },
    });
    const ch = fakeChannel();
    await dispatch(ch, fakeMsg({ feedbackId: fb.id }));
    expect(ch.ack).toHaveBeenCalledTimes(1);
    const row = await prisma.feedback.findUniqueOrThrow({ where: { id: fb.id } });
    expect(row.status).toBe('PROCESSED');
  });

  it('payload inválido → nack sem FAILED', async () => {
    const ch = fakeChannel();
    await dispatch(ch, { content: Buffer.from('não-json') } as amqp.ConsumeMessage);
    expect(ch.nack).toHaveBeenCalledWith(expect.anything(), false, false);
    expect(ch.ack).not.toHaveBeenCalled();
  });

  it('id inexistente → FAILED + nack', async () => {
    const ch = fakeChannel();
    await dispatch(ch, fakeMsg({ feedbackId: '00000000-0000-4000-8000-000000000000' }));
    expect(ch.nack).toHaveBeenCalledTimes(1);
  });

  it('msg nula não faz nada', async () => {
    const ch = fakeChannel();
    await dispatch(ch, null);
    expect(ch.ack).not.toHaveBeenCalled();
    expect(ch.nack).not.toHaveBeenCalled();
  });
});
