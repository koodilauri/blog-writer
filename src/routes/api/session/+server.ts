import { type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'

const SESSION_KEY = 'session/current.json'

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

export const GET: RequestHandler = async ({ cookies, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const bucket = platform?.env?.R2
  if (!bucket) return new Response('null', { headers: { 'content-type': 'application/json' } })

  const obj = await bucket.get(SESSION_KEY)
  if (!obj) return new Response('null', { headers: { 'content-type': 'application/json' } })

  const text = await obj.text()
  return new Response(text, { headers: { 'content-type': 'application/json' } })
}

export const PUT: RequestHandler = async ({ cookies, request, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.text()

  const bucket = platform?.env?.R2
  if (bucket) {
    await bucket.put(SESSION_KEY, body, {
      httpMetadata: { contentType: 'application/json' }
    })
  }

  return new Response(null, { status: 204 })
}

export const DELETE: RequestHandler = async ({ cookies, platform }) => {
  if (!(await requireAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const bucket = platform?.env?.R2
  if (bucket) await bucket.delete(SESSION_KEY)

  return new Response(null, { status: 204 })
}
