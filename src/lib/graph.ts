import { StateGraph, START, END, Send } from '@langchain/langgraph'
import { GraphState, type GraphStateType } from './agents/types.js'
import { queryGeneratorNode } from './agents/query-generator.js'
import { sourceFetcherNode } from './agents/source-fetcher.js'
import { sourceScorerNode } from './agents/source-scorer.js'
import { sourceApprovalNode } from './agents/source-approval.js'
import { outlinerNode } from './agents/outliner.js'
import { writerNode } from './agents/writer.js'
import { factCheckerNode } from './agents/fact-checker.js'
import { factCheckerApprovalNode } from './agents/fact-checker-approval.js'
import { editorNode } from './agents/editor.js'
import { seoNode } from './agents/seo.js'
import type { BaseCheckpointSaver } from '@langchain/langgraph'

const MAX_REVISIONS = 3

function routeAfterFactCheck(state: GraphStateType): 'fact_checker_approval' | 'editor' {
  return state.approved ? 'editor' : 'fact_checker_approval'
}

function shouldRevise(state: GraphStateType): 'writer' | 'editor' {
  if (!state.approved && state.revisionCount < MAX_REVISIONS) {
    return 'writer'
  }
  return 'editor'
}

function fanOutToFetchers(state: GraphStateType): Send[] {
  return state.queries.map(q => new Send('source_fetcher', { query: q }))
}

function shouldRetryResearch(state: GraphStateType): 'query_generator' | 'source_approval' {
  // sources === [] is the retry signal from source-scorer
  return state.sources.length === 0 ? 'query_generator' : 'source_approval'
}

export function buildGraph(checkpointer?: BaseCheckpointSaver) {
  const graph = new StateGraph(GraphState)
    .addNode('query_generator', queryGeneratorNode)
    .addNode('source_fetcher', sourceFetcherNode)
    .addNode('source_scorer', sourceScorerNode)
    .addNode('source_approval', sourceApprovalNode)
    .addNode('outliner', outlinerNode)
    .addNode('writer', writerNode)
    .addNode('fact_checker', factCheckerNode)
    .addNode('fact_checker_approval', factCheckerApprovalNode)
    .addNode('editor', editorNode)
    .addNode('seo', seoNode)
    .addEdge(START, 'query_generator')
    .addConditionalEdges('query_generator', fanOutToFetchers, ['source_fetcher'])
    .addEdge('source_fetcher', 'source_scorer')
    .addConditionalEdges('source_scorer', shouldRetryResearch, {
      query_generator: 'query_generator',
      source_approval: 'source_approval'
    })
    .addEdge('source_approval', 'outliner')
    .addEdge('outliner', 'writer')
    .addEdge('writer', 'fact_checker')
    .addConditionalEdges('fact_checker', routeAfterFactCheck, {
      fact_checker_approval: 'fact_checker_approval',
      editor: 'editor'
    })
    .addConditionalEdges('fact_checker_approval', shouldRevise, {
      writer: 'writer',
      editor: 'editor'
    })
    .addEdge('editor', 'seo')
    .addEdge('seo', END)

  return graph.compile({ checkpointer })
}
