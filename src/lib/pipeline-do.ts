import { DurableObject } from 'cloudflare:workers'
import { buildGraph } from './graph.js'
import { R2CheckpointSaver } from './r2-checkpointer.js'
import { Command } from '@langchain/langgraph'
import { extractInterrupt } from './langgraph-interrupt.js'
import { fetchContent, initSourceFetcherEnv } from './agents/source-fetcher.js'
import { initModelEnv } from './model.js'
import { logger } from './logger.js'
import type { Source, SeoMeta } from './agents/types.js'

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
    case 'outliner':
      return { stage: nodeName, label: baseLabel, outline: output.outline as string | undefined }
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
    case 'fact_checker':
      return {
        stage: nodeName,
        label: baseLabel,
        approved: output.approved as boolean | undefined,
        revisionCount: output.revisionCount as number | undefined,
        notes: (output.factCheckerNotes as string[] | undefined) ?? []
      }
    case 'editor':
      return {
        stage: nodeName,
        label: baseLabel,
        notes: (output.editorNotes as string[] | undefined) ?? []
      }
    case 'seo':
      return {
        stage: nodeName,
        label: baseLabel,
        meta: output.seoMeta as SeoMeta | null | undefined
      }
    default:
      return { stage: nodeName, label: baseLabel }
  }
}

type WsMessage =
  | { type: 'start'; runId: string; topic: string; format: string; tone: string; wordCount: string }
  | {
      type: 'resume'
      runId: string
      outline?: string
      sources?: Source[]
      addUrls?: string[]
      approvedNotes?: string[]
      factCheckerApproval?: string[]
    }

export class PipelineDurableObject extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 })
    }
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const msg = JSON.parse(
      typeof message === 'string' ? message : new TextDecoder().decode(message)
    ) as WsMessage

    let input: { topic: string; format: string; tone: string; wordCount: string } | Command | null

    if (msg.type === 'start') {
      input = { topic: msg.topic, format: msg.format, tone: msg.tone, wordCount: msg.wordCount }
    } else {
      const { outline, sources, addUrls, factCheckerApproval } = msg
      if (factCheckerApproval !== undefined) {
        input = new Command({ resume: factCheckerApproval })
      } else if (outline !== undefined) {
        input = new Command({ resume: outline })
      } else if (sources !== undefined) {
        let finalSources = sources
        if (addUrls?.length) {
          const fetched = await Promise.all(
            addUrls.map(async url => ({ url, title: url, content: await fetchContent(url) }))
          )
          finalSources = [...sources, ...fetched]
        }
        input = new Command({ resume: finalSources })
      } else {
        input = null // crash recovery: resume from last R2 checkpoint
      }
    }

    await this.runPipeline(ws, msg.runId, input)
  }

  async webSocketClose(): Promise<void> {
    // Client disconnected. R2 checkpoint preserves progress; client can reconnect and resume.
  }

  private async runPipeline(ws: WebSocket, runId: string, input: unknown): Promise<void> {
    initModelEnv(this.env)
    initSourceFetcherEnv(this.env.BRAVE_SEARCH_API_KEY ?? '')
    const checkpointer = new R2CheckpointSaver(this.env.R2)
    const graph = buildGraph(checkpointer)
    const config = { configurable: { thread_id: runId } }
    const send = (data: unknown) => ws.send(JSON.stringify(data))

    if (input && typeof input === 'object' && 'topic' in input) {
      send({ stage: 'started', runId })
    }

    try {
      for await (const event of graph.streamEvents(input, { version: 'v2', ...config })) {
        if (this.ctx.getWebSockets().length === 0) break

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
          if (nodeName === 'writer' || nodeName === 'editor') {
            send({ stage: 'writer_token', token, node: nodeName })
          } else {
            send({ stage: 'thinking_token', node: nodeName, token })
          }
        }
      }

      if (this.ctx.getWebSockets().length === 0) return

      const snapshot = await graph.getState(config)
      const intr = extractInterrupt(snapshot)

      if (intr?.type === 'outline') {
        logger.info({ runId }, 'interrupted at outline')
        send({ stage: 'interrupt', type: 'outline', content: intr.content, runId })
      } else if (intr?.type === 'sources') {
        logger.info({ runId }, 'interrupted at sources')
        send({
          stage: 'interrupt',
          type: 'sources',
          sources: intr.sources,
          scores: intr.scores,
          runId
        })
      } else if (intr?.type === 'fact_checker') {
        logger.info({ runId }, 'interrupted at fact_checker')
        send({ stage: 'interrupt', type: 'fact_checker', notes: intr.notes, runId })
      } else {
        logger.info({ runId }, 'pipeline complete')
        send({
          stage: 'done',
          runId,
          post: snapshot.values.finalPost as string,
          sources: snapshot.values.sources as Source[],
          seoMeta: snapshot.values.seoMeta as SeoMeta | null
        })
        ws.close(1000, 'done')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error({ runId, error: message }, 'pipeline failed')
      send({ stage: 'error', error: message })
      ws.close(1011, 'error')
    }
  }
}
