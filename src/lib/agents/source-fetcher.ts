import type { GraphStateType, Source } from './types.js'
import { z } from 'zod'
import { env as privateEnv } from '$env/dynamic/private'

const BraveResultSchema = z.object({
  web: z
    .object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          description: z.string().optional()
        })
      )
    })
    .optional()
})

async function searchBrave(
  query: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const apiKey = privateEnv.BRAVE_SEARCH_API_KEY
  if (!apiKey) throw new Error('Missing env var BRAVE_SEARCH_API_KEY')

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey
    }
  })

  if (!res.ok) throw new Error(`Brave Search API error: ${res.status}`)

  const parsed = BraveResultSchema.safeParse(await res.json())
  if (!parsed.success || !parsed.data.web?.results) return []

  return parsed.data.web.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description ?? ''
  }))
}

export async function fetchContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PostWriter/1.0)' },
      signal: AbortSignal.timeout(8000)
    })
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 4000)
  } catch {
    return ''
  }
}

// Receives { query } injected by Send — not the full graph state
export async function sourceFetcherNode(input: {
  query: string
}): Promise<Partial<GraphStateType>> {
  const results = await searchBrave(input.query)

  // Fetch content for top 3 results in parallel
  const sources: Source[] = await Promise.all(
    results.slice(0, 3).map(async r => ({
      url: r.url,
      title: r.title,
      content: await fetchContent(r.url)
    }))
  )

  return { rawSources: sources }
}
