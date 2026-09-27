import { prisma } from '../lib/prisma';
import { publishFeedback } from '../lib/queue';
import type { Analysis, Feedback } from '../generated/prisma/client';
import type { CreateFeedbackInput, ListFeedbacksQuery } from '../schemas/feedback.schema';

export type FeedbackWithAnalysis = Feedback & { analysis: Analysis | null };

// RF-01 + RF-02: persiste PENDING e publica na fila (a IA roda no worker, fora da requisição).
export async function createFeedback(input: CreateFeedbackInput): Promise<Feedback> {
  const feedback = await prisma.feedback.create({ data: input });
  await publishFeedback(feedback.id);
  return feedback;
}

export async function listFeedbacks(query: ListFeedbacksQuery): Promise<{
  rows: FeedbackWithAnalysis[];
  total: number;
  page: number;
  limit: number;
}> {
  const { page, limit, status, sentiment, urgency, category } = query;
  const where = {
    status,
    analysis: sentiment ?? urgency ?? category ? { is: { sentiment, urgency, category } } : undefined,
  };
  const [total, rows] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { rows, total, page, limit };
}

export async function getFeedbackById(id: string): Promise<FeedbackWithAnalysis | null> {
  return prisma.feedback.findUnique({ where: { id }, include: { analysis: true } });
}

// RF-05: agregados para o dashboard (D-02 inclui topTags).
export async function getMetrics(): Promise<{
  total: number;
  bySentiment: { POSITIVE: number; NEUTRAL: number; NEGATIVE: number };
  byUrgency: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  topTags: { tag: string; count: number }[];
}> {
  const [total, bySentiment, byUrgency, tagRows] = await Promise.all([
    prisma.feedback.count(),
    prisma.analysis.groupBy({ by: ['sentiment'], _count: true }),
    prisma.analysis.groupBy({ by: ['urgency'], _count: true }),
    prisma.analysis.findMany({ select: { tags: true } }),
  ]);
  // ponytail: contagem de tags em JS (O(n)); migrar para SQL JSON_TABLE se o volume importar
  const tagCounts = new Map<string, number>();
  for (const { tags } of tagRows) {
    for (const tag of Array.isArray(tags) ? (tags as string[]) : []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const sentiment = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  for (const g of bySentiment) sentiment[g.sentiment] = g._count;
  const urgency = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const g of byUrgency) urgency[g.urgency] = g._count;
  return {
    total,
    bySentiment: sentiment,
    byUrgency: urgency,
    topTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
