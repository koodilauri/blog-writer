import type { GraphStateType } from './types.js'
import { getModel } from '../model.js'
import { logger } from '../logger.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

const IssueSchema = z.object({
  claim: z.string(),
  problem: z.enum(['contradicts_source', 'unsupported', 'inconsistency', 'opinion_as_fact']),
  detail: z.string(),
  source: z.string().optional()
})

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const FactCheckResultSchema = z.discriminatedUnion('approved', [
  z.object({ approved: z.literal(true) }),
  z.object({ approved: z.literal(false), issues: z.array(IssueSchema).min(1) })
])

const PROBLEM_LABELS: Record<string, string> = {
  contradicts_source: 'contradicts source',
  unsupported: 'not supported by any source',
  inconsistency: 'logically inconsistent',
  opinion_as_fact: 'opinion stated as fact'
}

const SYSTEM_PROMPT = `You are a meticulous fact-checker reviewing a draft post against provided source material.

Check for ALL of the following:
1. Claims that directly contradict information in the sources
2. Statements presented as facts that are not supported by any source (even if plausible)
3. Logical inconsistencies within the post itself (contradictory statements)
4. Opinions, speculation, or subjective judgements presented as objective facts

For each issue found, identify:
- The exact claim (quote or close paraphrase from the post)
- The problem type: "contradicts_source" | "unsupported" | "inconsistency" | "opinion_as_fact"
- A clear explanation of why it's an issue
- Which source contradicts it (for contradicts_source type only)

Respond ONLY with valid JSON in one of these exact formats:
{"approved": true}
OR
{"approved": false, "issues": [{"claim": "...", "problem": "contradicts_source", "detail": "...", "source": "Source 1"}, ...]}`

function formatIssueAsNote(issue: z.infer<typeof IssueSchema>): string {
  const label = PROBLEM_LABELS[issue.problem] ?? issue.problem
  const sourceNote = issue.source ? ` (${issue.source})` : ''
  return `Claim: "${issue.claim}" — ${label}${sourceNote}. ${issue.detail}`
}

export async function factCheckerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()

  const sourceSection = state.sources
    .map((s, i) => `### Source ${i + 1}: ${s.title}\n${s.content}`)
    .join('\n\n---\n\n')

  const approvedSection =
    state.approvedNotes.length > 0
      ? `\n\n## Previously Reviewed & Approved by Human Editor\nThe following claims have already been reviewed and approved by the human editor. Do NOT flag these — they are considered acceptable:\n${state.approvedNotes.map(n => `- ${n}`).join('\n')}`
      : ''

  logger.info(
    {
      node: 'fact_checker',
      revisionCount: state.revisionCount,
      approvedNotes: state.approvedNotes.length
    },
    'llm call start'
  )
  const t0 = Date.now()

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `## Draft Post\n${state.draft}\n\n## Source Material\n${sourceSection}${approvedSection}`
    )
  ])

  const durationMs = Date.now() - t0
  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  logger.info({ node: 'fact_checker', durationMs, responseLength: content.length }, 'llm call end')

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  const parsed = jsonMatch
    ? FactCheckResultSchema.safeParse(tryParseJson(jsonMatch[0]))
    : { success: false as const }

  if (!parsed.success) {
    // If parsing fails, approve to avoid blocking the pipeline
    logger.warn(
      { node: 'fact_checker', durationMs, responseLength: content.length },
      'parse failed — auto-approving'
    )
    return {
      approved: true,
      factCheckerNotes: [],
      revisionCount: state.revisionCount
    }
  }

  if (parsed.data.approved) {
    logger.info({ node: 'fact_checker', durationMs, approved: true }, 'fact check result')
    return {
      approved: true,
      factCheckerNotes: [],
      revisionCount: state.revisionCount
    }
  }

  logger.info(
    { node: 'fact_checker', durationMs, approved: false, issueCount: parsed.data.issues.length },
    'fact check result'
  )
  return {
    approved: false,
    factCheckerNotes: parsed.data.issues.map(formatIssueAsNote),
    revisionCount: state.revisionCount
  }
}
