import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

/**
 * Middleware genérico de validação (RNF-05).
 * Substitui req[source] pelo payload parseado e responde 400 em caso de erro.
 */
export function validate<T extends z.ZodTypeAny>(schema: T, source: RequestSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // req[source] é readonly no tipo do Express — atribuição via cast é intencional.
    (req as unknown as Record<RequestSource, unknown>)[source] = result.data;
    next();
  };
}
