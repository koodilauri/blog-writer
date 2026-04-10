import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'
import type { RequestEvent } from '@sveltejs/kit'
import type { User } from '$lib/types/auth'

export function getSecret(): Uint8Array {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

export async function authenticate(event: RequestEvent): Promise<User | null> {
  const token = event.cookies.get('auth_token')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.email !== 'string') return null
    return { email: payload.email }
  } catch {
    return null
  }
}
