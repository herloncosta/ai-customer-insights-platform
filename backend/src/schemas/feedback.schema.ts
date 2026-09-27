import { z } from 'zod';

// Espelham 1:1 os enums do prisma — mudar aqui exige mudar lá.

export const statusSchema = z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']);

export const sentimentSchema = z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']);

export const urgencySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const categorySchema = z.enum(['BUG', 'FEATURE_REQUEST', 'BILLING', 'USABILITY', 'OTHER']);

export const createFeedbackSchema = z
  .object({
    customerName: z
      .string({ required_error: 'customerName é obrigatório' })
      .trim()
      .min(2, 'customerName deve ter ao menos 2 caracteres')
      .max(100, 'customerName deve ter no máximo 100 caracteres'),
    email: z
      .string({ required_error: 'email é obrigatório' })
      .trim()
      .toLowerCase()
      .email('email inválido')
      .max(255, 'email deve ter no máximo 255 caracteres'),
    content: z
      .string({ required_error: 'content é obrigatório' })
      .trim()
      .min(10, 'content deve ter ao menos 10 caracteres')
      .max(5000, 'content deve ter no máximo 5000 caracteres'),
  })
  .strict(); // rejeita chaves extras (mass assignment)

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const listFeedbacksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: statusSchema.optional(),
  sentiment: sentimentSchema.optional(),
  urgency: urgencySchema.optional(),
  category: categorySchema.optional(),
});

export type ListFeedbacksQuery = z.infer<typeof listFeedbacksQuerySchema>;

export const feedbackIdParamSchema = z.object({
  id: z.string().uuid('id deve ser um UUID válido'),
});

export type FeedbackIdParam = z.infer<typeof feedbackIdParamSchema>;

export const analysisSchema = z.object({
  sentiment: sentimentSchema,
  urgency: urgencySchema,
  category: categorySchema,
  summary: z.string().max(255),
  tags: z.array(z.string()),
});

export type AnalysisDto = z.infer<typeof analysisSchema>;

export const feedbackSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string(),
  email: z.string().email(),
  content: z.string(),
  status: statusSchema,
  createdAt: z.string().datetime(),
  analysis: analysisSchema.nullable(),
});

export type FeedbackDto = z.infer<typeof feedbackSchema>;

export const createFeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('PENDING'),
  message: z.string(),
});

export type CreateFeedbackResponse = z.infer<typeof createFeedbackResponseSchema>;

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const paginatedFeedbacksSchema = z.object({
  data: z.array(feedbackSchema),
  pagination: paginationSchema,
});

export type PaginatedFeedbacks = z.infer<typeof paginatedFeedbacksSchema>;

// topTags exigido pelo RF-05, embora o exemplo do §4.3 mostre só total/bySentiment/byUrgency.
export const metricsSchema = z.object({
  total: z.number().int().min(0),
  bySentiment: z.object({
    POSITIVE: z.number().int().min(0),
    NEUTRAL: z.number().int().min(0),
    NEGATIVE: z.number().int().min(0),
  }),
  byUrgency: z.object({
    LOW: z.number().int().min(0),
    MEDIUM: z.number().int().min(0),
    HIGH: z.number().int().min(0),
    CRITICAL: z.number().int().min(0),
  }),
  topTags: z.array(
    z.object({
      tag: z.string(),
      count: z.number().int().min(1),
    }),
  ),
  byDay: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        total: z.number().int().min(0),
      }),
    )
    .length(14),
});

export type MetricsDto = z.infer<typeof metricsSchema>;
