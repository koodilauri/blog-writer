import { z } from 'zod'

export const DraftParamsSchema = z.object({
  topic: z.string(),
  format: z.string(),
  tone: z.string(),
  wordCount: z.string()
})
