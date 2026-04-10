import { redirect, type Handle } from '@sveltejs/kit'
import { authenticate } from '$lib/server/auth'

const PROTECTED = ['/generate', '/drafts', '/preview']

export const handle: Handle = async ({ event, resolve }) => {
  // Demo routes stay open — no auth required
  if (event.url.searchParams.has('demo')) return resolve(event)

  event.locals.user = await authenticate(event)

  const { pathname } = event.url
  const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
  if (needsAuth && !event.locals.user) {
    // Clear any stale cookie and redirect to login
    event.cookies.delete('auth_token', { path: '/' })
    redirect(303, '/login')
  }

  return resolve(event)
}
