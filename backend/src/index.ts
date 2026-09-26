import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { validate } from './middlewares/validate';
import { createFeedbackSchema, listFeedbacksQuerySchema } from './schemas/feedback.schema';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Healthcheck usado pelo docker-compose (backend -> wget /health)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'backend' });
});

// Placeholder RF-01 / RF-02 — implementação real entra na próxima etapa
app.post('/api/v1/feedbacks', validate(createFeedbackSchema, 'body'), (_req, res) => {
  // TODO: validar com Zod, salvar PENDING no MySQL, publicar em feedback_processing_queue
  res.status(202).json({
    id: 'pending-implementation',
    status: 'PENDING',
    message: 'Feedback recebido e enviado para análise.',
  });
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${PORT}`);
});
