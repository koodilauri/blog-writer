import { Annotation } from '@langchain/langgraph'

export type Source = {
  url: string
  title: string
  content: string
}

export type SeoMeta = {
  titles: string[]
  metaDescription: string
  tags: string[]
  slug: string
}

export const GraphState = Annotation.Root({
  topic: Annotation<string>(),
  format: Annotation<string>(),
  tone: Annotation<string>(),
  sources: Annotation<Source[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  outline: Annotation<string>({
    reducer: (_, next) => next,
    default: () => ''
  }),
  draft: Annotation<string>({
    reducer: (_, next) => next,
    default: () => ''
  }),
  writerChanges: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  factCheckerNotes: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  approved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false
  }),
  revisionCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0
  }),
  editorNotes: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  finalPost: Annotation<string>({
    reducer: (_, next) => next,
    default: () => ''
  }),
  seoMeta: Annotation<SeoMeta | null>({
    reducer: (_, next) => next,
    default: () => null
  }),
  queries: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  rawSources: Annotation<Source[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  }),
  wordCount: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'medium (~600 words)'
  }),
  researchRetryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0
  }),
  sourceScores: Annotation<number[]>({
    reducer: (_, next) => next,
    default: () => []
  }),
  approvedNotes: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => []
  })
})

export type GraphStateType = typeof GraphState.State
