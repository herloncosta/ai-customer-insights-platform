import { describe, expect, it } from 'vitest';
import {
  createFeedbackResponseSchema,
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbacksQuerySchema,
  metricsSchema,
} from './feedback.schema';

const validBody = {
  customerName: 'John Doe',
  email: 'John@Example.com',
  content: 'O sistema apresenta erro 500 ao gerar relatório financeiro desde hoje de manhã.',
};

describe('createFeedbackSchema', () => {
  it('aceita payload válido e normaliza email para minúsculas', () => {
    const parsed = createFeedbackSchema.parse(validBody);
    expect(parsed.email).toBe('john@example.com');
    expect(parsed.customerName).toBe('John Doe');
  });

  it('rejeita email inválido', () => {
    expect(() => createFeedbackSchema.parse({ ...validBody, email: 'nao-e-email' })).toThrow();
  });

  it('rejeita content curto (< 10 chars)', () => {
    expect(() => createFeedbackSchema.parse({ ...validBody, content: 'curto' })).toThrow();
  });

  it('rejeita chaves desconhecidas (strict / mass assignment)', () => {
    expect(() => createFeedbackSchema.parse({ ...validBody, role: 'admin' })).toThrow();
  });
});

describe('listFeedbacksQuerySchema', () => {
  it('aplica defaults page=1 limit=10 e converte strings', () => {
    expect(listFeedbacksQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
    });
    const parsed = listFeedbacksQuerySchema.parse({
      page: '2',
      limit: '25',
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
  });

  it('rejeita enum inválido e limit > 100', () => {
    expect(() => listFeedbacksQuerySchema.parse({ sentiment: 'ANGRY' })).toThrow();
    expect(() => listFeedbacksQuerySchema.parse({ limit: '101' })).toThrow();
  });
});

describe('feedbackIdParamSchema', () => {
  it('aceita UUID e rejeita id malformado', () => {
    expect(() => feedbackIdParamSchema.parse({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })).not.toThrow();
    expect(() => feedbackIdParamSchema.parse({ id: '123' })).toThrow();
  });
});

describe('output schemas (contratos §4)', () => {
  it('createFeedbackResponse aceita 202 do contrato', () => {
    expect(() =>
      createFeedbackResponseSchema.parse({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'PENDING',
        message: 'Feedback recebido e enviado para análise.',
      }),
    ).not.toThrow();
  });

  it('metrics exige topTags (RF-05)', () => {
    const base = {
      total: 150,
      bySentiment: { POSITIVE: 80, NEUTRAL: 30, NEGATIVE: 40 },
      byUrgency: { LOW: 50, MEDIUM: 60, HIGH: 30, CRITICAL: 10 },
      topTags: [{ tag: 'erro 500', count: 12 }],
      byDay: Array.from({ length: 14 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, total: i })),
    };
    expect(() => metricsSchema.parse(base)).not.toThrow();
    const withoutTags = { ...base };
    delete (withoutTags as { topTags?: unknown }).topTags;
    expect(() => metricsSchema.parse(withoutTags)).toThrow();
  });
});
