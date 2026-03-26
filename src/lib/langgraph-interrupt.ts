import type { Source } from './agents/types.js'

export type InterruptData =
  | { type: 'outline'; content: string }
  | { type: 'sources'; sources: Source[]; scores: number[] }

type SnapshotLike = {
  tasks: { interrupts?: { value?: unknown }[] }[]
}

/**
 * LangGraph attaches interrupts to snapshot.tasks[].interrupts[].value.
 * Tasks are not guaranteed to be ordered, so scan all tasks (not only tasks[0]).
 */
export function extractInterrupt(snapshot: SnapshotLike): InterruptData | undefined {
  for (const task of snapshot.tasks) {
    for (const intr of task.interrupts ?? []) {
      const v = intr.value
      if (v === undefined) continue
      if (typeof v === 'string') return { type: 'outline', content: v }
      if (typeof v === 'object' && v !== null && 'sources' in v) {
        const s = v as { sources: Source[]; scores: number[] }
        return { type: 'sources', sources: s.sources, scores: s.scores }
      }
    }
  }
  return undefined
}

/** Backward-compat alias for callers that only need the outline interrupt value. */
export function extractInterruptOutline(snapshot: SnapshotLike): string | undefined {
  const r = extractInterrupt(snapshot)
  return r?.type === 'outline' ? r.content : undefined
}
