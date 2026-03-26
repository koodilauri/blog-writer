import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import type { Serialized } from '@langchain/core/load/serializable'
import type { LLMResult } from '@langchain/core/outputs'
import type { BaseMessage } from '@langchain/core/messages'
import type { ChainValues } from '@langchain/core/utils/types'
import type { Logger } from 'pino'

const CONTENT_PREVIEW_LENGTH = 500

function previewContent(content: BaseMessage['content']): string {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return text.length > CONTENT_PREVIEW_LENGTH ? text.slice(0, CONTENT_PREVIEW_LENGTH) + '…' : text
}

export class LLMLoggingHandler extends BaseCallbackHandler {
  name = 'LLMLoggingHandler'

  constructor(
    private log: Logger,
    private runId: string
  ) {
    super()
  }

  // Chat models (ChatAnthropic, ChatOllama) call this instead of handleLLMStart
  handleChatModelStart(
    llm: Serialized,
    messages: BaseMessage[][],
    _llmRunId: string,
    _parentRunId?: string,
    _extraParams?: Record<string, unknown>,
    _tags?: string[],
    _metadata?: Record<string, unknown>,
    runName?: string
  ) {
    this.log.debug(
      {
        runId: this.runId,
        node: runName ?? llm.id?.at(-1),
        messages: messages[0]?.map(m => ({
          role: m._getType(),
          content: previewContent(m.content)
        }))
      },
      'llm input'
    )
  }

  handleLLMEnd(output: LLMResult) {
    const text = output.generations[0]?.[0]?.text ?? ''
    const usage = output.llmOutput?.usage as
      | { input_tokens?: number; output_tokens?: number }
      | undefined

    this.log.debug(
      {
        runId: this.runId,
        output:
          text.length > CONTENT_PREVIEW_LENGTH ? text.slice(0, CONTENT_PREVIEW_LENGTH) + '…' : text,
        tokens: usage ? { input: usage.input_tokens, output: usage.output_tokens } : undefined
      },
      'llm output'
    )
  }

  handleLLMError(err: Error) {
    this.log.error({ runId: this.runId, error: err.message }, 'llm error')
  }

  // Graph nodes show up as chains — log their entry and exit at info level
  handleChainStart(
    chain: Serialized,
    _inputs: ChainValues,
    _chainRunId: string,
    _parentRunId?: string,
    _tags?: string[],
    _metadata?: Record<string, unknown>,
    _runType?: string,
    runName?: string
  ) {
    const name = runName ?? chain.id?.at(-1)
    if (name) this.log.info({ runId: this.runId, node: name }, 'node start')
  }

  handleChainEnd(
    _outputs: ChainValues,
    _chainRunId: string,
    _parentRunId?: string,
    _tags?: string[],
    kwargs?: { inputs?: Record<string, unknown> }
  ) {
    const name = kwargs?.inputs?.name as string | undefined
    if (name) this.log.info({ runId: this.runId, node: name }, 'node end')
  }
}
