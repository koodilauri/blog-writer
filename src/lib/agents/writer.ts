import type { GraphStateType } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  'blog post': `Structure: engaging intro that hooks the reader, 3-5 body sections with ## subheadings, strong conclusion.
Use short paragraphs (2-4 sentences), occasional bullet lists for key points, and a conversational but informed voice.`,

  essay: `Structure: introduction with a clear thesis statement, body paragraphs each developing one argument, conclusion that synthesises (not just summarises).
Write in flowing prose — avoid bullet lists. Each paragraph should open with a topic sentence.`,

  tutorial: `Structure: brief introduction explaining what the reader will learn and what they need, numbered step-by-step instructions, code examples in fenced code blocks where relevant, a "what you built / next steps" closing section.
Use \`inline code\` for commands and values. Add > blockquote tips or warnings where useful.`,

  story: `Structure: opening scene that drops the reader in medias res, rising action, climax, resolution.
Use narrative voice with sensory detail, character development, and dialogue where appropriate. Use --- for scene breaks instead of headings. Avoid bullet lists entirely.`,

  'scientific abstract': `Structure: Background (1-2 sentences establishing context), Objective (1 sentence), Methods (2-3 sentences), Results (2-3 sentences with specific data), Conclusion (1-2 sentences on implications).
Total length: 250-300 words. Use passive voice where conventional. Cite specific numbers from the sources.`
}

function buildSystemPrompt(format: string, tone: string, isRevision: boolean): string {
  const formatGuide = FORMAT_INSTRUCTIONS[format] ?? `Write a well-structured ${format}.`

  const revisionGuide = isRevision
    ? `\nThis is a revision pass. After writing, briefly list the specific changes you made to address the fact-checker's notes inside <changes></changes> tags.`
    : ''

  return `You are a professional writer. Write a ${format} with a ${tone} tone.
Follow the provided outline and source material closely. Write in well-structured markdown.
Do not invent facts — only use information from the provided sources.

${formatGuide}${revisionGuide}

${isRevision ? 'Return the revised post inside <draft></draft> tags, preceded by <changes></changes> with a brief bullet list of what you changed.' : 'Return ONLY the finished post inside <draft></draft> tags.'}`
}

function buildUserPrompt(state: GraphStateType): string {
  const sourceSection = state.sources
    .map((s, i) => `### Source ${i + 1}: ${s.title}\nURL: ${s.url}\n\n${s.content}`)
    .join('\n\n---\n\n')

  const outlineSection = state.outline ? `\n\n## Outline to Follow\n${state.outline}` : ''

  const notesSection =
    state.factCheckerNotes.length > 0
      ? `\n\n## Fact-Checker Notes — Address ALL of these:\n${state.factCheckerNotes.map(n => `- ${n}`).join('\n')}`
      : ''

  return `Write a ${state.format} about: "${state.topic}"
Tone: ${state.tone}
Target length: ${state.wordCount}${outlineSection}${notesSection}

## Source Material
${sourceSection}`
}

function parseDraftResponse(
  content: string,
  isRevision: boolean
): { draft: string; changes: string[] } {
  const draftMatch = content.match(/<draft>([\s\S]*?)<\/draft>/)

  if (!draftMatch) {
    // Fallback: treat entire response as draft
    return { draft: content.trim(), changes: [] }
  }

  const draft = draftMatch[1].trim()
  let changes: string[] = []

  if (isRevision) {
    const changesMatch = content.match(/<changes>([\s\S]*?)<\/changes>/)
    if (changesMatch) {
      changes = changesMatch[1]
        .trim()
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
    }
  }

  return { draft, changes }
}

export async function writerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()
  const isRevision = state.factCheckerNotes.length > 0

  const response = await model.invoke([
    new SystemMessage(buildSystemPrompt(state.format, state.tone, isRevision)),
    new HumanMessage(buildUserPrompt(state))
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const { draft, changes } = parseDraftResponse(content, isRevision)

  return {
    draft,
    writerChanges: changes,
    revisionCount: state.revisionCount + (isRevision ? 1 : 0)
  }
}
