import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => ({ default: vi.fn() }));

import OpenAI from 'openai';
import { analyzeFeedback } from './lib/analyzer';

const MockedOpenAI = vi.mocked(OpenAI);

const ANALYSIS = {
  sentiment: 'NEGATIVE',
  urgency: 'HIGH',
  category: 'BUG',
  summary: 'Erro ao gerar relatório.',
  tags: ['erro'],
};

function mockCreate(impl: (...args: unknown[]) => unknown) {
  MockedOpenAI.mockImplementation(
    () =>
      ({
        chat: { completions: { create: vi.fn(impl) } },
      }) as unknown as InstanceType<typeof OpenAI>,
  );
}

function completion(content: unknown) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

afterEach(() => {
  vi.resetAllMocks();
  delete process.env.ANALYZER_PROVIDER;
});

describe('analyzeFeedback via OpenAI-compatível (SDK mockado)', () => {
  it('sucesso retorna análise normalizada', async () => {
    process.env.ANALYZER_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const create = vi.fn().mockResolvedValue(completion(ANALYSIS));
    mockCreate(create);
    const out = await analyzeFeedback('conteúdo qualquer suficiente');
    expect(out).toEqual(ANALYSIS);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('500 → retry com backoff e depois sucesso', async () => {
    process.env.ANALYZER_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('s1'), { status: 500 }))
      .mockRejectedValueOnce(Object.assign(new Error('s2'), { status: 503 }))
      .mockResolvedValue(completion(ANALYSIS));
    mockCreate(create);
    const out = await analyzeFeedback('conteúdo qualquer suficiente');
    expect(out.sentiment).toBe('NEGATIVE');
    expect(create).toHaveBeenCalledTimes(3);
  }, 15000);

  it('400 não retenta (falha direta)', async () => {
    process.env.ANALYZER_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const create = vi.fn().mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
    mockCreate(create);
    await expect(analyzeFeedback('conteúdo qualquer suficiente')).rejects.toThrow('bad');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
