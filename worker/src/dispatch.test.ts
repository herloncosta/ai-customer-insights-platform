import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type amqp from 'amqplib';
import { prisma } from '@insights/db';
import { dispatch } from './index';

function fakeChannel() {
  return { ack: vi.fn(), nack: vi.fn() };
}

function fakeMsg(payload: unknown): amqp.ConsumeMessage {
  return { content: Buffer.from(JSON.stringify(payload)) } as amqp.ConsumeMessage;
}

beforeAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
});

afterAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.$disconnect();
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
