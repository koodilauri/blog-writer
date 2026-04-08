<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { marked } from 'marked'

  function renderMd(text: string): string {
    return marked.parse(text, { async: false }) as string
  }

  type Source = { url: string; title: string; content?: string }
  type SeoMeta = { titles: string[]; metaDescription: string; tags: string[]; slug: string }
  type StageExtra =
    | { type: 'sources'; items: Source[] }
    | { type: 'list'; items: string[] }
    | { type: 'markdown'; content: string }
    | { type: 'seo'; meta: SeoMeta }
  type StageItem = {
    label: string
    detail?: string
    isRevision?: boolean
    extra?: StageExtra
    stageType?: string
    preview?: string
    isDone?: boolean
  }
  type StageEvent =
    | { stage: 'started'; runId: string }
    | { stage: 'query_generator'; label: string }
    | { stage: 'source_fetcher'; label: string }
    | { stage: 'source_scorer'; label: string; sources?: Source[] }
    | { stage: 'source_approval'; label: string }
    | { stage: 'outliner'; label: string; outline?: string }
    | { stage: 'writer'; label: string; revisionCount?: number; changes?: string[] }
    | { stage: 'writer_token'; token: string }
    | { stage: 'thinking_token'; node: string; token: string }
    | {
        stage: 'fact_checker'
        label: string
        approved?: boolean
        revisionCount?: number
        notes?: string[]
      }
    | { stage: 'editor'; label: string; notes?: string[] }
    | { stage: 'seo'; label: string; meta?: SeoMeta }
    | { stage: 'done'; runId: string; post: string; sources: Source[]; seoMeta?: SeoMeta }
    | { stage: 'interrupt'; type: 'outline'; content: string; runId: string }
    | { stage: 'interrupt'; type: 'sources'; sources: Source[]; scores: number[]; runId: string }
    | { stage: 'interrupt'; type: 'fact_checker'; notes: string[]; runId: string }
    | { stage: 'error'; error: string }

  const postId = $derived(page.params.id)
  const isDemo = $derived(page.url.searchParams.has('demo'))

  let topic = $state('')
  let format = $state('blog post')
  let tone = $state('formal and informative')
  let wordCount = $state('medium (~600 words)')

  let running = $state(false)
  let stages = $state<StageItem[]>([])
  let writingDraft = $state('')
  let finalPost = $state('')
  let sources = $state<Source[]>([])
  let seoMeta = $state<SeoMeta | null>(null)
  let errorMsg = $state('')
  let runId = $state('')
  let interrupted = $state(false)
  let interruptedOutline = $state('')
  let canResume = $state(false)
  let sourcesInterrupted = $state(false)
  let interruptedSources = $state<Source[]>([])
  let interruptedScores = $state<number[]>([])
  let checkedSources = $state(new Set<string>())
  let addUrlsInput = $state('')

  let controller: AbortController | null = null
  let stalled = $state(false)
  let stallTimer: ReturnType<typeof setTimeout> | null = null
  let saveSessionTimer: ReturnType<typeof setTimeout> | null = null
  let currentDraft = $state('')
  let revisionNotes = $state<string[]>([])
  let firstDraftDone = $state(false)
  let thinkingNode = $state<string | null>(null)
  let thinkingBuffer = $state('')
  let writingOutline = $state('')
  let showResumePrompt = $state(false)
  let savedSession = $state<Record<string, unknown> | null>(null)
  let lastStageType = $state('')
  let revTooltip = $state<{
    note: string
    noteIndex: number
    x: number
    y: number
    below: boolean
  } | null>(null)
  let paused = $state(false)
  let approvedNotes = $state(new Set<number>())
  let factCheckerInterrupted = $state(false)
  let interruptedFactNotes = $state<string[]>([])
  let approvedFactNotes = $state(new Set<string>())

  let notFound = $state(false)

  // Reset notFound if the URL changes to a different draft (component reuse across navigations)
  $effect(() => {
    void postId
    notFound = false
  })

  // ── Layout context ───────────────────────────────────────────────
  type PipelineCtx = {
    active: boolean
    stages: StageItem[]
    running: boolean
    stalled: boolean
    paused: boolean
    runId: string
    firstDraftDone: boolean
    writingDraft: string
    revisionNotes: string[]
    approvedNotes: Set<number>
    factCheckerInterrupted: boolean
    onRetry: () => void
    onPause: () => void
    onResume: () => void
    onRevise: () => void
    onApproveAll: () => void
  }
  const appCtx = getContext<{ pipeline: PipelineCtx; refreshHistory: () => void }>('app')

  $effect(() => {
    appCtx.pipeline.active = true
    appCtx.pipeline.stages = stages
    appCtx.pipeline.running = running
    appCtx.pipeline.stalled = stalled
    appCtx.pipeline.paused = paused
    appCtx.pipeline.runId = runId
    appCtx.pipeline.firstDraftDone = firstDraftDone
    appCtx.pipeline.writingDraft = writingDraft
    appCtx.pipeline.thinkingNode = thinkingNode ?? ''
    appCtx.pipeline.thinkingBuffer = thinkingBuffer
    appCtx.pipeline.revisionNotes = revisionNotes
    appCtx.pipeline.approvedNotes = approvedNotes
    appCtx.pipeline.factCheckerInterrupted = factCheckerInterrupted
    appCtx.pipeline.onRetry = retryCurrentStep
    appCtx.pipeline.onPause = pauseGeneration
    appCtx.pipeline.onResume = resumeFromPause
    appCtx.pipeline.onRevise = () => approveFactCheckerNotes(approvedFactNotes)
    appCtx.pipeline.onApproveAll = () => approveFactCheckerNotes(new Set(interruptedFactNotes))
  })

  onDestroy(() => {
    appCtx.pipeline.active = false
    appCtx.pipeline.stages = []
    appCtx.pipeline.running = false
    appCtx.pipeline.paused = false
    appCtx.pipeline.stalled = false
  })

  onMount(async () => {
    if (isDemo) {
      const stored = sessionStorage.getItem(`draft:${postId}`)
      if (stored) {
        sessionStorage.removeItem(`draft:${postId}`)
        const params = JSON.parse(stored) as Record<string, string>
        topic = params.topic ?? topic
        format = params.format ?? format
        tone = params.tone ?? tone
        wordCount = params.wordCount ?? wordCount
      }
      await startGeneration()
      return
    }

    const email = localStorage.getItem('auth_email')
    if (!email) {
      goto('/login')
      return
    }

    // Try sessionStorage first (normal flow)
    const stored = sessionStorage.getItem(`draft:${postId}`)
    if (stored) {
      sessionStorage.removeItem(`draft:${postId}`)
      const params = JSON.parse(stored) as Record<string, string>
      topic = params.topic ?? topic
      format = params.format ?? format
      tone = params.tone ?? tone
      wordCount = params.wordCount ?? wordCount
      await startGeneration()
      return
    }

    // Fallback: check saved session (e.g. page refresh mid-stream)
    const sessRes = await fetch('/api/session')
    if (sessRes.ok) {
      const data = (await sessRes.json()) as Record<string, unknown> | null
      if (data && typeof data.runId === 'string' && data.runId === postId && !data.finalPost) {
        savedSession = data
        await resumeSavedSession()
        return
      }
    }

    // Nothing found — draft not available; clear any stale session so generate page doesn't loop
    notFound = true
    clearSession()
  })

  async function startGeneration() {
    const endpoint = isDemo ? '/api/demo' : '/api/generate'
    running = true
    controller = new AbortController()
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic, format, tone, wordCount, runId: postId }),
      signal: controller.signal
    })
    if (!res.ok || !res.body) {
      if (res.status === 401) {
        await goto('/login')
        return
      }
      try {
        const d = (await res.json()) as { error?: string }
        errorMsg = d.error ?? `Request failed (${res.status})`
      } catch {
        errorMsg = `Request failed (${res.status})`
      }
      running = false
      return
    }
    await consumeStream(res)
  }

  async function streamResume(body: {
    runId: string
    outline?: string
    sources?: Source[]
    addUrls?: string[]
    approvedNotes?: string[]
    factCheckerApproval?: string[]
  }) {
    running = true
    paused = false
    interrupted = false
    sourcesInterrupted = false
    factCheckerInterrupted = false
    interruptedFactNotes = []
    approvedFactNotes = new Set()
    errorMsg = ''
    canResume = false
    writingDraft = ''
    finalPost = ''
    sources = []
    seoMeta = null

    controller = new AbortController()
    stalled = false
    const res = await fetch('/api/resume', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!res.ok || !res.body) {
      if (res.status === 401) {
        await goto('/login')
        return
      }
      try {
        const d = (await res.json()) as { error?: string }
        errorMsg = d.error ?? `Request failed (${res.status})`
      } catch {
        errorMsg = `Request failed (${res.status})`
      }
      running = false
      return
    }

    await consumeStream(res)
  }

  async function consumeStream(res: Response) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    resetStallTimer()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resetStallTimer()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as StageEvent
            if (event.stage === 'started') {
              runId = event.runId
            } else if (event.stage === 'interrupt' && event.type === 'outline') {
              interrupted = true
              interruptedOutline = event.content
              running = false
              clearStallTimer()
              saveSessionNow()
            } else if (event.stage === 'interrupt' && event.type === 'sources') {
              sourcesInterrupted = true
              interruptedSources = event.sources
              interruptedScores = event.scores
              checkedSources = new Set(event.sources.map(s => s.url))
              running = false
              clearStallTimer()
              saveSessionNow()
            } else if (event.stage === 'interrupt' && event.type === 'fact_checker') {
              factCheckerInterrupted = true
              interruptedFactNotes = event.notes
              approvedFactNotes = new Set()
              running = false
              clearStallTimer()
              saveSessionNow()
            } else if (event.stage === 'done') {
              currentDraft = event.post
              finalPost = event.post
              sources = event.sources ?? []
              seoMeta = event.seoMeta ?? null
              running = false
              clearStallTimer()
              clearSession()
              stages = [...stages, { label: 'Post complete', stageType: 'done', isDone: true }]
              if (!isDemo) {
                fetch('/api/posts', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    runId,
                    topic,
                    format,
                    tone,
                    wordCount,
                    post: event.post,
                    sources: event.sources ?? [],
                    seoMeta: event.seoMeta ?? null
                  })
                })
                  .then(() => appCtx.refreshHistory())
                  .catch(() => {})
              }
            } else if (event.stage === 'error') {
              errorMsg = event.error
              canResume = !!runId
              running = false
              clearStallTimer()
              scheduleSaveSession()
            } else if (event.stage === 'thinking_token') {
              thinkingNode = event.node
              thinkingBuffer += event.token
              if (event.node === 'outliner') writingOutline += event.token
            } else if (event.stage === 'writer_token') {
              if (firstDraftDone && revisionNotes.length > 0) {
                revisionNotes = []
                approvedNotes = new Set()
              }
              writingDraft += event.token
            } else if (
              event.stage === 'query_generator' ||
              event.stage === 'source_fetcher' ||
              event.stage === 'source_approval'
            ) {
              thinkingNode = null
              thinkingBuffer = ''
              stages = [...stages, { label: event.label, stageType: event.stage }]
              lastStageType = event.stage
              scheduleSaveSession()
            } else if (event.stage === 'source_scorer') {
              const srcs = event.sources ?? []
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  extra: srcs.length > 0 ? { type: 'sources', items: srcs } : undefined
                }
              ]
              lastStageType = event.stage
              scheduleSaveSession()
            } else if (event.stage === 'outliner') {
              thinkingNode = null
              thinkingBuffer = ''
              writingOutline = ''
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  extra: event.outline ? { type: 'markdown', content: event.outline } : undefined,
                  preview: event.outline ? event.outline.slice(0, 240) : undefined
                }
              ]
              lastStageType = event.stage
              scheduleSaveSession()
            } else if (event.stage === 'writer') {
              thinkingNode = null
              thinkingBuffer = ''
              if (writingDraft) currentDraft = writingDraft
              writingDraft = ''
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  extra:
                    (event.changes ?? []).length > 0
                      ? { type: 'list', items: event.changes! }
                      : undefined
                }
              ]
              lastStageType = event.stage
              scheduleSaveSession()
            } else if (event.stage === 'fact_checker') {
              if (writingDraft) currentDraft = writingDraft
              firstDraftDone = true
              revisionNotes = event.approved ? [] : (event.notes ?? [])
              const detail = event.approved
                ? '✓ approved'
                : `✗ revision ${(event.revisionCount ?? 0) + 1} needed`
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  detail,
                  isRevision: !event.approved,
                  extra:
                    (event.notes ?? []).length > 0
                      ? { type: 'list', items: event.notes! }
                      : undefined
                }
              ]
              lastStageType = event.stage
              scheduleSaveSession()
            } else if (event.stage === 'editor') {
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  extra:
                    (event.notes ?? []).length > 0
                      ? { type: 'list', items: event.notes! }
                      : undefined
                }
              ]
              lastStageType = event.stage
            } else if (event.stage === 'seo') {
              stages = [
                ...stages,
                {
                  label: event.label,
                  stageType: event.stage,
                  extra: event.meta ? { type: 'seo', meta: event.meta } : undefined
                }
              ]
              lastStageType = event.stage
            }
          } catch {
            /* ignore malformed SSE */
          }
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        errorMsg = 'Stream read error'
        running = false
      }
      clearStallTimer()
    }
  }

  async function resumeWithOutline() {
    await streamResume({ runId, outline: interruptedOutline })
  }
  async function resumeFromCheckpoint() {
    await streamResume({ runId })
  }

  function toggleSource(url: string) {
    if (checkedSources.has(url)) checkedSources.delete(url)
    else checkedSources.add(url)
    checkedSources = new Set(checkedSources)
  }

  async function approveSources() {
    const approved = interruptedSources.filter(s => checkedSources.has(s.url))
    const urls = addUrlsInput
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)
    await streamResume({ runId, sources: approved, addUrls: urls })
  }

  async function approveFactCheckerNotes(approvedSet: Set<string>) {
    factCheckerInterrupted = false
    await streamResume({ runId, factCheckerApproval: [...approvedSet] })
  }

  function goBack() {
    if (running) {
      if (!window.confirm('Generation is still running. Leave anyway?')) return
      controller?.abort()
    }
    goto('/generate')
  }

  // ── Stall detection ──────────────────────────────────────────────
  function resetStallTimer() {
    if (stallTimer) clearTimeout(stallTimer)
    stalled = false
    stallTimer = setTimeout(() => {
      stalled = true
    }, 60000)
  }
  function clearStallTimer() {
    if (stallTimer) {
      clearTimeout(stallTimer)
      stallTimer = null
    }
    stalled = false
  }
  async function retryCurrentStep() {
    controller?.abort()
    clearStallTimer()
    if (runId) await streamResume({ runId })
  }

  function pauseGeneration() {
    controller?.abort()
    clearStallTimer()
    running = false
    paused = true
  }

  async function resumeFromPause() {
    if (!runId) return
    const approved = [...approvedNotes].map(i => revisionNotes[i]).filter(Boolean)
    await streamResume({ runId, approvedNotes: approved.length > 0 ? approved : undefined })
    approvedNotes = new Set()
  }

  function approveNote(index: number) {
    approvedNotes = new Set([...approvedNotes, index])
    revTooltip = null
  }

  // ── Session persistence ──────────────────────────────────────────
  function buildSessionData() {
    return {
      runId,
      topic,
      format,
      tone,
      wordCount,
      stages,
      currentDraft,
      revisionNotes,
      interrupted,
      interruptedOutline,
      sourcesInterrupted,
      interruptedSources,
      interruptedScores,
      factCheckerInterrupted,
      interruptedFactNotes
    }
  }

  function saveSessionNow() {
    if (isDemo || !runId || finalPost) return
    fetch('/api/session', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildSessionData())
    }).catch(() => {})
  }

  function scheduleSaveSession() {
    if (isDemo) return
    if (saveSessionTimer) clearTimeout(saveSessionTimer)
    saveSessionTimer = setTimeout(() => {
      if (!runId || finalPost) return
      fetch('/api/session', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildSessionData())
      }).catch(() => {})
    }, 800)
  }
  function clearSession() {
    if (isDemo) return
    fetch('/api/session', { method: 'DELETE' }).catch(() => {})
  }
  async function resumeSavedSession() {
    if (!savedSession) return
    showResumePrompt = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = savedSession as any
    topic = s.topic ?? topic
    format = s.format ?? format
    tone = s.tone ?? tone
    wordCount = s.wordCount ?? wordCount
    stages = s.stages ?? []
    currentDraft = s.currentDraft ?? ''
    revisionNotes = s.revisionNotes ?? []
    runId = s.runId ?? ''
    interrupted = s.interrupted ?? false
    interruptedOutline = s.interruptedOutline ?? ''
    sourcesInterrupted = s.sourcesInterrupted ?? false
    interruptedSources = s.interruptedSources ?? []
    interruptedScores = s.interruptedScores ?? []
    if (interruptedSources.length > 0)
      checkedSources = new Set(interruptedSources.map((x: Source) => x.url))
    factCheckerInterrupted = s.factCheckerInterrupted ?? false
    interruptedFactNotes = s.interruptedFactNotes ?? []
    approvedFactNotes = new Set()
    savedSession = null
    if (!interrupted && !sourcesInterrupted && !factCheckerInterrupted && runId) {
      await streamResume({ runId })
    }
  }
  async function discardSession() {
    showResumePrompt = false
    savedSession = null
    clearSession()
    goto('/generate')
  }

  // ── Revision highlighting ────────────────────────────────────────
  function escHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function findClaimSpan(draft: string, claim: string): { start: number; end: number } | null {
    const dLow = draft.toLowerCase()
    const cLow = claim.toLowerCase().trim()
    const exact = dLow.indexOf(cLow)
    if (exact !== -1) return { start: exact, end: exact + cLow.length }
    const claimWords = cLow.match(/\w+/g) ?? []
    if (claimWords.length < 4) return null
    const anchor = claimWords[0]
    const lastW = claimWords[claimWords.length - 1]
    let pos = 0
    let bestRange: { start: number; end: number } | null = null
    let bestScore = 0.6
    while (true) {
      const anchorPos = dLow.indexOf(anchor, pos)
      if (anchorPos === -1) break
      const windowEnd = Math.min(draft.length, anchorPos + Math.ceil(claim.length * 1.5))
      const window = dLow.slice(anchorPos, windowEnd)
      const windowWords = new Set(window.match(/\w+/g) ?? [])
      const score = claimWords.filter(w => windowWords.has(w)).length / claimWords.length
      if (score > bestScore) {
        bestScore = score
        const lastInWindow = window.lastIndexOf(lastW)
        const end =
          lastInWindow !== -1
            ? anchorPos + lastInWindow + lastW.length
            : Math.min(draft.length, anchorPos + claim.length)
        bestRange = { start: anchorPos, end: end }
      }
      pos = anchorPos + 1
    }
    return bestRange
  }
  function findRevisionRanges(draft: string, notes: string[], skipIndices?: Set<number>) {
    const parts = draft.split(/(\n\n+)/)
    const paragraphs: { text: string; start: number; end: number }[] = []
    let pOffset = 0
    for (const part of parts) {
      if (!/^\n+$/.test(part) && part.trim()) {
        paragraphs.push({ text: part, start: pOffset, end: pOffset + part.length })
      }
      pOffset += part.length
    }
    const ranges: { start: number; end: number; noteIndex: number }[] = []
    for (let ni = 0; ni < notes.length; ni++) {
      if (skipIndices?.has(ni)) continue
      const claimMatch = notes[ni].match(/^Claim:\s*"([^"]+)"/)
      if (claimMatch) {
        const span = findClaimSpan(draft, claimMatch[1])
        if (span) {
          ranges.push({ ...span, noteIndex: ni })
          continue
        }
      }
      const matchText = claimMatch ? claimMatch[1] : notes[ni]
      const matchWords = matchText.toLowerCase().match(/\w+/g) ?? []
      if (!matchWords.length) continue
      let bestPara: (typeof paragraphs)[0] | null = null
      let bestRatio = 0.38
      for (const para of paragraphs) {
        const paraWords = new Set(para.text.toLowerCase().match(/\w+/g) ?? [])
        const hits = matchWords.filter(w => paraWords.has(w)).length
        const ratio = hits / matchWords.length
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestPara = para
        }
      }
      if (bestPara) {
        ranges.push({ start: bestPara.start, end: bestPara.end, noteIndex: ni })
      }
    }
    return ranges
  }
  function renderHighlighted(
    text: string,
    ranges: { start: number; end: number; noteIndex: number }[]
  ) {
    if (!ranges.length) return escHtml(text)
    const sorted = [...ranges].sort((a, b) => a.start - b.start)
    let out = ''
    let pos = 0
    for (const r of sorted) {
      if (r.start > pos) out += escHtml(text.slice(pos, r.start))
      out += `<mark class="rev-mark" data-note="${r.noteIndex}">${escHtml(text.slice(r.start, r.end))}</mark>`
      pos = r.end
    }
    if (pos < text.length) out += escHtml(text.slice(pos))
    return out
  }
  const approvedFactNoteIndices = $derived(
    new Set(
      interruptedFactNotes.map((n, i) => (approvedFactNotes.has(n) ? i : -1)).filter(i => i !== -1)
    )
  )
  const draftHtml = $derived(
    !firstDraftDone && writingDraft
      ? escHtml(writingDraft)
      : currentDraft
        ? factCheckerInterrupted
          ? renderHighlighted(
              currentDraft,
              findRevisionRanges(currentDraft, interruptedFactNotes, approvedFactNoteIndices)
            )
          : revisionNotes.length > 0
            ? renderHighlighted(
                currentDraft,
                findRevisionRanges(currentDraft, revisionNotes, approvedNotes)
              )
            : escHtml(currentDraft)
        : ''
  )
  const hasLeftContent = $derived(
    sourcesInterrupted || interrupted || factCheckerInterrupted || !!(currentDraft || writingDraft)
  )

  // Sources visible during generation (from scorer stage), falls back to final sources
  const liveSources = $derived(
    sources.length > 0
      ? sources
      : ((
          stages.findLast(s => s.extra?.type === 'sources')?.extra as
            | { type: 'sources'; items: Source[] }
            | undefined
        )?.items ?? [])
  )
  const currentActivity = $derived(
    stalled
      ? 'Stalled'
      : lastStageType === 'query_generator'
        ? 'Fetching sources…'
        : lastStageType === 'source_fetcher'
          ? 'Scoring sources…'
          : lastStageType === 'source_scorer'
            ? 'Waiting for source approval…'
            : lastStageType === 'source_approval'
              ? 'Generating outline…'
              : lastStageType === 'outliner'
                ? 'Starting draft…'
                : lastStageType === 'writer'
                  ? 'Fact-checking…'
                  : lastStageType === 'fact_checker' && thinkingNode !== 'editor'
                    ? 'Revising…'
                    : thinkingNode === 'editor' || lastStageType === 'writer'
                      ? 'Final editing…'
                      : lastStageType === 'editor'
                        ? 'Generating SEO…'
                        : 'Working…'
  )

  function onDraftClick(e: MouseEvent) {
    const mark = (e.target as HTMLElement).closest('[data-note]') as HTMLElement | null
    if (!mark) {
      revTooltip = null
      return
    }
    const ni = parseInt(mark.dataset.note ?? '', 10)
    const activeNotes = factCheckerInterrupted ? interruptedFactNotes : revisionNotes
    if (isNaN(ni) || !activeNotes[ni]) {
      revTooltip = null
      return
    }
    if (revTooltip?.noteIndex === ni) {
      revTooltip = null
      return
    }
    const rect = mark.getBoundingClientRect()
    const below = rect.top < 180
    revTooltip = {
      note: activeNotes[ni],
      noteIndex: ni,
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom : rect.top,
      below
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* silent */
    }
  }
