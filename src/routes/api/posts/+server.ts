import { type RequestHandler } from '@sveltejs/kit'
import { SavePostSchema, type PostListItem, type SavedPost } from '$lib/schemas/posts'

export type { PostListItem, SavedPost }

export const GET: RequestHandler = async ({ locals, url, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const bucket = platform?.env?.R2
  const id = url.searchParams.get('id')

  if (id) {
    // Fetch a single full post
    if (!bucket)
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404
      })
    const obj = await bucket.get(`posts/${id}.json`)
    if (!obj)
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404
      })
    const data = await obj.json<SavedPost>()
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' }
    })
  }

  // List all posts (metadata only via customMetadata)
  if (!bucket)
    return new Response(JSON.stringify([]), {
      headers: { 'content-type': 'application/json' }
    })

  const listed = await bucket.list({
    prefix: 'posts/',
    include: ['customMetadata']
  })
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

  return new Response(JSON.stringify(items), {
    headers: { 'content-type': 'application/json' }
  })
}

export const POST: RequestHandler = async ({ locals, request, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const parsed = SavePostSchema.safeParse(await request.json())
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues[0]?.message ?? 'Invalid request'
      }),
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

export const DELETE: RequestHandler = async ({ locals, url, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const id = url.searchParams.get('id')
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400
    })
  }

  const bucket = platform?.env?.R2
  if (bucket) {
    await bucket.delete(`posts/${id}.json`)
  }

  return new Response(null, { status: 204 })
}
