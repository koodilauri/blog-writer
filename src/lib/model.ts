import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { env as privateEnv } from '$env/dynamic/private'

export type SupportedModel = ChatAnthropic | ChatOllama | ChatOpenAI

export function getModel(): SupportedModel {
  if (privateEnv.USE_CLAUDE === 'true') {
    const apiKey = privateEnv.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Missing env var ANTHROPIC_API_KEY')
    return new ChatAnthropic({ apiKey, model: 'claude-sonnet-4-5' })
  }

  if (privateEnv.USE_OPENAI === 'true') {
    const apiKey = privateEnv.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing env var OPENAI_API_KEY')
    const model = privateEnv.OPENAI_MODEL ?? 'gpt-4o-mini'
    return new ChatOpenAI({ apiKey, model })
  }

  return new ChatOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2' })
}
