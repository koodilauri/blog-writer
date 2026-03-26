import { json, type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

function readBearerToken(authorization: string | null) {
  if (!authorization) return null
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

export const GET: RequestHandler = async ({ request }) => {
  const token = readBearerToken(request.headers.get('authorization'))
  if (!token) return json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await jwtVerify(token, getSecret())
  } catch {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  return json({
    todos: [
      { id: '1', title: 'try to take over the world', done: false },
      { id: '2', title: 'clean your room', done: false }
    ]
  })
}
