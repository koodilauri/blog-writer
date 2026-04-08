import { interrupt } from '@langchain/langgraph'
import type { GraphStateType } from './types.js'

export async function outlinerApprovalNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const approved = interrupt(state.outline) as string
  return { outline: approved }
}
