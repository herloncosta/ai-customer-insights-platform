import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@insights/db';
import { markFailed, processFeedback } from './feedback.processor';

beforeAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
});

afterAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.$disconnect();
});

describe('processFeedback (ANALYZER_PROVIDER=mock)', () => {
  it('PENDING → PROCESSING → PROCESSED com analysis', async () => {
    const fb = await prisma.feedback.create({
      data: {
        customerName: 'Worker Teste',
        email: 'worker@teste.com',
        content: 'Conteúdo suficiente para o processamento de teste do worker aqui.',
      },
    });
    await processFeedback(fb.id);
    const done = await prisma.feedback.findUniqueOrThrow({
      where: { id: fb.id },
      include: { analysis: true },
    });
    expect(done.status).toBe('PROCESSED');
    expect(done.analysis).toMatchObject({ sentiment: 'NEUTRAL', urgency: 'LOW' });
  });

  it('redelivery de PROCESSED não duplica (idempotente)', async () => {
    const fb = await prisma.feedback.findFirstOrThrow({ where: { customerName: 'Worker Teste' } });
    await processFeedback(fb.id);
    expect(await prisma.analysis.count({ where: { feedbackId: fb.id } })).toBe(1);
  });

  it('feedback inexistente lança erro', async () => {
    await expect(processFeedback('00000000-0000-4000-8000-000000000000')).rejects.toThrow('não encontrado');
  });

  it('markFailed marca FAILED; em id inexistente não lança', async () => {
    const fb = await prisma.feedback.create({
      data: {
        customerName: 'Falha Teste',
        email: 'f@teste.com',
        content: 'Conteúdo para marcar falha de teste aqui mesmo.',
      },
    });
    await markFailed(fb.id);
    const row = await prisma.feedback.findUniqueOrThrow({ where: { id: fb.id } });
    expect(row.status).toBe('FAILED');
    await expect(markFailed('00000000-0000-4000-8000-000000000000')).resolves.toBeUndefined();
  });
});
