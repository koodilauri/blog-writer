import { json, type RequestHandler } from '@sveltejs/kit'
import { SignJWT } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

async function readCredentials(request: Request): Promise<{ email: unknown; password: unknown }> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { email?: unknown; password?: unknown }
    return { email: body.email, password: body.password }
  }

  const data = await request.formData()
  return { email: data.get('email'), password: data.get('password') }
}

// Constant-time string comparison via HMAC to prevent timing attacks.
// Works in both Node.js (dev) and Cloudflare Workers (production).
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const [aSig, bSig] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b))
  ])
  const aView = new Uint8Array(aSig)
  const bView = new Uint8Array(bSig)
  let diff = 0
  for (let i = 0; i < aView.length; i++) {
    diff |= aView[i] ^ bView[i]
  }
  return diff === 0
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await readCredentials(request)

  if (typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'Invalid payload' }, { status: 400 })
  }

  const loginEmail = privateEnv.LOGIN_EMAIL
  const loginPassword = privateEnv.LOGIN_PASSWORD
  if (!loginEmail) throw new Error('Missing env var LOGIN_EMAIL')
  if (!loginPassword) throw new Error('Missing env var LOGIN_PASSWORD')

  const [emailMatch, passwordMatch] = await Promise.all([
    timingSafeEqual(email, loginEmail),
    timingSafeEqual(password, loginPassword)
  ])

  if (!emailMatch || !passwordMatch) {
    return json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret())

  const isSecure = request.url.startsWith('https://')
  cookies.set('auth_token', token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    maxAge: 3600
  })

  return json({ user: { email } })
}
