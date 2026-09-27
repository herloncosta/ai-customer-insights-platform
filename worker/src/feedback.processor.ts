import { prisma } from '@insights/db';
import { analyzeFeedback } from './lib/analyzer';
import { logger } from './lib/logger';

// RF-03/RF-04: PROCESSING → IA → (Analysis + PROCESSED).
// Idempotente (RNF-03): redelivery de um já PROCESSADO só dá ack.
export async function processFeedback(feedbackId: string): Promise<void> {
  const existing = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { analysis: true },
  });
  if (!existing) throw new Error(`feedback ${feedbackId} não encontrado`);
  if (existing.status === 'PROCESSED' && existing.analysis) {
    logger.info({ feedbackId }, 'já processado — ack sem duplicar');
    return;
  }

  await prisma.feedback.update({ where: { id: feedbackId }, data: { status: 'PROCESSING' } });
  const result = await analyzeFeedback(existing.content);
  await prisma.$transaction([
    prisma.analysis.upsert({
      where: { feedbackId },
      create: { feedbackId, ...result },
      update: { ...result },
    }),
    prisma.feedback.update({ where: { id: feedbackId }, data: { status: 'PROCESSED' } }),
  ]);
  logger.info({ feedbackId, ...result }, 'feedback processado');
}

// Caminho de falha: marca FAILED sem nunca quebrar o nack → DLQ.
export async function markFailed(feedbackId: string): Promise<void> {
  await prisma.feedback
    .update({ where: { id: feedbackId }, data: { status: 'FAILED' } })
    .catch((dbErr) => logger.warn({ dbErr }, 'não foi possível marcar FAILED'));
}
