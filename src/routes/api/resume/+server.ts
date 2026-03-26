import { type RequestHandler } from '@sveltejs/kit'
import { jwtVerify } from 'jose'
import { env as privateEnv } from '$env/dynamic/private'
import { buildGraph } from '$lib/graph.js'
import { R2CheckpointSaver } from '$lib/r2-checkpointer.js'
import { MemorySaver, Command } from '@langchain/langgraph'
import { z } from 'zod'
import { logger } from '$lib/logger.js'
import { LLMLoggingHandler } from '$lib/llm-logger.js'
import { extractInterrupt } from '$lib/langgraph-interrupt.js'
import { fetchContent } from '$lib/agents/source-fetcher.js'
import type { SeoMeta, Source } from '$lib/agents/types.js'

const SourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  content: z.string()
})

const ResumeBodySchema = z.object({
  runId: z.string().uuid(),
  outline: z.string().optional(),
  sources: z.array(SourceSchema).optional(),
  addUrls: z.array(z.string().url()).optional(),
  approvedNotes: z.array(z.string()).optional()
})

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

function getSecret() {
  const secret = privateEnv.JWT_SECRET
  if (!secret) throw new Error('Missing env var JWT_SECRET')
  return new TextEncoder().encode(secret)
}

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
      return { stage: nodeName, label: baseLabel, outline: output.outline as string | undefined }
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
    logger.warn('resume request missing token')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    await jwtVerify(token, getSecret())
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      'resume request invalid token'
    )
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const parsed = ResumeBodySchema.safeParse(await request.json())
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, 'resume request invalid body')
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }),
      { status: 400 }
    )
  }

  const { runId, outline, sources, addUrls, approvedNotes } = parsed.data
  logger.info(
    {
      runId,
      hasOutline: !!outline,
      hasSources: !!sources,
      addUrlCount: addUrls?.length ?? 0,
      approvedNoteCount: approvedNotes?.length ?? 0
    },
    'resume request'
  )

  const r2 = platform?.env?.R2
  const checkpointer = r2 ? new R2CheckpointSaver(r2) : new MemorySaver()

  let graph: ReturnType<typeof buildGraph>
  try {
    graph = buildGraph(checkpointer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ runId, error: message }, 'graph init failed')
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }

  const llmHandler = new LLMLoggingHandler(logger, runId)
  const encoder = new TextEncoder()
  const config = { configurable: { thread_id: runId }, callbacks: [llmHandler] }

  // Determine input based on what was provided
  let input: Command | null
  if (outline !== undefined) {
    input = new Command({ resume: outline })
  } else if (sources !== undefined) {
    // Fetch content for any user-added URLs, then merge with approved sources
    let finalSources: Source[] = sources
    if (addUrls && addUrls.length > 0) {
      const fetched = await Promise.all(
        addUrls.map(async url => ({
          url,
          title: url,
          content: await fetchContent(url)
        }))
      )
      finalSources = [...sources, ...fetched]
    }
    input = new Command({ resume: finalSources })
  } else {
    input = null // crash recovery or pause-resume
  }

  // If approved notes were submitted, update graph state before resuming
  if (approvedNotes && approvedNotes.length > 0) {
    try {
      const snapshot = await graph.getState(config)
      const currentNotes: string[] =
        (snapshot.values.factCheckerNotes as string[] | undefined) ?? []
      const currentApproved: string[] =
        (snapshot.values.approvedNotes as string[] | undefined) ?? []
      const newApproved = [...new Set([...currentApproved, ...approvedNotes])]
      const remaining = currentNotes.filter(n => !approvedNotes.includes(n))
      await graph.updateState(config, {
        factCheckerNotes: remaining,
        approvedNotes: newApproved,
        approved: remaining.length === 0
      })
      logger.info(
        { runId, remaining: remaining.length, approved: remaining.length === 0 },
        'applied approved notes to state'
      )
    } catch (err) {
      logger.warn(
        { runId, error: err instanceof Error ? err.message : String(err) },
        'failed to apply approved notes'
      )
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        for await (const event of graph.streamEvents(input, { version: 'v2', ...config })) {
          const eventType = event.event
          const name = event.name
          const meta = event.metadata as Record<string, unknown> | undefined
          const isNodeLevel = NODE_NAMES.has(name) && meta?.langgraph_node === name

          if (eventType === 'on_chain_end' && isNodeLevel) {
            const output = (event.data as { output?: Record<string, unknown> }).output ?? {}
            logger.info({ runId, stage: name }, 'stage complete')
            send(buildNodeEvent(name, output))
          } else if (eventType === 'on_chat_model_stream' && meta?.langgraph_node === 'writer') {
            const chunk = (event.data as { chunk?: { content?: unknown } }).chunk
            const content = chunk?.content
            let token = ''
            if (typeof content === 'string') {
              token = content
            } else if (Array.isArray(content)) {
              token = (content as Array<{ text?: string }>).map(c => c.text ?? '').join('')
            }
            if (token) send({ stage: 'writer_token', token })
          }
        }

        // Check whether the graph paused again at an interrupt
        const snapshot = await graph.getState(config)
        const intr = extractInterrupt(snapshot)

        if (intr?.type === 'outline') {
          logger.info({ runId }, 'graph interrupted at outline (resume)')
          send({ stage: 'interrupt', type: 'outline', content: intr.content, runId })
        } else if (intr?.type === 'sources') {
          logger.info({ runId }, 'graph interrupted at source approval (resume)')
          send({
            stage: 'interrupt',
            type: 'sources',
            sources: intr.sources,
            scores: intr.scores,
            runId
          })
        } else {
          logger.info({ runId }, 'resume complete')
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
        logger.error({ runId, error: message }, 'resume failed')
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
