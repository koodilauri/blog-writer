import { z } from 'zod'

export const SavePostSchema = z.object({
  runId: z.string().uuid(),
  topic: z.string(),
  format: z.string(),
  tone: z.string(),
  wordCount: z.string(),
  post: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string(), content: z.string() })),
  seoMeta: z
    .object({
      titles: z.array(z.string()),
      metaDescription: z.string(),
      tags: z.array(z.string()),
      slug: z.string()
    })
    .nullable()
    .optional()
})

export type PostListItem = {
  id: string
  savedAt: string
  topic: string
  seoTitle: string
  format: string
  wordCount: string
}

export type SavedPost = PostListItem & {
  tone: string
  post: string
  sources: z.infer<typeof SavePostSchema>['sources']
  seoMeta?: z.infer<typeof SavePostSchema>['seoMeta']
}
