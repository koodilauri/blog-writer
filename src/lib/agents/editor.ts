import type { GraphStateType } from './types.js'
import { getModel } from '../model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const TONE_EXAMPLES: Record<string, string[]> = {
  'formal and informative': [
    'Studies have consistently demonstrated a significant correlation between...',
    'The implications of this development extend beyond the immediate context to...',
    'Evidence from multiple independent sources corroborates the position that...'
  ],
  funny: [
    'Plot twist: scientists were just as baffled as the rest of us.',
    "Buckle up, because it's about to get gloriously weird.",
    'Nature had one job. It did not do that job. Not even a little bit.'
  ],
  'for kids': [
    'Did you know that bees are basically tiny flying mailmen — but for flowers?',
    'Imagine having to eat your entire weight in food every single day!',
    "That might sound super strange, but it's actually really cool."
  ],
  scientific: [
    'The empirical evidence suggests a statistically significant correlation (p < 0.05)...',
    'Subsequent analysis revealed several confounding variables that merit further investigation...',
    'This hypothesis is consistent with the existing literature on the subject...'
  ],
  inspirational: [
    'Every great achievement begins with a single decision to try.',
    'The challenges you face today are quietly building the strength you will need tomorrow.',
    'Imagine what becomes possible the moment you stop waiting for perfect conditions.'
  ]
}

function buildSystemPrompt(format: string, tone: string): string {
  const examples = TONE_EXAMPLES[tone]
  const toneSection = examples
    ? `\nTarget tone — "${tone}". Example sentences that capture this tone:\n${examples.map(e => `  • "${e}"`).join('\n')}`
    : `\nTarget tone: ${tone}.`

  return `You are a senior editor performing a final review of a ${format}.${toneSection}

Your job is to:
1. Fix any typos or grammatical errors
2. Ensure the tone matches the examples above throughout — adjust any sections that drift
3. Verify the markdown formatting is correct and well-structured
4. Improve flow and readability without changing meaning or facts
5. Ensure the post has a clear introduction and conclusion

Return the complete edited post first, then list your changes.

Use this exact format:
<post>
[the full edited post here]
</post>
<notes>
- brief description of each change (one per line), or "No changes needed"
</notes>`
}

export async function editorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const model = getModel()

  const response = await model.invoke([
    new SystemMessage(buildSystemPrompt(state.format, state.tone)),
    new HumanMessage(
      `Please do a final edit of this ${state.format} about "${state.topic}":\n\n${state.draft}`
    )
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const notesMatch = content.match(/<notes>([\s\S]*?)<\/notes>/)
  const postMatch = content.match(/<post>([\s\S]*?)<\/post>/)

  if (!postMatch) {
    // Small models often prepend a "### Notes / - bullet" block before the actual post.
    // Detect and strip any leading notes/changes/edits section, then use the remainder.
    const withoutLeadingNotes = content
      .replace(/^#{1,4}\s*(?:notes?|changes?|edits?)[^\n]*\n(?:[-•*]\s+[^\n]+\n?)*\n*/i, '')
      .trim()
    return {
      finalPost: withoutLeadingNotes || content.trim(),
      editorNotes: []
    }
  }

  const rawNotes = notesMatch ? notesMatch[1].trim() : ''
  const editorNotes = rawNotes
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0 && line !== 'No changes needed')

  return {
    finalPost: postMatch[1].trim(),
    editorNotes
  }
}
