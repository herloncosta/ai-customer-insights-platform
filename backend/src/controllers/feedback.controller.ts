import type { Request, Response } from 'express';
import * as service from '../services/feedback.service';
import type { FeedbackWithAnalysis } from '@insights/db';
import { logger } from '../lib/logger';
import type { CreateFeedbackInput, FeedbackDto, FeedbackIdParam, ListFeedbacksQuery } from '../schemas/feedback.schema';

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as CreateFeedbackInput;
    const feedback = await service.createFeedback(input);
    res.status(202).json({
      id: feedback.id,
      status: feedback.status,
      message: 'Feedback recebido e enviado para análise.',
    });
  } catch (err) {
    logger.error({ err }, 'falha ao criar feedback');
    res.status(500).json({ error: 'Erro interno ao processar feedback.' });
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as ListFeedbacksQuery;
    const { rows, total, page, limit } = await service.listFeedbacks(query);
    res.status(200).json({
      data: rows.map(toFeedbackDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err }, 'falha ao listar feedbacks');
    res.status(500).json({ error: 'Erro interno ao listar feedbacks.' });
  }
}

export async function metrics(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await service.getMetrics());
  } catch (err) {
    logger.error({ err }, 'falha ao agregar métricas');
    res.status(500).json({ error: 'Erro interno ao agregar métricas.' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as unknown as FeedbackIdParam;
    const feedback = await service.getFeedbackById(id);
    if (!feedback) {
      res.status(404).json({ error: 'Feedback não encontrado.' });
      return;
    }
    res.status(200).json(toFeedbackDto(feedback));
  } catch (err) {
    logger.error({ err }, 'falha ao buscar feedback');
    res.status(500).json({ error: 'Erro interno ao buscar feedback.' });
  }
}

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
