import { z } from 'zod'

export const PostIdSchema = z.string().uuid()

const SeoMetaSchema = z
  .object({
    titles: z.array(z.string()),
    metaDescription: z.string(),
    tags: z.array(z.string()),
    slug: z.string()
  })
  .nullable()
  .optional()

export const SavePostSchema = z.object({
  runId: z.string().uuid(),
  topic: z.string(),
  format: z.string(),
  tone: z.string(),
  wordCount: z.string(),
  post: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string(), content: z.string() })),
  seoMeta: SeoMetaSchema
})

export const PostListItemSchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  topic: z.string(),
  seoTitle: z.string(),
  format: z.string(),
  wordCount: z.string()
})

export const PostListSchema = z.array(PostListItemSchema)

export const SavedPostSchema = PostListItemSchema.extend({
  tone: z.string(),
  post: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string(), content: z.string() })),
  seoMeta: SeoMetaSchema
})

export type PostListItem = z.infer<typeof PostListItemSchema>
export type SavedPost = z.infer<typeof SavedPostSchema>
