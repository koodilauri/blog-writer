import { z } from 'zod'

export const SessionSchema = z
  .object({
    runId: z.string().uuid(),
    topic: z.string().optional(),
    finalPost: z.unknown().optional()
  })
  .passthrough()

export type Session = z.infer<typeof SessionSchema>
