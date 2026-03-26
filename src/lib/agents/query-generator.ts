import type { GraphStateType } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

const SearchQueriesSchema = z.array(z.string()).min(1).max(5)

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const SYSTEM_PROMPT = `You are a research assistant. Given a topic, identify the best search queries to find high-quality, relevant sources.

Prioritise:
- Authoritative domains: Wikipedia, .edu, .gov, major news outlets, established publications
- In-depth articles over listicles or SEO-farm content
- Recent sources where the topic is time-sensitive (technology, current events)
- Primary sources where possible (research papers, official documentation)

Respond ONLY with a JSON array of 2-3 search query strings. Example: ["query one", "query two"]`

export async function queryGeneratorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()

  const retryContext =
    state.researchRetryCount > 0 && state.queries.length > 0
      ? `\nPrevious queries that returned no quality sources: ${state.queries.map(q => `"${q}"`).join(', ')}\nGenerate different, broader queries from alternative angles.`
      : ''

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `Topic: "${state.topic}"\nFormat: ${state.format}\nTone: ${state.tone}${retryContext}`
    )
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  const arrayMatch = content.match(/\[[\s\S]*\]/)
  const parsed = arrayMatch
    ? SearchQueriesSchema.safeParse(tryParseJson(arrayMatch[0]))
    : { success: false as const }

  const queries = parsed.success
    ? parsed.data
    : [`${state.topic} overview`, `${state.topic} explained`]

  return { queries }
}
