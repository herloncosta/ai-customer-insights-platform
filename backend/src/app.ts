import express from 'express';
import cors from 'cors';
import { feedbackRouter } from './routes/feedback.routes';

export function createApp(): express.Express {
  const app = express();
  const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());

  // Healthcheck usado pelo docker-compose (backend -> wget /health)
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'backend' });
  });

  app.use('/api/v1/feedbacks', feedbackRouter);

  return app;
}
