import OpenAI from 'openai';
import { logger } from './logger';

export type AnalysisResult = {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'BUG' | 'FEATURE_REQUEST' | 'BILLING' | 'USABILITY' | 'OTHER';
  summary: string;
  tags: string[];
};

const SYSTEM_PROMPT = `Você é um motor de IA especializado em classificação de suporte ao cliente.
Analise a mensagem e retorne EXATAMENTE um objeto JSON seguindo o schema informado, sem textos adicionais.`;

// Schema §5 do AGENTS.md — strict impõe os enums no próprio modelo.
const ANALYSIS_JSON_SCHEMA = {
  name: 'feedback_analysis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      sentiment: { type: 'string', enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] },
      urgency: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      category: {
        type: 'string',
        enum: ['BUG', 'FEATURE_REQUEST', 'BILLING', 'USABILITY', 'OTHER'],
      },
      summary: { type: 'string', description: 'Resumo em no máximo 20 palavras' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['sentiment', 'urgency', 'category', 'summary', 'tags'],
    additionalProperties: false,
  },
} as const;

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Transitório (rede, 429, 5xx) → retry com backoff (RNF-03). 4xx → falha direta.
export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

const SENTIMENTS = new Set(['POSITIVE', 'NEGATIVE', 'NEUTRAL']);
const URGENCIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const CATEGORIES = new Set(['BUG', 'FEATURE_REQUEST', 'BILLING', 'USABILITY', 'OTHER']);

// Garante o contrato RF-03 mesmo se o modelo extrapolar: enums validados,
// resumo cortado em 20 palavras / 255 chars (limite da coluna), tags saneadas.
export function normalizeAnalysis(raw: unknown): AnalysisResult {
  const r = raw as Record<string, unknown>;
  if (!r || !SENTIMENTS.has(r.sentiment as string)) throw new Error('sentiment inválido');
  if (!URGENCIES.has(r.urgency as string)) throw new Error('urgency inválida');
  if (!CATEGORIES.has(r.category as string)) throw new Error('category inválida');
  const summary = String(r.summary ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 20)
    .join(' ')
    .slice(0, 255);
  const tags = (Array.isArray(r.tags) ? r.tags : [])
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
  return {
    sentiment: r.sentiment as AnalysisResult['sentiment'],
    urgency: r.urgency as AnalysisResult['urgency'],
    category: r.category as AnalysisResult['category'],
    summary,
    tags,
  };
}

export async function analyzeFeedback(content: string): Promise<AnalysisResult> {
  // E2e local sem chave/cota: ANALYZER_PROVIDER=mock retorna análise fixa.
  if (process.env.ANALYZER_PROVIDER === 'mock') {
    return normalizeAnalysis({
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
      category: 'OTHER',
      summary: content.split(/\s+/).filter(Boolean).slice(0, 20).join(' '),
      tags: ['mock'],
    });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30_000,
    maxRetries: 0, // retry manual com backoff abaixo
  });
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        response_format: { type: 'json_schema', json_schema: ANALYSIS_JSON_SCHEMA },
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
      return normalizeAnalysis(parsed);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS) throw err;
      const backoff = 1000 * 2 ** (attempt - 1);
      logger.warn({ attempt, backoff, err }, 'openai falhou (transitório), retentando');
      await sleep(backoff);
    }
  }
  throw lastError;
}
