import { type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'
import { randomUUID } from 'crypto'
import { logger } from '$lib/logger.js'
import { z } from 'zod'

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

export const GET: RequestHandler = async ({ request, platform, cookies, url }) => {
  const token = cookies.get('auth_token')
  if (!token) {
    logger.warn('pipeline request missing token')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    await jwtVerify(token, getSecret())
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      'pipeline request invalid token'
    )
    return new Response('Unauthorized', { status: 401 })
  }

  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected websocket upgrade', { status: 426 })
  }

  const rawRunId = url.searchParams.get('runId')
  if (rawRunId !== null && !z.string().uuid().safeParse(rawRunId).success) {
    return new Response('Invalid runId', { status: 400 })
  }
  const runId = rawRunId ?? randomUUID()
  logger.info({ runId }, 'pipeline websocket connecting')

  const doNamespace = platform?.env?.PIPELINE_DO
  if (!doNamespace) {
    return new Response('Durable Object not available', { status: 503 })
  }

  const doId = doNamespace.idFromName(runId)
  const stub = doNamespace.get(doId)

  return stub.fetch(request)
}
