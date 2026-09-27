const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export type Status = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Analysis {
  sentiment: Sentiment;
  urgency: Urgency;
  category: string;
  summary: string;
  tags: string[];
}

export interface Feedback {
  id: string;
  customerName: string;
  email: string;
  content: string;
  status: Status;
  createdAt: string;
  analysis: Analysis | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Metrics {
  total: number;
  bySentiment: Record<Sentiment, number>;
  byUrgency: Record<Urgency, number>;
  topTags: { tag: string; count: number }[];
  byDay: { date: string; total: number }[];
}

export interface Filters {
  status?: string;
  sentiment?: string;
  urgency?: string;
  page?: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function createFeedback(input: { customerName: string; email: string; content: string }) {
  return req<{ id: string; status: Status }>('/feedbacks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listFeedbacks(filters: Filters) {
  const params = new URLSearchParams({ limit: '10' });
  for (const [k, v] of Object.entries({ ...filters, page: String(filters.page ?? 1) })) {
    if (v) params.set(k, v);
  }
  return req<{ data: Feedback[]; pagination: Pagination }>(`/feedbacks?${params}`);
}

export function getMetrics() {
  return req<Metrics>('/feedbacks/metrics');
}
