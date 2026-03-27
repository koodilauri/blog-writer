import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointMetadata,
  type CheckpointTuple
} from '@langchain/langgraph'
import type { RunnableConfig } from '@langchain/core/runnables'

/** Matches CheckpointPendingWrite: [taskId, channel, value] */
type PendingWriteTuple = [string, string, unknown]

type StoredTuple = {
  config: RunnableConfig
  checkpoint: Checkpoint
  metadata: CheckpointMetadata
  parentConfig?: RunnableConfig
}

/**
 * Reconstruct pendingWrites the way MemorySaver does: LangGraph stores per-task
 * channel writes under putWrites; without these, getState() never sees interrupts.
 */
async function loadPendingWritesFromR2(
  bucket: R2Bucket,
  threadId: string,
  checkpointId: string
): Promise<PendingWriteTuple[]> {
  const prefix = `${threadId}/writes/${checkpointId}/`
  const list = await bucket.list({ prefix, limit: 1000 })
  const out: PendingWriteTuple[] = []

  for (const o of list.objects) {
    if (!o.key.startsWith(prefix) || !o.key.endsWith('.json')) continue
    const base = o.key.slice(prefix.length)
    const taskId = base.replace(/\.json$/i, '')
    if (!taskId) continue

    const obj = await bucket.get(o.key)
    if (!obj) continue

    const raw = (await obj.json()) as unknown
    if (!Array.isArray(raw)) continue

    for (const pair of raw) {
      if (!Array.isArray(pair) || pair.length < 2) continue
      const [channel, value] = pair as [string, unknown]
      out.push([taskId, channel, value])
    }
  }

  return out
}

export class R2CheckpointSaver extends BaseCheckpointSaver {
  constructor(private bucket: R2Bucket) {
    super()
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id as string | undefined
    if (!threadId) return undefined

    const checkpointId = config.configurable?.checkpoint_id as string | undefined

    if (checkpointId) {
      const obj = await this.bucket.get(`${threadId}/${checkpointId}.json`)
      if (!obj) return undefined
      const stored = (await obj.json()) as StoredTuple
      const pendingWrites = await loadPendingWritesFromR2(this.bucket, threadId, checkpointId)
      return {
        config: {
          configurable: { thread_id: threadId, checkpoint_id: checkpointId }
        },
        checkpoint: stored.checkpoint,
        metadata: stored.metadata,
        parentConfig: stored.parentConfig,
        pendingWrites
      }
    }

    // Get latest checkpoint: list all for thread, sort by key (checkpoint IDs are timestamps)
    const list = await this.bucket.list({
      prefix: `${threadId}/`,
      limit: 1000
    })
    const checkpointKeys = list.objects
      .filter(o => o.key.endsWith('.json') && !o.key.includes('/writes/'))
      .map(o => o.key)
      .sort()
      .reverse()

    if (checkpointKeys.length === 0) return undefined

    const obj = await this.bucket.get(checkpointKeys[0])
    if (!obj) return undefined

    const stored = (await obj.json()) as StoredTuple
    const latestCheckpointId = checkpointKeys[0].replace(`${threadId}/`, '').replace('.json', '')
    const pendingWrites = await loadPendingWritesFromR2(this.bucket, threadId, latestCheckpointId)
    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_id: latestCheckpointId
        }
      },
      checkpoint: stored.checkpoint,
      metadata: stored.metadata,
      parentConfig: stored.parentConfig,
      pendingWrites
    }
  }

  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig }
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id as string | undefined
    if (!threadId) return

    const listResult = await this.bucket.list({ prefix: `${threadId}/` })
    const keys = listResult.objects
      .filter(o => o.key.endsWith('.json') && !o.key.includes('/writes/'))
      .map(o => o.key)
      .sort()
      .reverse()

    const limit = options?.limit ?? keys.length
    let count = 0

    for (const key of keys) {
      if (count >= limit) break
      const obj = await this.bucket.get(key)
      if (!obj) continue
      const stored = (await obj.json()) as StoredTuple
      const checkpointId = key.replace(`${threadId}/`, '').replace('.json', '')
      const pendingWrites = await loadPendingWritesFromR2(this.bucket, threadId, checkpointId)
      yield {
        config: {
          configurable: { thread_id: threadId, checkpoint_id: checkpointId }
        },
        checkpoint: stored.checkpoint,
        metadata: stored.metadata,
        parentConfig: stored.parentConfig,
        pendingWrites
      }
      count++
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id as string
    const checkpointId = checkpoint.id
    const parentCheckpointId = config.configurable?.checkpoint_id as string | undefined

    const stored: StoredTuple = {
      config,
      checkpoint,
      metadata,
      parentConfig: parentCheckpointId
        ? {
            configurable: {
              thread_id: threadId,
              checkpoint_id: parentCheckpointId
            }
          }
        : undefined
    }

    await this.bucket.put(`${threadId}/${checkpointId}.json`, JSON.stringify(stored))

    return {
      configurable: { thread_id: threadId, checkpoint_id: checkpointId }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async putWrites(config: RunnableConfig, writes: any[], taskId: string): Promise<void> {
    const threadId = config.configurable?.thread_id as string | undefined
    const checkpointId = config.configurable?.checkpoint_id as string | undefined
    if (!threadId || !checkpointId) return

    await this.bucket.put(
      `${threadId}/writes/${checkpointId}/${taskId}.json`,
      JSON.stringify(writes)
    )
  }
}
