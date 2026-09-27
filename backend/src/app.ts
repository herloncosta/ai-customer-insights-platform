import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { feedbackRouter } from './routes/feedback.routes';

export function createApp(): express.Express {
  const app = express();
  const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: (origin, cb) => cb(null, origin === CORS_ORIGIN ? origin : false) }));
  app.use(express.json());

  // Leitura folgada (o dashboard faz poll); escrita restrita (cada POST custa IA).
  const readLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 1200, standardHeaders: true });
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    message: { error: 'Muitas solicitações — aguarde um minuto.' },
  });

  // Remover quebra o healthcheck do compose — não é rota órfã.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'backend' });
  });

  app.use('/api/v1/feedbacks', readLimiter);
  app.post('/api/v1/feedbacks', writeLimiter);
  app.use('/api/v1/feedbacks', feedbackRouter);

  return app;
}
