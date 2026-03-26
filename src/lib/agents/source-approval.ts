import { interrupt } from '@langchain/langgraph'
import type { GraphStateType, Source } from './types.js'

export async function sourceApprovalNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const approved = interrupt({ sources: state.sources, scores: state.sourceScores }) as Source[]
  return { sources: approved }
}
