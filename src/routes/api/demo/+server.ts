import type { RequestHandler } from '@sveltejs/kit'
import { getDemoSteps } from '$lib/demo-script'

export const POST: RequestHandler = async () => {
  const steps = getDemoSteps()
  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      for (const { delay, data } of steps) {
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive'
    }
  })
}
