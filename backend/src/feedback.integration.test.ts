import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import amqp from 'amqplib';
import { prisma } from '@insights/db';
import { createApp } from './app';

const app = createApp();
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const VALID = {
  customerName: 'Integração Silva',
  email: 'integracao@teste.com',
  content: 'Falha crítica no pagamento via boleto com conteúdo suficiente para validar.',
};

async function purgeQueue(): Promise<void> {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.purgeQueue('feedback_processing_queue').catch(() => undefined);
  await conn.close();
}

beforeAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  await purgeQueue();
});

afterAll(async () => {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  await purgeQueue();
  await prisma.$disconnect();
});

describe('POST /api/v1/feedbacks', () => {
  it('202 + PENDING + publica (202 inclui id real)', async () => {
    const res = await request(app).post('/api/v1/feedbacks').send(VALID).expect(202);
    expect(res.body.status).toBe('PENDING');
    const row = await prisma.feedback.findUnique({ where: { id: res.body.id } });
    expect(row?.status).toBe('PENDING');
    expect(row?.email).toBe(VALID.email);
  });

  it('400 em payload inválido', async () => {
    await request(app).post('/api/v1/feedbacks').send({ customerName: 'X' }).expect(400);
  });
});

describe('GETs', () => {
  it('lista com paginação, filtros e include analysis', async () => {
    const analyzed = await prisma.feedback.create({
      data: {
        ...VALID,
        customerName: 'Analisado Souza',
        status: 'PROCESSED',
        analysis: {
          create: {
            sentiment: 'NEGATIVE',
            urgency: 'HIGH',
            category: 'BILLING',
            summary: 'Cobrança indevida no boleto.',
            tags: ['boleto'],
          },
        },
      },
    });

    const all = await request(app).get('/api/v1/feedbacks').expect(200);
    expect(all.body.pagination.total).toBe(2);
    expect(all.body.data[0].analysis).toBeDefined();

    const pending = await request(app).get('/api/v1/feedbacks?status=PENDING').expect(200);
    expect(pending.body.pagination.total).toBe(1);

    const negative = await request(app).get('/api/v1/feedbacks?sentiment=NEGATIVE').expect(200);
    expect(negative.body.data[0].id).toBe(analyzed.id);

    const page = await request(app).get('/api/v1/feedbacks?page=2&limit=1').expect(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.pagination.totalPages).toBe(2);
  });

  it('GET /:id → 200, 404 e 400', async () => {
    const row = await prisma.feedback.findFirstOrThrow({ where: { status: 'PROCESSED' } });
    const ok = await request(app).get(`/api/v1/feedbacks/${row.id}`).expect(200);
    expect(ok.body.analysis.sentiment).toBe('NEGATIVE');
    await request(app).get('/api/v1/feedbacks/00000000-0000-4000-8000-000000000000').expect(404);
    await request(app).get('/api/v1/feedbacks/nao-uuid').expect(400);
  });

  it('CORS: origem estranha não recebe ACAO; origem certa recebe', async () => {
    const evil = await request(app).get('/api/v1/feedbacks/metrics').set('Origin', 'http://evil.com');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app)
      .get('/api/v1/feedbacks/metrics')
      .set('Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe(process.env.CORS_ORIGIN ?? 'http://localhost:5173');
  });

  it('GET /metrics com byDay de 14 dias', async () => {
    const res = await request(app).get('/api/v1/feedbacks/metrics').expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.bySentiment.NEGATIVE).toBe(1);
    expect(res.body.byUrgency.HIGH).toBe(1);
    expect(res.body.topTags).toEqual([{ tag: 'boleto', count: 1 }]);
    expect(res.body.byDay).toHaveLength(14);
  });

  // Por último: cria ~30 linhas de propósito (2 POSTs anteriores + 28 aqui).
  it('429 com mensagem de cota quando DAILY_ANALYSIS_LIMIT=0', async () => {
    process.env.DAILY_ANALYSIS_LIMIT = '0';
    const res = await request(app).post('/api/v1/feedbacks').send(VALID).expect(429);
    expect(res.body.error).toMatch(/Cota diária/);
    delete process.env.DAILY_ANALYSIS_LIMIT;
  });

  it('429 após 30 POSTs/min (protege custo da IA)', async () => {
    for (let i = 0; i < 28; i++) {
      await request(app).post('/api/v1/feedbacks').send(VALID);
    }
    await request(app).post('/api/v1/feedbacks').send(VALID).expect(429);
  }, 60000);
});
