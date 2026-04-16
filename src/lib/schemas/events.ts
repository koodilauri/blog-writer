import { z } from 'zod'

const SourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  content: z.string().optional()
})

const SeoMetaSchema = z.object({
  titles: z.array(z.string()),
  metaDescription: z.string(),
  tags: z.array(z.string()),
  slug: z.string()
})

export const StageEventSchema = z.union([
  z.object({ stage: z.literal('started'), runId: z.string() }),
  z.object({ stage: z.literal('query_generator'), label: z.string() }),
  z.object({ stage: z.literal('source_fetcher'), label: z.string() }),
  z.object({
    stage: z.literal('source_scorer'),
    label: z.string(),
    sources: z.array(SourceSchema).optional()
  }),
  z.object({ stage: z.literal('source_approval'), label: z.string() }),
  z.object({
    stage: z.literal('outliner'),
    label: z.string(),
    outline: z.string().optional()
  }),
  z.object({
    stage: z.literal('writer'),
    label: z.string(),
    revisionCount: z.number().optional(),
    changes: z.array(z.string()).optional()
  }),
  z.object({ stage: z.literal('writer_token'), token: z.string(), node: z.string().optional() }),
  z.object({ stage: z.literal('thinking_token'), node: z.string(), token: z.string() }),
  z.object({
    stage: z.literal('fact_checker'),
    label: z.string(),
    approved: z.boolean().optional(),
    revisionCount: z.number().optional(),
    notes: z.array(z.string()).optional()
  }),
  z.object({
    stage: z.literal('editor'),
    label: z.string(),
    notes: z.array(z.string()).optional()
  }),
  z.object({ stage: z.literal('seo'), label: z.string(), meta: SeoMetaSchema.optional() }),
  z.object({
    stage: z.literal('done'),
    runId: z.string(),
    post: z.string(),
    sources: z.array(SourceSchema),
    seoMeta: SeoMetaSchema.optional()
  }),
  z.object({
    stage: z.literal('interrupt'),
    type: z.union([z.literal('outline'), z.literal('sources'), z.literal('fact_checker')]),
    content: z.string().optional(),
    sources: z.array(SourceSchema).optional(),
    scores: z.array(z.number()).optional(),
    notes: z.array(z.string()).optional(),
    runId: z.string()
  }),
  z.object({ stage: z.literal('error'), error: z.string() })
])

export type StageEvent = z.infer<typeof StageEventSchema>

export const ErrorResponseSchema = z.object({ error: z.string().optional() })
