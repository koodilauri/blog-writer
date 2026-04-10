const STAGE_LABELS: Record<string, string> = {
  query_generator: 'Fetching sources…',
  source_fetcher: 'Scoring sources…',
  source_scorer: 'Waiting for source approval…',
  source_approval: 'Generating outline…',
  outliner: 'Starting draft…',
  writer: 'Fact-checking…',
  editor: 'Generating SEO…'
}

export function getActivityLabel(
  stalled: boolean,
  lastStageType: string | null,
  thinkingNode: string
): string {
  if (stalled) return 'Stalled'
  if (lastStageType === 'fact_checker' && thinkingNode !== 'editor') return 'Revising…'
  if (thinkingNode === 'editor' || lastStageType === 'writer') return 'Final editing…'
  return (lastStageType ? STAGE_LABELS[lastStageType] : undefined) ?? 'Working…'
}
