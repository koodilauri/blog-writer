import type { GraphStateType, Source } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

const MAX_RESEARCH_RETRIES = 2

const RelevanceSchema = z.array(
  z.object({
    index: z.number().int().nonnegative(),
    score: z.number().int().min(1).max(5)
  })
)

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const RELEVANCE_SYSTEM_PROMPT = `You are evaluating web page content for relevance and quality. Score each source 1-5:
5 — Authoritative, in-depth, directly covers the topic with specific facts and detail
4 — Good coverage of the topic with useful information
3 — Partial coverage, some useful sections but also off-topic content
2 — Thin content, mostly generic or tangential to the topic
1 — SEO spam, unrelated content, or nearly empty page

Respond ONLY with a JSON array: [{"index": 0, "score": 4}, {"index": 1, "score": 2}, ...]`

export async function sourceScorerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  // Deduplicate rawSources by URL
  const seen = new Set<string>()
  const deduped: Source[] = state.rawSources.filter(s => {
    if (seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })

  // Filter sources with empty content (paywalled, timed-out, etc.)
  const candidates = deduped.filter(s => s.content.trim().length > 0)

  if (candidates.length === 0) {
    const canRetry = state.researchRetryCount < MAX_RESEARCH_RETRIES
    return canRetry
      ? { sources: [], researchRetryCount: state.researchRetryCount + 1 }
      : { sources: deduped.slice(0, 1), sourceScores: [1] }
  }

  const model = getModel()

  const scoringPrompt = `Rate each source for relevance and depth for a ${state.format} about "${state.topic}".

${candidates.map((s, i) => `[${i}] ${s.title}\nContent preview:\n${s.content.slice(0, 800)}`).join('\n\n---\n\n')}

Respond ONLY with JSON: [{"index": 0, "score": 4}, ...]`

  const response = await model.invoke([
    new SystemMessage(RELEVANCE_SYSTEM_PROMPT),
    new HumanMessage(scoringPrompt)
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  const match = content.match(/\[[\s\S]*?\]/)
  const parsed = match
    ? RelevanceSchema.safeParse(tryParseJson(match[0]))
    : { success: false as const }

  if (!parsed.success) {
    // Scoring failed — proceed with all candidates, no scores
    return { sources: candidates, sourceScores: candidates.map(() => 3) }
  }

  const scoreMap = new Map(parsed.data.map(s => [s.index, s.score]))
  const good = candidates.filter((_, i) => (scoreMap.get(i) ?? 3) > 2)

  if (good.length === 0 && state.researchRetryCount < MAX_RESEARCH_RETRIES) {
    // All sources low-quality — signal retry
    return { sources: [], researchRetryCount: state.researchRetryCount + 1 }
  }

  // Proceed — either good sources found, or retry budget exhausted
  const sources = good.length > 0 ? good : candidates.slice(0, 1)
  const sourceScores = sources.map(s => scoreMap.get(candidates.indexOf(s)) ?? 3)

  return { sources, sourceScores }
}
