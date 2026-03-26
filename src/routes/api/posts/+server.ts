import { type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'
import { z } from 'zod'
import type { Source, SeoMeta } from '$lib/agents/types.js'

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
  sources: Source[]
  seoMeta?: SeoMeta | null
}

const SavePostSchema = z.object({
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

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

async function requireAuth(cookies: Parameters<RequestHandler>[0]['cookies']): Promise<boolean> {
  const token = cookies.get('auth_token')
  if (!token) return false
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export const GET: RequestHandler = async ({ cookies, url, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const bucket = platform?.env?.R2
  const id = url.searchParams.get('id')

  if (id) {
    // Fetch a single full post
    if (!bucket) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    const obj = await bucket.get(`posts/${id}.json`)
    if (!obj) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    const data = await obj.json<SavedPost>()
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })
  }

  // List all posts (metadata only via customMetadata)
  if (!bucket)
    return new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json' } })

  const listed = await bucket.list({ prefix: 'posts/', include: ['customMetadata'] })
  const items: PostListItem[] = listed.objects
    .map(obj => {
      const meta = obj.customMetadata ?? {}
      const id = obj.key.replace('posts/', '').replace('.json', '')
      return {
        id,
        savedAt: meta.savedAt ?? '',
        topic: meta.topic ?? '',
        seoTitle: meta.seoTitle ?? '',
        format: meta.format ?? '',
        wordCount: meta.wordCount ?? ''
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))

  return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } })
}

export const POST: RequestHandler = async ({ cookies, request, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const parsed = SavePostSchema.safeParse(await request.json())
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }),
      { status: 400 }
    )
  }

  const { runId, topic, format, tone, wordCount, post, sources, seoMeta } = parsed.data
  const savedAt = new Date().toISOString()
  const seoTitle = seoMeta?.titles?.[0] ?? ''
  const data: SavedPost = {
    id: runId,
    savedAt,
    topic,
    seoTitle,
    format,
    tone,
    wordCount,
    post,
    sources,
    seoMeta
  }

  const bucket = platform?.env?.R2
  if (bucket) {
    await bucket.put(`posts/${runId}.json`, JSON.stringify(data), {
      customMetadata: { topic, seoTitle, savedAt, format, wordCount }
    })
  }

  return new Response(JSON.stringify({ id: runId }), {
    status: 201,
    headers: { 'content-type': 'application/json' }
  })
}

export const DELETE: RequestHandler = async ({ cookies, url, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const id = url.searchParams.get('id')
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
  }

  const bucket = platform?.env?.R2
  if (bucket) {
    await bucket.delete(`posts/${id}.json`)
  }

  return new Response(null, { status: 204 })
}
