<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { marked } from 'marked'
  import { escHtml, findRevisionRanges, renderHighlighted } from '$lib/claim-span'
  import { getActivityLabel } from '$lib/activity-labels'
  import ActivitySpinner from '$lib/components/ActivitySpinner.svelte'
  import OutlineApproval from '$lib/components/OutlineApproval.svelte'
  import SourceCard from '$lib/components/SourceCard.svelte'
  import DraftViewer from '$lib/components/DraftViewer.svelte'
  import SeoPanel from '$lib/components/SeoPanel.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'

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
    | { stage: 'writer_token'; token: string; node?: string }
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

  type BrowserWS = {
    send(data: string): void
    close(code?: number, reason?: string): void
    readyState: number
  }
  let ws: BrowserWS | null = null
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
    thinkingNode: string
    thinkingBuffer: string
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
    ws?.close()
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

  function openWs(id: string): Promise<BrowserWS> {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const socket: BrowserWS = new (globalThis as any).WebSocket(
        `${proto}://${location.host}/api/pipeline?runId=${id}`
      )
      ;(socket as EventTarget).addEventListener('open', () => resolve(socket))
      ;(socket as EventTarget).addEventListener('error', () =>
        reject(new Error('WebSocket connection failed'))
      )
      ;(socket as EventTarget).addEventListener('message', (e: Event) => {
        try {
          handleEvent(JSON.parse((e as MessageEvent).data) as StageEvent)
        } catch {
          /* ignore malformed message */
        }
      })
      ;(socket as EventTarget).addEventListener('close', (e: Event) => {
        const ce = e as CloseEvent
        ws = null
        if (!ce.wasClean && ce.code !== 1000 && running) {
          errorMsg = 'Connection closed unexpectedly'
          running = false
          canResume = !!runId
          scheduleSaveSession()
        }
      })
      ws = socket
    })
  }

  async function startGeneration() {
    if (isDemo) {
      running = true
      const controller = new AbortController()
      const res = await fetch('/api/demo', {
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
      return
    }

    running = true
    errorMsg = ''
    runId = postId
    try {
      const socket = await openWs(runId)
      socket.send(JSON.stringify({ type: 'start', runId, topic, format, tone, wordCount }))
    } catch {
      errorMsg = 'Failed to connect'
      running = false
    }
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
    stalled = false

    const msg = JSON.stringify({ type: 'resume', ...body })
    try {
      if (ws && ws.readyState === 1 /* OPEN */) {
        ws.send(msg)
      } else {
        const socket = await openWs(body.runId)
        socket.send(msg)
      }
    } catch {
      errorMsg = 'Failed to connect'
      running = false
    }
  }

  function handleEvent(event: StageEvent) {
    resetStallTimer()
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
      if (event.node === 'editor') {
        thinkingNode = 'editor'
      } else if (firstDraftDone && revisionNotes.length > 0) {
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
            (event.changes ?? []).length > 0 ? { type: 'list', items: event.changes! } : undefined
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
          extra: (event.notes ?? []).length > 0 ? { type: 'list', items: event.notes! } : undefined
        }
      ]
      lastStageType = event.stage
      scheduleSaveSession()
    } else if (event.stage === 'editor') {
      thinkingNode = null
      thinkingBuffer = ''
      if (writingDraft) currentDraft = writingDraft
      writingDraft = ''
      stages = [
        ...stages,
        {
          label: event.label,
          stageType: event.stage,
          extra: (event.notes ?? []).length > 0 ? { type: 'list', items: event.notes! } : undefined
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
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            handleEvent(JSON.parse(line.slice(6)) as StageEvent)
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
      ws?.close(1000, 'navigate away')
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
    ws?.close(1000, 'retry')
    clearStallTimer()
    if (runId) await streamResume({ runId })
  }

  function pauseGeneration() {
    ws?.close(1000, 'pause')
    ws = null
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

  // ── Revision highlighting ── moved to $lib/claim-span
  const approvedFactNoteIndices = $derived(
    new Set(
      interruptedFactNotes.map((n, i) => (approvedFactNotes.has(n) ? i : -1)).filter(i => i !== -1)
    )
  )
  const draftHtml = $derived(
    writingDraft
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
  const currentActivity = $derived(getActivityLabel(stalled, lastStageType, thinkingNode))

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

<main class="mx-auto box-border flex w-full max-w-[1160px] flex-1 flex-col gap-5 p-4 md:p-6">
  {#if notFound}
    <div class="rounded-2xl border border-white/7 bg-white/3 p-6 py-12 text-center">
      <p class="mb-6 text-[0.95rem] text-white/40">Draft not found.</p>
      <Button onclick={() => goto('/generate')}>← Back to generate</Button>
    </div>
  {:else}
    {#if isDemo}
      <div
        class="border-brand-500/20 bg-brand-500/8 flex items-center justify-between gap-4 rounded-[10px] border px-4 py-2.5 text-[0.82rem] text-white/50"
        role="status"
      >
        <div class="flex flex-wrap items-center gap-2.5">
          <span
            class="border-brand-500/35 bg-brand-500/20 shrink-0 rounded border px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.08em] text-[#a5b4fc]"
            >DEMO</span
          >
          <span>This is a simulated run — pre-recorded content, no API calls.</span>
        </div>
        <a
          href="/login"
          class="shrink-0 text-[0.82rem] font-medium whitespace-nowrap text-[#a5b4fc] no-underline transition-colors duration-150 hover:text-[#c7d2fe]"
          >Sign in →</a
        >
      </div>
    {/if}

    {#if showResumePrompt && savedSession}
      <div
        class="border-brand-600/25 bg-brand-600/8 flex items-center gap-3.5 rounded-xl border p-3.5"
        role="alert"
      >
        <div
          class="bg-brand-600/12 text-brand-400 flex size-8 shrink-0 items-center justify-center rounded-lg"
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor"
            ><path
              fill-rule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
              clip-rule="evenodd"
            /></svg
          >
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-text-primary m-0 mb-0.5 text-[0.85rem] font-semibold">
            Resume in-progress post?
          </p>
          <p
            class="m-0 overflow-hidden text-[0.78rem] text-ellipsis whitespace-nowrap text-white/35"
          >
            {(savedSession as any).topic ?? 'Untitled'}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button size="sm" onclick={resumeSavedSession}>Resume</Button>
          <Button variant="outline" size="sm" onclick={discardSession}>Discard</Button>
        </div>
      </div>
    {/if}

    {#if stages.length > 0 || running || currentDraft || sourcesInterrupted || interrupted || factCheckerInterrupted}
      <div>
        {#if running && !currentDraft && !writingDraft && !sourcesInterrupted && !interrupted && !factCheckerInterrupted}
          <ActivitySpinner activity={currentActivity} sources={liveSources} {writingOutline} />
        {:else if sourcesInterrupted}
          <section class="rounded-2xl border border-white/7 bg-white/3 p-6">
            <div class="mb-5">
              <h2
                class="font-display text-text-primary m-0 mb-0.5 text-[0.95rem] font-semibold tracking-[-0.02em]"
              >
                Review Sources
              </h2>
              <p class="m-0 text-[0.82rem] text-white/30">
                Uncheck sources to remove them, add your own URLs, then approve.
              </p>
            </div>
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
              {#each interruptedSources as source, i}
                <SourceCard
                  url={source.url}
                  title={source.title}
                  score={interruptedScores[i] ?? 3}
                  checked={checkedSources.has(source.url)}
                  ontoggle={() => toggleSource(source.url)}
                />
              {/each}
            </ul>
            <div class="mt-4 flex flex-col gap-[0.4rem]">
              <label
                for="add-urls"
                class="text-[0.78rem] font-medium tracking-[0.01em] text-white/45"
                >Add URLs (one per line)</label
              >
              <Textarea
                id="add-urls"
                bind:value={addUrlsInput}
                rows={3}
                placeholder="https://example.com/article"
              />
            </div>
            <Button
              class="mt-3 w-full gap-2"
              onclick={approveSources}
              disabled={running || checkedSources.size === 0}
            >
              {#if running}<span
                  class="border-brand-400/25 border-t-brand-400 inline-block size-3.5 shrink-0 animate-[layoutSpin_0.75s_linear_infinite] rounded-full border-2"
                ></span> Resuming…{:else}Approve & Continue{/if}
            </Button>
          </section>
        {:else if interrupted}
          <OutlineApproval
            bind:outline={interruptedOutline}
            {running}
            onresume={resumeWithOutline}
          />
        {:else if currentDraft || writingDraft}
          <DraftViewer
            {finalPost}
            {currentDraft}
            {writingDraft}
            {running}
            {firstDraftDone}
            {thinkingNode}
            {revisionNotes}
            {approvedNotes}
            {factCheckerInterrupted}
            {interruptedFactNotes}
            {approvedFactNotes}
            {sources}
            oncopy={copyToClipboard}
            onapprovenote={approveNote}
            onapproveFactNote={note => {
              const next = new Set(approvedFactNotes)
              next.add(note)
              approvedFactNotes = next
            }}
          />
        {/if}
      </div>
    {/if}

    <!-- Error -->
    {#if errorMsg}
      <div
        class="border-error/20 bg-error/7 flex items-start gap-2.5 rounded-[10px] border px-4 py-3 text-[0.85rem] text-[#fca5a5]"
        role="alert"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" class="mt-px shrink-0"
          ><path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
            clip-rule="evenodd"
          /></svg
        >
        <div class="flex flex-col gap-1.5">
          <span>{errorMsg}</span>
          {#if canResume && !running}
            <button
              class="text-brand-400 cursor-pointer border-none bg-transparent p-0 text-left text-[0.8rem] font-medium underline"
              onclick={resumeFromCheckpoint}>Resume from last checkpoint</button
            >
          {/if}
        </div>
      </div>
    {/if}

    <!-- SEO (shown after generation completes) -->
    {#if finalPost && seoMeta}
      <SeoPanel {seoMeta} oncopy={copyToClipboard} />
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    overflow-x: hidden;
  }
</style>
