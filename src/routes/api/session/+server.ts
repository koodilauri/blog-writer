import { type RequestHandler } from '@sveltejs/kit'
import { SessionSchema } from '$lib/schemas/session'

const SESSION_KEY = 'session/current.json'

export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const bucket = platform?.env?.R2
  if (!bucket)
    return new Response('null', {
      headers: { 'content-type': 'application/json' }
    })

  const obj = await bucket.get(SESSION_KEY)
  if (!obj)
    return new Response('null', {
      headers: { 'content-type': 'application/json' }
    })

  const text = await obj.text()
  return new Response(text, {
    headers: { 'content-type': 'application/json' }
  })
}

export const PUT: RequestHandler = async ({ locals, request, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const raw = await request.text()
  let jsonParsed: unknown
  try {
    jsonParsed = JSON.parse(raw)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const result = SessionSchema.safeParse(jsonParsed)
  if (!result.success) {
    return new Response('Invalid session payload', { status: 400 })
  }
  const body = JSON.stringify(result.data)

  const bucket = platform?.env?.R2
  if (bucket) {
    await bucket.put(SESSION_KEY, body, {
      httpMetadata: { contentType: 'application/json' }
    })
  }

  return new Response(null, { status: 204 })
}

export const DELETE: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const bucket = platform?.env?.R2
  if (bucket) await bucket.delete(SESSION_KEY)

  return new Response(null, { status: 204 })
}
