import type { GraphStateType } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { interrupt } from '@langchain/langgraph'

const SYSTEM_PROMPT = `You are a content strategist creating a structured outline for a written piece.

Your outline must include:
- A clear introduction section with the hook and context
- 3-5 body sections, each with a heading, 2-4 key points, and which source(s) support those points
- A conclusion section with the main takeaway

Format your outline in markdown using this structure:
## Introduction
- Hook/opening angle
- Context and why this matters
- Thesis or central argument

## [Section Title]
- Key point (Source: [source title])
- Key point (Source: [source title])

## Conclusion
- Main takeaway
- Closing thought

Keep section headings specific and descriptive — not generic ("Background", "History") but meaningful ("How Jazz Emerged from New Orleans' Musical Melting Pot").`

export async function outlinerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()

  const sourceList = state.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n')

  const sourceContent = state.sources
    .map((s, i) => `### Source ${i + 1}: ${s.title}\n${s.content.slice(0, 2000)}`)
    .join('\n\n---\n\n')

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `Create an outline for a ${state.format} about: "${state.topic}"\nTone: ${state.tone}\nTarget length: ${state.wordCount}\n\nAvailable sources:\n${sourceList}\n\n${sourceContent}`
    )
  ])

  const generated =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  // Pause and surface the outline to the user for review/editing
  const outline = interrupt(generated) as string

  return { outline }
}