</script>

<main>
  {#if notFound}
    <div class="not-found-card card">
      <p class="not-found-msg">Draft not found.</p>
      <button class="action-btn" onclick={() => goto('/generate')}>← Back to generate</button>
    </div>
  {:else}
    {#if isDemo}
      <div class="demo-banner" role="status">
        <div class="demo-banner-left">
          <span class="demo-badge">DEMO</span>
          <span>This is a simulated run — pre-recorded content, no API calls.</span>
        </div>
        <a href="/login" class="demo-signin-link">Sign in →</a>
      </div>
    {/if}

    {#if showResumePrompt && savedSession}
      <div class="resume-banner" role="alert">
        <div class="resume-banner-icon">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor"
            ><path
              fill-rule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
              clip-rule="evenodd"
            /></svg
          >
        </div>
        <div class="resume-banner-body">
          <p class="resume-banner-title">Resume in-progress post?</p>
          <p class="resume-banner-sub">{(savedSession as any).topic ?? 'Untitled'}</p>
        </div>
        <div class="resume-banner-actions">
          <button class="resume-btn" onclick={resumeSavedSession}>Resume</button>
          <button class="discard-btn" onclick={discardSession}>Discard</button>
        </div>
      </div>
    {/if}

    {#if stages.length > 0 || running || currentDraft || sourcesInterrupted || interrupted || factCheckerInterrupted}
      <div>
        {#if running && !currentDraft && !writingDraft && !sourcesInterrupted && !interrupted && !factCheckerInterrupted}
          <!-- Waiting view: show sources as they come in -->
          <section class="card waiting-card">
            <div class="waiting-header">
              <span class="spin-sm"></span>
              <span class="waiting-label">{currentActivity}</span>
            </div>
            {#if liveSources.length > 0}
              <div class="waiting-sources">
                <p class="waiting-sources-label">Sources found</p>
                <ul class="waiting-sources-list">
                  {#each liveSources as s}
                    <li>
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        >{s.title || s.url}</a
                      >
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if writingOutline}
              <div class="waiting-outline">
                <p class="waiting-sources-label">Generating outline…</p>
                <pre class="waiting-outline-text">{writingOutline}</pre>
              </div>
            {/if}
          </section>
        {:else if sourcesInterrupted}
          <section class="card review-sources-card">
            <div class="card-head">
              <h2>Review Sources</h2>
              <p>Uncheck sources to remove them, add your own URLs, then approve.</p>
            </div>
            <ul class="source-list">
              {#each interruptedSources as source, i}
                {@const score = interruptedScores[i] ?? 3}
                <li class="source-item">
                  <input
                    type="checkbox"
                    checked={checkedSources.has(source.url)}
                    onchange={() => toggleSource(source.url)}
                    class="source-check"
                  />
                  <span
                    class="score-badge"
                    class:high={score >= 4}
                    class:mid={score === 3}
                    class:low={score < 3}>{score}/5</span
                  >
                  <a href={source.url} target="_blank" rel="noopener noreferrer" class="source-link"
                    >{source.title || source.url}</a
                  >
                </li>
              {/each}
            </ul>
            <div class="field" style="margin-top: 1rem;">
              <label for="add-urls">Add URLs (one per line)</label>
              <textarea
                id="add-urls"
                bind:value={addUrlsInput}
                rows={3}
                placeholder="https://example.com/article"
              ></textarea>
            </div>
            <button
              class="action-btn"
              onclick={approveSources}
              disabled={running || checkedSources.size === 0}
            >
              {#if running}<span class="spin"></span> Resuming…{:else}Approve & Continue{/if}
            </button>
          </section>
        {:else if interrupted}
          <section class="card">
            <div class="card-head">
              <h2>Review Outline</h2>
              <p>Edit below, then continue to start writing.</p>
            </div>
            <div class="field">
              <textarea bind:value={interruptedOutline} class="outline-textarea"></textarea>
            </div>
            <button class="action-btn" onclick={resumeWithOutline} disabled={running}>
              {#if running}<span class="spin"></span> Resuming…{:else}Continue with this outline{/if}
            </button>
          </section>
        {:else if currentDraft || writingDraft}
          <section class="card draft-card">
            <div class="draft-card-header">
              <h2>{finalPost ? 'Generated Post' : 'Draft'}</h2>
              {#if finalPost}
                <div class="result-actions">
                  {#if sources.length > 0}
                    <details class="sources-detail">
                      <summary>{sources.length} source{sources.length !== 1 ? 's' : ''}</summary>
                      <div class="sources-popup">
                        <p class="sources-popup-label">Sources</p>
                        <ul>
                          {#each sources as s}
                            <li>
                              <a href={s.url} target="_blank" rel="noopener noreferrer"
                                >{s.title || s.url}</a
                              >
                            </li>
                          {/each}
                        </ul>
                      </div>
                    </details>
                  {/if}
                  <button class="copy-btn" onclick={() => copyToClipboard(finalPost)}>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"
                      ><path
                        d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
                      /><path
                        d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
                      /></svg
                    >
                    Copy
                  </button>
                </div>
              {:else if running && !firstDraftDone}
                <span class="live-badge"><span class="live-dot"></span>Writing first draft…</span>
              {:else if running}
                <span
                  class="live-badge"
                  style="color:#a78bfa;border-color:rgba(167,139,250,0.25);background:rgba(167,139,250,0.08)"
                  ><span class="live-dot" style="background:#a78bfa"></span>{thinkingNode ===
                  'editor'
                    ? 'Final editing…'
                    : 'Revising…'}</span
                >
              {:else if revisionNotes.length > 0}
                <span class="revision-badge">revision highlights</span>
              {/if}
            </div>
            {#if draftHtml}
              {#if finalPost}
                <pre class="draft-body draft-raw">{finalPost}</pre>
              {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="draft-body" onclick={onDraftClick}>{@html draftHtml}</div>
              {/if}
              {#if revTooltip}
                {@const tooltipApproved = factCheckerInterrupted
                  ? approvedFactNotes.has(interruptedFactNotes[revTooltip.noteIndex])
                  : approvedNotes.has(revTooltip.noteIndex)}
                <div
                  class="rev-tooltip"
                  class:flip={revTooltip.below}
                  style="left:{revTooltip.x}px;top:{revTooltip.y}px"
                >
                  <p class="rev-tooltip-note">{revTooltip.note}</p>
                  {#if !tooltipApproved}
                    <button
                      class="rev-tooltip-approve"
                      onclick={() => {
                        if (factCheckerInterrupted) {
                          const note = interruptedFactNotes[revTooltip!.noteIndex]
                          if (note) {
                            const next = new Set(approvedFactNotes)
                            next.add(note)
                            approvedFactNotes = next
                          }
                        } else {
                          approveNote(revTooltip!.noteIndex)
                        }
                        revTooltip = null
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"
                        ><path
                          fill-rule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clip-rule="evenodd"
                        /></svg
                      >
                      Mark as OK
                    </button>
                  {:else}
                    <span class="rev-tooltip-approved">✓ Approved</span>
                  {/if}
                </div>
              {/if}
              {#if revisionNotes.length > 0 && !finalPost && firstDraftDone && !factCheckerInterrupted}
                <div class="revision-notes">
                  <p class="revision-notes-label">Revision notes</p>
                  {#each revisionNotes as note}
                    <div class="revision-note-item">
                      <span class="revision-note-bullet">–</span>
                      <span>{note}</span>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if finalPost}
                <div class="post-footer">
                  <span>{finalPost.trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>·</span>
                  <span>{finalPost.length} chars</span>
                </div>
              {/if}
            {:else}
              <div class="draft-empty">
                <span class="spin-sm"></span>
                <span>Writing first draft…</span>
              </div>
            {/if}
          </section>
        {/if}
      </div>
    {/if}

    <!-- Error -->
    {#if errorMsg}
      <div class="error-banner" role="alert">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
          ><path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
            clip-rule="evenodd"
          /></svg
        >
        <div>
          <span>{errorMsg}</span>
          {#if canResume && !running}
            <button class="resume-link" onclick={resumeFromCheckpoint}
              >Resume from last checkpoint</button
            >
          {/if}
        </div>
      </div>
    {/if}

    <!-- SEO (shown after generation completes) -->
    {#if finalPost && seoMeta}
      <section class="card">
        <div class="card-head">
          <h2>SEO Metadata</h2>
          <p>Click any item to copy.</p>
        </div>

        <div class="seo-section">
          <p class="seo-label">Title options</p>
          <ul class="seo-titles">
            {#each seoMeta.titles as title}
              <li>
                <button class="seo-copy-row" onclick={() => copyToClipboard(title)}>
                  <span>{title}</span>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
                    ><path
                      d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
                    /><path
                      d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
                    /></svg
                  >
                </button>
              </li>
            {/each}
          </ul>
        </div>

        <div class="seo-section">
          <p class="seo-label">
            Meta description <span class="seo-count">({seoMeta.metaDescription.length} chars)</span>
          </p>
          <button class="seo-copy-row" onclick={() => copyToClipboard(seoMeta!.metaDescription)}>
            <span class="seo-desc">{seoMeta.metaDescription}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="currentColor"
              style="flex-shrink:0;margin-top:2px"
              ><path
                d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
              /><path
                d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
              /></svg
            >
          </button>
        </div>

        <div class="seo-two-col">
          <div class="seo-section">
            <p class="seo-label">Slug</p>
            <button class="seo-copy-row" onclick={() => copyToClipboard(seoMeta!.slug)}>
              <code class="seo-slug">{seoMeta.slug}</code>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
                ><path
                  d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
                /><path
                  d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
                /></svg
              >
            </button>
          </div>
          <div class="seo-section">
            <p class="seo-label">Tags</p>
            <div class="seo-tags">
              {#each seoMeta.tags as tag}
                <button class="tag-chip" onclick={() => copyToClipboard(tag)}>{tag}</button>
              {/each}
            </div>
          </div>
        </div>
      </section>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    overflow-x: hidden;
  }

  .app {
    min-height: 100vh;
    background: #080c14;
    font-family: 'Inter', ui-sans-serif, sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
  }
  .orb-1 {
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(59, 77, 232, 0.14) 0%, transparent 70%);
    top: -200px;
    left: -200px;
    animation: orbDrift 32s ease-in-out infinite;
  }
  .orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%);
    top: 30%;
    right: -150px;
    animation: orbDrift 40s ease-in-out infinite reverse;
  }
  .orb-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(29, 78, 216, 0.09) 0%, transparent 70%);
    bottom: -100px;
    left: 30%;
    animation: orbDrift 28s ease-in-out infinite;
    animation-delay: -10s;
  }
  @keyframes orbDrift {
    0%,
    100% {
      transform: translate(0, 0);
    }
    33% {
      transform: translate(40px, 30px);
    }
    66% {
      transform: translate(-20px, 50px);
    }
  }
  .bg-dots {
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%);
    pointer-events: none;
    z-index: 0;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    height: 52px;
    background: rgba(8, 12, 20, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .hd-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .hd-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 7px;
    color: rgba(255, 255, 255, 0.45);
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .back-btn:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.75);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.25) 0%,
      rgba(129, 140, 248, 0.12) 100%
    );
    border: 1px solid rgba(129, 140, 248, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .logo-name {
    font-family: 'DM Sans', 'Inter', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    background: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 50%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }
  .logo-tag {
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(129, 140, 248, 0.5);
    line-height: 1;
  }
  .user-email {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.3);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .body {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    min-height: 0;
  }

  main {
    flex: 1;
    min-width: 0;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 1160px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .not-found-card {
    text-align: center;
    padding: 3rem 1.5rem;
  }
  .not-found-msg {
    color: rgba(255, 255, 255, 0.4);
    margin: 0 0 1.5rem;
    font-size: 0.95rem;
  }

  /* ── Two-column generation layout ───────────────── */
  .gen-layout {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
  }
  .left-col {
    flex: 1 1 320px;
    min-width: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.32s ease;
  }
  .gen-layout.has-left .left-col {
    opacity: 1;
    pointer-events: auto;
  }
  .pipeline-col {
    flex: 0 0 280px;
  }
  .pipeline-card {
    padding: 1rem 1.125rem;
  }
  .pipeline-card .card-head {
    margin-bottom: 0.875rem;
  }

  /* ── Cards ───────────────────────────────────────── */
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.5rem;
  }

  /* ── Waiting / sources-found view ─────────────────── */
  .waiting-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .waiting-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.85rem;
  }
  .waiting-label {
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.85rem;
  }
  .waiting-sources-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
    margin: 0 0 0.6rem;
  }
  .waiting-sources-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .waiting-sources-list a {
    font-size: 0.82rem;
    color: #818cf8;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .waiting-outline {
    margin-top: 1rem;
  }
  .waiting-outline-text {
    font-family: 'Lora', Georgia, serif;
    font-size: 0.85rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.45);
    white-space: pre-wrap;
    margin: 0;
    background: none;
    border: none;
    padding: 0;
  }
  .waiting-sources-list a:hover {
    text-decoration: underline;
  }

  .card-head {
    margin-bottom: 1.25rem;
  }
  .card-head h2 {
    font-family: 'DM Sans', 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.02em;
    margin: 0 0 0.2rem;
  }
  .card-head p {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  label {
    font-size: 0.78rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.01em;
  }
  .outline-textarea {
    field-sizing: content; /* auto-grow with content */
    min-height: 12rem;
  }
  textarea {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #f1f5f9;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    padding: 0.7rem 0.875rem;
    outline: none;
    resize: vertical;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background 0.2s;
    width: 100%;
    box-sizing: border-box;
    min-height: 80px;
  }
  textarea::placeholder {
    color: rgba(255, 255, 255, 0.12);
  }
  textarea:focus {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(129, 140, 248, 0.06);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
  }

  /* ── Pipeline ─────────────────────────────────────── */
  .pipeline {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .pip-dot {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 3px;
  }
  .pip-dot.done {
    background: rgba(79, 70, 229, 0.5);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
  .pip-dot.complete {
    background: #4ade80;
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
  }
  .pipeline-item.done-item .pip-label {
    color: #4ade80;
    font-weight: 500;
  }
  .pip-dot.spinning {
    border: 2px solid rgba(129, 140, 248, 0.3);
    border-top-color: #818cf8;
    animation: spin 0.8s linear infinite;
    background: transparent;
  }
  .pip-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }
  .pip-label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.65);
  }
  .pip-detail {
    font-size: 0.75rem;
  }
  .pip-detail.approved {
    color: #4ade80;
  }
  .pip-detail.rejected {
    color: #f87171;
  }

  /* ── Source approval ─────────────────────────────── */
  .source-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .source-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .source-check {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    cursor: pointer;
    accent-color: #4f46e5;
  }
  .score-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .score-badge.high {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }
  .score-badge.mid {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  .score-badge.low {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }
  .source-link {
    font-size: 0.8rem;
    color: #818cf8;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .action-btn {
    background: #4f46e5;
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.7rem 1.25rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition:
      background 0.2s,
      transform 0.15s;
    margin-top: 0.75rem;
  }
  .action-btn:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
  }
  .action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* ── Error ───────────────────────────────────────── */
  .error-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    color: #fca5a5;
  }
  .error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .resume-link {
    background: none;
    border: none;
    color: #818cf8;
    font-size: 0.8rem;
    font-weight: 500;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  /* ── Result actions ─────────────────────────────── */
  .result-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 7px;
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s,
      background 0.15s;
  }
  .copy-btn:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.08);
  }
  .sources-detail {
    position: relative;
  }
  .sources-detail summary {
    font-size: 0.78rem;
    color: #818cf8;
    cursor: pointer;
    list-style: none;
    transition: color 0.15s;
  }
  .sources-detail summary:hover {
    color: #a5b4fc;
  }
  .sources-popup {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    background: #0f1520;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 0.875rem;
    width: 260px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  }
  .sources-popup-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin: 0 0 0.5rem;
  }
  .sources-popup ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .sources-popup a {
    font-size: 0.78rem;
    color: #818cf8;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .post-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.2);
  }

  /* ── Prose ───────────────────────────────────────── */
  .prose {
    font-family: 'Lora', Georgia, serif;
    font-size: 0.925rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.75);
    white-space: normal;
  }
  .prose :global(h1),
  .prose :global(h2),
  .prose :global(h3),
  .prose :global(h4) {
    font-family: 'DM Sans', 'Inter', sans-serif;
    color: #f1f5f9;
    line-height: 1.25;
    margin: 1.75em 0 0.5em;
  }
  .prose :global(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  .prose :global(h2) {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .prose :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.015em;
  }
  .prose :global(h4) {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .prose :global(p) {
    margin: 0 0 1em;
  }
  .prose :global(p:last-child) {
    margin-bottom: 0;
  }
  .prose :global(strong) {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  .prose :global(em) {
    font-style: italic;
  }
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0.5em 0 1em;
    padding-left: 1.5em;
  }
  .prose :global(li) {
    margin-bottom: 0.35em;
  }
  .prose :global(li > p) {
    margin: 0;
  }
  .prose :global(blockquote) {
    border-left: 3px solid rgba(129, 140, 248, 0.4);
    margin: 1em 0;
    padding: 0.25em 0 0.25em 1em;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
  .prose :global(code) {
    font-family: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    font-size: 0.82em;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 0.1em 0.35em;
    color: #a5b4fc;
  }
  .prose :global(pre) {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 1em 1.25em;
    overflow-x: auto;
    margin: 1em 0;
  }
  .prose :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.85em;
    color: rgba(255, 255, 255, 0.7);
  }
  .prose :global(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 2em 0;
  }
  .prose :global(a) {
    color: #818cf8;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .prose :global(a:hover) {
    color: #a5b4fc;
  }

  /* ── SEO ─────────────────────────────────────────── */
  .seo-section {
    margin-bottom: 1.25rem;
  }
  .seo-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin: 0 0 0.5rem;
  }
  .seo-count {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }
  .seo-titles {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .seo-copy-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    text-align: left;
    color: rgba(255, 255, 255, 0.65);
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .seo-copy-row:hover {
    border-color: rgba(129, 140, 248, 0.3);
    background: rgba(129, 140, 248, 0.04);
    color: rgba(255, 255, 255, 0.85);
  }
  .seo-copy-row svg {
    color: rgba(255, 255, 255, 0.25);
    flex-shrink: 0;
  }
  .seo-copy-row:hover svg {
    color: #818cf8;
  }
  .seo-desc {
    font-size: 0.85rem;
    line-height: 1.55;
  }
  .seo-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .seo-slug {
    font-family: monospace;
    font-size: 0.85rem;
    color: #818cf8;
  }
  .seo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .tag-chip {
    background: rgba(79, 70, 229, 0.12);
    color: #818cf8;
    border: none;
    border-radius: 6px;
    padding: 0.3rem 0.625rem;
    font-family: monospace;
    font-size: 0.78rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .tag-chip:hover {
    background: rgba(79, 70, 229, 0.22);
  }

  /* ── Demo banner ─────────────────────────────────── */
  .demo-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 1rem;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.5);
  }
  .demo-banner-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }
  .demo-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
    flex-shrink: 0;
  }
  .demo-signin-link {
    font-size: 0.82rem;
    font-weight: 500;
    color: #a5b4fc;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .demo-signin-link:hover {
    color: #c7d2fe;
  }

  /* ── Resume banner ───────────────────────────────── */
  .resume-banner {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    background: rgba(79, 70, 229, 0.08);
    border: 1px solid rgba(79, 70, 229, 0.25);
    border-radius: 12px;
    padding: 0.875rem 1rem;
  }
  .resume-banner-icon {
    color: #818cf8;
    flex-shrink: 0;
    background: rgba(79, 70, 229, 0.12);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .resume-banner-body {
    flex: 1;
    min-width: 0;
  }
  .resume-banner-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 0.15rem;
  }
  .resume-banner-sub {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .resume-banner-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .resume-btn {
    background: #4f46e5;
    border: none;
    border-radius: 7px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.45rem 0.875rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .resume-btn:hover {
    background: #4338ca;
  }
  .discard-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 7px;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    padding: 0.45rem 0.875rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .discard-btn:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
  }

  /* ── Stall notice ────────────────────────────────── */
  .stall-notice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.875rem;
    background: rgba(251, 191, 36, 0.07);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 8px;
    padding: 0.625rem 0.875rem;
    font-size: 0.8rem;
    color: #fbbf24;
  }
  .retry-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 6px;
    color: #fbbf24;
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .retry-btn:hover {
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.4);
  }

  /* ── Draft card ──────────────────────────────────── */
  .draft-card {
    padding: 0;
    overflow: hidden;
  }
  .draft-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-wrap: wrap;
  }
  .draft-card-header h2 {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.72rem;
    font-weight: 500;
    color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: 20px;
    padding: 0.2rem 0.6rem;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
    animation: livePulse 1.4s ease-in-out infinite;
  }
  @keyframes livePulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.8);
    }
  }
  .revision-badge {
    font-size: 0.72rem;
    font-weight: 500;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 20px;
    padding: 0.2rem 0.6rem;
  }
  .draft-raw {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: 0.9375rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.72);
    white-space: pre-wrap;
    margin: 0;
    background: none;
    border: none;
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
  }
  .draft-body {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: 0.9375rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.72);
    white-space: pre-wrap;
    padding: 1.25rem;
    margin: 0;
  }
  .draft-empty {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 2rem 1.25rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.25);
  }
  .pip-stream {
    font-family: Georgia, serif;
    font-size: 0.72rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.3);
    white-space: pre-wrap;
    margin: 0.375rem 0 0;
    max-height: 120px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    line-clamp: 6;
    -webkit-box-orient: vertical;
  }
  .pip-preview {
    font-family: Georgia, serif;
    font-size: 0.7rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.28);
    white-space: pre-wrap;
    margin: 0.3rem 0 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  /* ── Rev tooltip ─────────────────────────────────── */
  .rev-tooltip {
    position: fixed;
    z-index: 60;
    transform: translate(-50%, calc(-100% - 10px));
    max-width: 320px;
    background: #131c30;
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: 10px;
    padding: 0.625rem 0.75rem;
    font-family: 'Inter', sans-serif;
    box-shadow:
      0 10px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(251, 191, 36, 0.06);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .rev-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(251, 191, 36, 0.25);
  }
  .rev-tooltip.flip {
    transform: translate(-50%, 10px);
  }
  .rev-tooltip.flip::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: rgba(251, 191, 36, 0.25);
  }
  .rev-tooltip-note {
    font-size: 0.78rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.68);
    margin: 0;
  }
  .rev-tooltip-approve {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    align-self: flex-start;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.25);
    border-radius: 6px;
    color: #4ade80;
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .rev-tooltip-approve:hover {
    background: rgba(74, 222, 128, 0.18);
    border-color: rgba(74, 222, 128, 0.4);
  }
  .rev-tooltip-approved {
    font-size: 0.72rem;
    font-weight: 600;
    color: #4ade80;
  }

  /* ── Pause / resume ─────────────────────────────── */
  .pause-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    justify-content: center;
    margin-top: 0.625rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 7px;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s,
      color 0.12s;
  }
  .pause-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.65);
  }
  .paused-notice {
    margin-top: 0.625rem;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.18);
    border-radius: 8px;
    padding: 0.625rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .paused-notice.all-approved {
    background: rgba(74, 222, 128, 0.06);
    border-color: rgba(74, 222, 128, 0.2);
  }
  .paused-notice > span {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
  .paused-notice.all-approved > span {
    color: #4ade80;
  }
  .resume-pause-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    align-self: flex-start;
    background: #4f46e5;
    border: none;
    border-radius: 6px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    transition: background 0.12s;
  }
  .resume-pause-btn:hover {
    background: #4338ca;
  }

  :global(.rev-mark) {
    background: rgba(251, 191, 36, 0.18);
    border-bottom: 1.5px solid rgba(251, 191, 36, 0.5);
    border-radius: 2px;
    color: inherit;
    padding: 0 1px;
    cursor: pointer;
  }
  :global(.rev-mark:hover) {
    background: rgba(251, 191, 36, 0.28);
  }

  .revision-notes {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.875rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .revision-notes-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
    margin: 0 0 0.25rem;
  }
  .revision-note-item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.5;
  }
  .revision-note-bullet {
    color: rgba(251, 191, 36, 0.5);
    flex-shrink: 0;
  }

  /* ── Pipeline item ───────────────────────────────── */
  .pipeline-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.5rem 0.375rem;
    position: relative;
    border-radius: 6px;
    margin: 0 -0.375rem;
    transition: background 0.12s;
  }
  .pipeline-item.has-extra {
    cursor: pointer;
  }
  .pipeline-item.has-extra:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  .pipeline-item.active-popup {
    background: rgba(129, 140, 248, 0.07);
  }
  .pipeline-item.active-popup .pip-expand-icon {
    color: #818cf8;
    transform: rotate(90deg);
  }
  .pip-expand-icon {
    color: rgba(255, 255, 255, 0.18);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: auto;
    padding-left: 0.25rem;
    transition:
      color 0.12s,
      transform 0.18s;
  }
  .pipeline-item.has-extra:hover .pip-expand-icon {
    color: rgba(255, 255, 255, 0.45);
  }
  .pipeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: calc(0.375rem + 7px);
    top: calc(0.5rem + 15px);
    bottom: -0.5rem;
    width: 1px;
    background: rgba(255, 255, 255, 0.05);
  }

  /* ── Stage popup ─────────────────────────────────── */
  .stage-popup-backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
  }
  .stage-popup {
    position: fixed;
    z-index: 50;
    width: 290px;
    max-height: 400px;
    background: #0d1422;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.7),
      0 4px 16px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: popupIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes popupIn {
    from {
      opacity: 0;
      transform: translateX(10px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  .stage-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }
  .stage-popup-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .stage-popup-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    padding: 0.15rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: color 0.12s;
  }
  .stage-popup-close:hover {
    color: rgba(255, 255, 255, 0.65);
  }
  .stage-popup-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0.875rem;
  }
  .popup-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .popup-list li {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.55;
    padding-left: 0.875rem;
    position: relative;
  }
  .popup-list li::before {
    content: '–';
    position: absolute;
    left: 0;
    color: rgba(255, 255, 255, 0.22);
  }
  .popup-sources {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .popup-sources a {
    font-size: 0.78rem;
    color: #818cf8;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .popup-markdown {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: pre-wrap;
    font-family: 'Lora', Georgia, serif;
    line-height: 1.6;
    margin: 0;
  }
  .popup-seo {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .popup-seo-label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
    margin: 0.625rem 0 0.2rem;
  }
  .popup-seo-label:first-child {
    margin-top: 0;
  }
  .popup-seo-val {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }
  .popup-seo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.2rem;
  }

  /* ── Spinners ─────────────────────────────────────── */
  .spin {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .spin-sm {
    width: 16px;
    height: 16px;
    display: inline-block;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width: 900px) {
    .gen-layout {
      flex-direction: column-reverse;
    }
    .gen-layout .left-col {
      flex: 1 1 auto;
    }
    .gen-layout .pipeline-col {
      flex: 0 0 auto;
      width: 100%;
      position: static;
      max-height: none;
    }
  }
  @media (max-width: 768px) {
    .user-email {
      display: none;
    }
    .seo-two-col {
      grid-template-columns: 1fr;
    }
    main {
      padding: 1rem;
    }
  }
  @media (max-width: 480px) {
    .card {
      padding: 1.125rem;
    }
    .draft-body {
      font-size: 0.875rem;
      padding: 1rem;
    }
  }
</style>
