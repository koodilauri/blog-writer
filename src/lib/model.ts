import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'

export type SupportedModel = ChatAnthropic | ChatOllama | ChatOpenAI

// Maximum time to wait for a single LLM call (ms).
// Keeps the server from hanging indefinitely on slow/stalled API responses.
const LLM_TIMEOUT_MS = 90_000

type ModelEnv = {
  USE_CLAUDE?: string
  ANTHROPIC_API_KEY?: string
  USE_OPENAI?: string
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
}

let _env: ModelEnv = {}

export function initModelEnv(env: ModelEnv) {
  _env = env
}

export function getModel(): SupportedModel {
  if (_env.USE_CLAUDE === 'true') {
    const apiKey = _env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Missing env var ANTHROPIC_API_KEY')
    return new ChatAnthropic({ apiKey, model: 'claude-sonnet-4-5', timeout: LLM_TIMEOUT_MS })
  }

  if (_env.USE_OPENAI === 'true') {
    const apiKey = _env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing env var OPENAI_API_KEY')
    const model = _env.OPENAI_MODEL ?? 'gpt-4o-mini'
    return new ChatOpenAI({ apiKey, model, timeout: LLM_TIMEOUT_MS })
  }

  return new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2'
  })
}
