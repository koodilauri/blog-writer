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

Output rules — follow these exactly:
- Return ONLY the finished post followed by your notes. No preamble, no meta-commentary.
- Do NOT wrap anything in XML tags like <post>, <draft>, <notes>, or any other tags.
- Do NOT include the word "Notes:" or similar headings in the post body.
- The post must be clean, publication-ready markdown with no leftover formatting artifacts.
- After the post, add a line containing only "---" followed by a brief bullet list of changes (or "No changes needed").`
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

  // Strip any leftover XML tags the model may still emit despite instructions
  const stripped = content
    .replace(/<\/?post>/gi, '')
    .replace(/<\/?draft>/gi, '')
    .replace(/<\/?notes>/gi, '')
    .trim()

  // Split on the separator line ("---") to separate post from editor notes
  const sepIdx = stripped.search(/\n---\n/)
  let finalPost: string
  let rawNotes: string

  if (sepIdx !== -1) {
    finalPost = stripped.slice(0, sepIdx).trim()
    rawNotes = stripped.slice(sepIdx + 5).trim()
  } else {
    // No separator — use the whole content as the post
    finalPost = stripped
    rawNotes = ''
  }

  const editorNotes = rawNotes
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0 && line !== 'No changes needed')

  return { finalPost, editorNotes }
}
