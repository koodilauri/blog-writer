import { type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'
import { buildGraph } from '$lib/graph.js'
import { R2CheckpointSaver } from '$lib/r2-checkpointer.js'
import { MemorySaver } from '@langchain/langgraph'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { logger } from '$lib/logger.js'
import { LLMLoggingHandler } from '$lib/llm-logger.js'
import { extractInterrupt } from '$lib/langgraph-interrupt.js'
import type { SeoMeta } from '$lib/agents/types.js'

const RequestBodySchema = z.object({
  topic: z.string().min(1, 'topic is required'),
  format: z.string().default('blog post'),
  tone: z.string().default('formal and informative'),
  wordCount: z.string().default('medium (~600 words)'),
  runId: z.string().uuid().optional()
})

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

const STAGE_LABELS: Record<string, string> = {
  query_generator: 'Generating search queries...',
  source_fetcher: 'Fetching sources...',
  source_scorer: 'Scoring sources...',
  source_approval: 'Awaiting source approval...',
  outliner: 'Building outline...',
  writer: 'Writing draft...',
  fact_checker: 'Fact-checking...',
  editor: 'Final editing...',
  seo: 'Generating SEO metadata...'
}

const NODE_NAMES = new Set([
  'query_generator',
  'source_fetcher',
  'source_scorer',
  'source_approval',
  'outliner',
  'writer',
  'fact_checker',
  'editor',
  'seo'
])

function buildNodeEvent(
  nodeName: string,
  output: Record<string, unknown>
): Record<string, unknown> {
  const baseLabel = STAGE_LABELS[nodeName] ?? nodeName

  switch (nodeName) {
    case 'source_scorer': {
      type Src = { url: string; title: string; content: string }
      const sources = (output.sources as Src[] | undefined) ?? []
      return {
        stage: nodeName,
        label: baseLabel,
        sources: sources.map(s => ({ url: s.url, title: s.title }))
      }
    }
    case 'outliner': {
      return {
        stage: nodeName,
        label: baseLabel,
        outline: output.outline as string | undefined
      }
    }
    case 'writer': {
      const revisionCount = (output.revisionCount as number | undefined) ?? 0
      const label = revisionCount > 0 ? `Revising draft (revision ${revisionCount})...` : baseLabel
      return {
        stage: nodeName,
        label,
        revisionCount,
        changes: (output.writerChanges as string[] | undefined) ?? []
      }
    }
    case 'fact_checker': {
      return {
        stage: nodeName,
        label: baseLabel,
        approved: output.approved as boolean | undefined,
        revisionCount: output.revisionCount as number | undefined,
        notes: (output.factCheckerNotes as string[] | undefined) ?? []
      }
    }
    case 'editor': {
      return {
        stage: nodeName,
        label: baseLabel,
        notes: (output.editorNotes as string[] | undefined) ?? []
      }
    }
    case 'seo': {
      return {
        stage: nodeName,
        label: baseLabel,
        meta: output.seoMeta as SeoMeta | null | undefined
      }
    }
    default:
      return { stage: nodeName, label: baseLabel }
  }
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  const token = cookies.get('auth_token')
  if (!token) {
    logger.warn('generate request missing token')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  try {
    await jwtVerify(token, getSecret())
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      'generate request invalid token'
    )
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  const parsed = RequestBodySchema.safeParse(await request.json())
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, 'generate request invalid body')
    return new Response(
      JSON.stringify({
        error: parsed.error.issues[0]?.message ?? 'Invalid request'
      }),
      { status: 400 }
    )
  }

  const { topic, format, tone, wordCount } = parsed.data
  const runId = parsed.data.runId ?? randomUUID()

  logger.info({ runId, topic, format, tone }, 'generate request')

  const r2 = platform?.env?.R2
  const checkpointer = r2 ? new R2CheckpointSaver(r2) : new MemorySaver()

  let graph: ReturnType<typeof buildGraph>
  try {
    graph = buildGraph(checkpointer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ runId, error: message }, 'graph init failed')
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500
    })
  }

  const llmHandler = new LLMLoggingHandler(logger, runId)
  const encoder = new TextEncoder()
  const config = {
    configurable: { thread_id: runId },
    callbacks: [llmHandler]
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ stage: 'started', runId })

        for await (const event of graph.streamEvents(
          { topic, format, tone, wordCount },
          { version: 'v2', ...config }
        )) {
          const eventType = event.event
          const name = event.name
          const meta = event.metadata as Record<string, unknown> | undefined
          const isNodeLevel = NODE_NAMES.has(name) && meta?.langgraph_node === name

          if (eventType === 'on_chain_end' && isNodeLevel) {
            const output = (event.data as { output?: Record<string, unknown> }).output ?? {}
            logger.info({ runId, stage: name }, 'stage complete')
            send(buildNodeEvent(name, output))
          } else if (eventType === 'on_chat_model_stream') {
            const nodeName = meta?.langgraph_node as string | undefined
            if (!nodeName || !NODE_NAMES.has(nodeName)) continue
            const chunk = (event.data as { chunk?: { content?: unknown } }).chunk
            const content = chunk?.content
            let token = ''
            if (typeof content === 'string') {
              token = content
            } else if (Array.isArray(content)) {
              token = (content as Array<{ text?: string }>).map(c => c.text ?? '').join('')
            }
            if (!token) continue
            if (nodeName === 'writer') {
              send({ stage: 'writer_token', token })
            } else {
              send({ stage: 'thinking_token', node: nodeName, token })
            }
          }
        }

        // Check whether the graph paused at an interrupt
        const snapshot = await graph.getState(config)
        const intr = extractInterrupt(snapshot)

        if (intr?.type === 'outline') {
          logger.info({ runId }, 'graph interrupted at outline')
          send({
            stage: 'interrupt',
            type: 'outline',
            content: intr.content,
            runId
          })
        } else if (intr?.type === 'sources') {
          logger.info({ runId }, 'graph interrupted at source approval')
          send({
            stage: 'interrupt',
            type: 'sources',
            sources: intr.sources,
            scores: intr.scores,
            runId
          })
        } else if (intr?.type === 'fact_checker') {
          logger.info({ runId }, 'graph interrupted at fact-checker approval')
          send({
            stage: 'interrupt',
            type: 'fact_checker',
            notes: intr.notes,
            runId
          })
        } else {
          logger.info({ runId }, 'generate complete')
          send({
            stage: 'done',
            runId,
            post: snapshot.values.finalPost,
            sources: snapshot.values.sources,
            seoMeta: snapshot.values.seoMeta
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.error({ runId, error: message }, 'generate failed')
        send({ stage: 'error', error: message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
