import { interrupt } from '@langchain/langgraph'
import type { GraphStateType } from './types.js'

export async function factCheckerApprovalNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const approvedNotes = interrupt({ notes: state.factCheckerNotes }) as string[]

  const approvedSet = new Set(approvedNotes)
  const remaining = state.factCheckerNotes.filter(n => !approvedSet.has(n))
  const newApproved = [...state.approvedNotes, ...approvedNotes]

  return {
    approvedNotes: newApproved,
    factCheckerNotes: remaining,
    approved: remaining.length === 0
  }
}
