import { z } from 'zod'

export const LoginRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1)
})

export const LoginResponseSchema = z.object({
  user: z.object({ email: z.string() }).optional(),
  error: z.string().optional()
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
