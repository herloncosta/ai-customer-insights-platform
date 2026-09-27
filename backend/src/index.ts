import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validate } from './middlewares/validate';
import {
  createFeedbackSchema,
  listFeedbacksQuerySchema,
  type CreateFeedbackInput,
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

app.get('/api/v1/feedbacks', validate(listFeedbacksQuerySchema, 'query'), (_req, res) => {
  // TODO: paginação + filtros (status, sentiment, urgency) + include analysis
  res.status(200).json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
});

app.get('/api/v1/feedbacks/metrics', (_req, res) => {
  // TODO: RF-05 agregações por sentimento/urgência + topTags
  res.status(200).json({
    total: 0,
    bySentiment: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
    byUrgency: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  });
});

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
