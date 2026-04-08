import { redirect, type Handle } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'

const PROTECTED = ['/generate', '/drafts', '/preview']

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  // Demo routes stay open — no auth required
  if (event.url.searchParams.has('demo')) return resolve(event)

  const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
  if (!needsAuth) return resolve(event)

  const token = event.cookies.get('auth_token')
  if (!token) redirect(303, '/login')

  try {
    await jwtVerify(token, getSecret())
  } catch {
    // Token expired or tampered — clear the stale cookie and redirect
    event.cookies.delete('auth_token', { path: '/' })
    redirect(303, '/login')
  }

  return resolve(event)
}
