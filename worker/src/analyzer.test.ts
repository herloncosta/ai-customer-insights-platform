import { describe, expect, it } from 'vitest';
import { isRetryable, normalizeAnalysis } from './lib/analyzer';

describe('normalizeAnalysis', () => {
  it('aceita payload válido do structured output', () => {
    expect(
      normalizeAnalysis({
        sentiment: 'NEGATIVE',
        urgency: 'HIGH',
        category: 'BUG',
        summary: 'Erro 500 ao gerar relatórios financeiros hoje.',
        tags: ['erro 500', 'relatório'],
      }),
    ).toEqual({
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
      category: 'BUG',
      summary: 'Erro 500 ao gerar relatórios financeiros hoje.',
      tags: ['erro 500', 'relatório'],
    });
  });

  it('corta resumo em 20 palavras e saneia tags', () => {
    const long = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    const out = normalizeAnalysis({
      sentiment: 'POSITIVE',
      urgency: 'LOW',
      category: 'OTHER',
      summary: long,
      tags: [' ok ', '', 42, 'x'],
    });
    expect(out.summary.split(' ')).toHaveLength(20);
    expect(out.tags).toEqual(['ok', 'x']);
  });

  it('rejeita enum fora do contrato', () => {
    expect(() =>
      normalizeAnalysis({ sentiment: 'HAPPY', urgency: 'LOW', category: 'OTHER', summary: 's', tags: [] }),
    ).toThrow('sentiment inválido');
  });
});

describe('isRetryable', () => {
  it('transitórios true, cliente false', () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 401 })).toBe(false);
    expect(isRetryable(new Error('socket hang up'))).toBe(true);
  });
});
