import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validate } from './middlewares/validate';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbacksQuerySchema,
  type AnalysisDto,
  type CreateFeedbackInput,
  type FeedbackDto,
  type FeedbackIdParam,
  type ListFeedbacksQuery,
} from './schemas/feedback.schema';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { initQueue, publishFeedback } from './lib/queue';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Healthcheck usado pelo docker-compose (backend -> wget /health)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'backend' });
});

// RF-01 + RF-02: salva PENDING e publica na fila (RNF-01: responde 202 sem aguardar a IA).
app.post('/api/v1/feedbacks', validate(createFeedbackSchema, 'body'), async (req, res) => {
  try {
    const { customerName, email, content } = req.body as CreateFeedbackInput;
    const feedback = await prisma.feedback.create({ data: { customerName, email, content } });
    await publishFeedback(feedback.id);
    res.status(202).json({
      id: feedback.id,
      status: feedback.status,
      message: 'Feedback recebido e enviado para análise.',
    });
  } catch (err) {
    logger.error({ err }, 'falha ao criar feedback');
    res.status(500).json({ error: 'Erro interno ao processar feedback.' });
  }
});

app.get('/api/v1/feedbacks', validate(listFeedbacksQuerySchema, 'query'), async (req, res) => {
  try {
    const { page, limit, status, sentiment, urgency, category } = req.query as unknown as ListFeedbacksQuery;
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
    res.status(200).json({
      data: rows.map(toFeedbackDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err }, 'falha ao listar feedbacks');
    res.status(500).json({ error: 'Erro interno ao listar feedbacks.' });
  }
});

// RF-01 leitura unitária (D-04). Registrada antes de /:id para não colidir.
app.get('/api/v1/feedbacks/metrics', async (_req, res) => {
  try {
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
    res.status(200).json({
      total,
      bySentiment: sentiment,
      byUrgency: urgency,
      topTags: [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch (err) {
    logger.error({ err }, 'falha ao agregar métricas');
    res.status(500).json({ error: 'Erro interno ao agregar métricas.' });
  }
});

app.get('/api/v1/feedbacks/:id', validate(feedbackIdParamSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params as unknown as FeedbackIdParam;
    const feedback = await prisma.feedback.findUnique({ where: { id }, include: { analysis: true } });
    if (!feedback) {
      res.status(404).json({ error: 'Feedback não encontrado.' });
      return;
    }
    res.status(200).json(toFeedbackDto(feedback));
  } catch (err) {
    logger.error({ err }, 'falha ao buscar feedback');
    res.status(500).json({ error: 'Erro interno ao buscar feedback.' });
  }
});

type FeedbackWithAnalysis = {
  id: string;
  customerName: string;
  email: string;
  content: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  createdAt: Date;
  analysis: {
    sentiment: AnalysisDto['sentiment'];
    urgency: AnalysisDto['urgency'];
    category: AnalysisDto['category'];
    summary: string;
    tags: unknown;
  } | null;
};

// Prisma devolve Date/Json; o contrato §4.2 exige ISO string + string[].
function toFeedbackDto(f: FeedbackWithAnalysis): FeedbackDto {
  return {
    id: f.id,
    customerName: f.customerName,
    email: f.email,
    content: f.content,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    analysis: f.analysis
      ? {
          sentiment: f.analysis.sentiment,
          urgency: f.analysis.urgency,
          category: f.analysis.category,
          summary: f.analysis.summary,
          tags: Array.isArray(f.analysis.tags) ? (f.analysis.tags as string[]) : [],
        }
      : null,
  };
}

// Pré-aquece pool DB + conexão AMQP no boot para não cobrar handshakes da 1ª requisição (RNF-01).
async function start(): Promise<void> {
  try {
    await prisma.$connect();
    await initQueue();
  } catch (err) {
    logger.warn({ err }, 'warmup parcial — singletons recuperam por requisição');
  }
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'backend listening');
  });
}

void start();
