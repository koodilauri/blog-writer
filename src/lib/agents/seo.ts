import type { GraphStateType, SeoMeta } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const SeoResultSchema = z.object({
  titles: z.array(z.string()).min(1).max(5),
  metaDescription: z.string().min(50).max(160),
  tags: z.array(z.string()).min(1).max(10),
  slug: z.string().min(1)
})

const SYSTEM_PROMPT = `You are an SEO specialist. Given a finished blog post, generate SEO metadata.

Rules:
- titles: 3 title options, each 50-65 characters, compelling and keyword-rich
- metaDescription: 120-155 characters, summarises the post, includes primary keyword, ends naturally
- tags: 5-8 relevant tags (lowercase, no spaces — use hyphens), sorted by importance
- slug: URL-friendly slug using the primary keyword, lowercase with hyphens, 3-6 words

Respond ONLY with valid JSON matching this schema:
{"titles": ["...", "...", "..."], "metaDescription": "...", "tags": ["tag1", "tag2"], "slug": "..."}`

export async function seoNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `Topic: "${state.topic}"\nFormat: ${state.format}\nTone: ${state.tone}\n\n---\n\n${state.finalPost}`
    )
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  const parsed = jsonMatch
    ? SeoResultSchema.safeParse(tryParseJson(jsonMatch[0]))
    : { success: false as const }

  if (!parsed.success) {
    const slug = state.topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60)
    const seoMeta: SeoMeta = {
      titles: [state.topic],
      metaDescription: `A ${state.tone} ${state.format} about ${state.topic}.`,
      tags: slug.split('-').filter(w => w.length > 2),
      slug
    }
    return { seoMeta }
  }

  return { seoMeta: parsed.data }
}
