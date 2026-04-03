<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import { goto, onNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import './layout.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Dialog } from 'bits-ui'
  import { DEMO_HISTORY_ITEMS } from '$lib/demo-script'

  let { children } = $props()

  // ── Shared types ────────────────────────────────────────────────────────
  type PostListItem = {
    id: string
    savedAt: string
    topic: string
    seoTitle: string
    format: string
    wordCount: string
  }
  type Source = { url: string; title: string }
  type SeoMeta = { titles: string[]; metaDescription: string; tags: string[]; slug: string }
  type StageExtra =
    | { type: 'sources'; items: Source[] }
    | { type: 'list'; items: string[] }
    | { type: 'markdown'; content: string }
    | { type: 'seo'; meta: SeoMeta }
  export type StageItem = {
    label: string
    detail?: string
    isRevision?: boolean
    extra?: StageExtra
    stageType?: string
    preview?: string
    isDone?: boolean
  }
  export type AppCtx = {
    pipeline: typeof pipeline
    refreshHistory: () => void
  }

  // ── View transitions ─────────────────────────────────────────────────────
  onNavigate(navigation => {
    if (!document.startViewTransition) return
    return new Promise(resolve => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  // ── Shell state ──────────────────────────────────────────────────────────
  let userEmail = $state('')
  let historyOpen = $state(false)
  let historyCollapsed = $state(false)
  let historyItems = $state<PostListItem[]>([])
  let loadingHistory = $state(false)
  let postToDeleteId = $state<string | null>(null)

  let pipelineOpen = $state(false)
  let expandedPipelineIdx = $state<number | null>(null)

  // Reactive context object — the drafts page writes into this
  const pipeline = $state({
    active: false,
    stages: [] as StageItem[],
    running: false,
    stalled: false,
    paused: false,
    runId: '',
    firstDraftDone: false,
    writingDraft: '',
    revisionNotes: [] as string[],
    approvedNotes: new Set<number>(),
    onRetry: () => {},
    onPause: () => {},
    onResume: () => {}
  })

  setContext('app', {
    pipeline,
    refreshHistory: () => loadHistory()
  } satisfies AppCtx)

  // ── Derived ──────────────────────────────────────────────────────────────
  const isLoginPage = $derived(page.url.pathname === '/login')
  const isDemo = $derived(page.url.searchParams.has('demo'))

  const allPipelineNotesApproved = $derived(
    pipeline.revisionNotes.length > 0 &&
      pipeline.approvedNotes.size >= pipeline.revisionNotes.length
  )

  // Auto-open the pipeline panel the moment generation starts
  $effect(() => {
    if (pipeline.active && pipeline.running && !pipelineOpen) {
      pipelineOpen = true
    }
    if (!pipeline.active) {
      expandedPipelineIdx = null
    }
  })

  // Re-init the shell when the user navigates away from /login
  let prevPath = $state('')
  $effect(() => {
    const curr = page.url.pathname
    if (prevPath === '/login' && curr !== '/login') initShell()
    prevPath = curr
  })

  onMount(() => {
    if (page.url.pathname !== '/login') initShell()
  })

  // ── Functions ────────────────────────────────────────────────────────────
  function initShell() {
    if (isDemo) {
      userEmail = 'demo@blogwriter.app'
      historyItems = [...DEMO_HISTORY_ITEMS]
      return
    }
    const email = typeof window !== 'undefined' ? localStorage.getItem('auth_email') : null
    if (!email) return
    userEmail = email
    loadHistory()
  }

  async function loadHistory() {
    loadingHistory = true
    const res = await fetch('/api/posts')
    if (res.ok) historyItems = await res.json()
    loadingHistory = false
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    localStorage.removeItem('auth_email')
    userEmail = ''
    historyItems = []
    goto('/login')
  }

  function promptDeletePost(id: string) {
    if (isDemo) return
    postToDeleteId = id
  }

  async function confirmDeletePost() {
    if (!postToDeleteId) return
    const id = postToDeleteId
    postToDeleteId = null
    await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
    historyItems = historyItems.filter(p => p.id !== id)
  }

  function togglePipelineStage(i: number) {
    expandedPipelineIdx = expandedPipelineIdx === i ? null : i
  }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if isLoginPage}
  {@render children()}
{:else}
  <div class="app">
    <!-- Ambient background -->
    <div class="bg" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>
    <div class="bg-dots" aria-hidden="true"></div>

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <header>
      <div class="hd-left">
        <button
          class="sidebar-toggle mobile-toggle"
          onclick={() => (historyOpen = !historyOpen)}
          aria-label="Toggle history"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          class="sidebar-toggle desktop-toggle"
          onclick={() => (historyCollapsed = !historyCollapsed)}
          aria-label={historyCollapsed ? 'Expand history' : 'Collapse history'}
          title={historyCollapsed ? 'Show history' : 'Hide history'}
        >
          {#if historyCollapsed}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
                clip-rule="evenodd"
              />
            </svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
                clip-rule="evenodd"
              />
            </svg>
          {/if}
        </button>

        <a href="/generate{isDemo ? '?demo' : ''}" class="logo" aria-label="BlogWriter home">
          <div class="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                fill="url(#lgGrad)"
                fill-opacity="0.15"
              />
              <path
                d="M17.5 6.5a1.5 1.5 0 00-2.12 0l-7.5 7.5a2.5 2.5 0 00-.63 1.07L6.5 17.5l2.43-.75a2.5 2.5 0 001.07-.63l7.5-7.5a1.5 1.5 0 000-2.12z"
                stroke="url(#lgGrad)"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M15.5 8.5l2 2"
                stroke="url(#lgGrad)"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient
                  id="lgGrad"
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#a5b4fc" />
                  <stop offset="1" stop-color="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="logo-text">
            <span class="logo-name">BlogWriter</span>
            <span class="logo-tag">AI-powered</span>
          </div>
        </a>
      </div>

      <div class="hd-right">
        <!-- Pipeline toggle — only when a draft is being generated -->
        {#if pipeline.active}
          <button
            class="pipeline-toggle"
            class:pip-open={pipelineOpen}
            class:pip-live={pipeline.running}
            onclick={() => (pipelineOpen = !pipelineOpen)}
            title={pipelineOpen ? 'Hide pipeline' : 'Show pipeline progress'}
            aria-label="Toggle pipeline panel"
          >
            {#if pipeline.running}
              <span class="pip-live-dot"></span>
            {:else}
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.5A.75.75 0 012.75 7.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 8.25zm0 4.5A.75.75 0 012.75 12h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 12.75zm0 4.5A.75.75 0 012.75 16.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 17.25z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
            Pipeline
          </button>
        {/if}

        <a href="/generate{isDemo ? '?demo' : ''}" class="new-post-btn" title="Start a new post">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
            />
          </svg>
          New Post
        </a>

        {#if userEmail}
          <span class="user-email">{userEmail}</span>
        {/if}
        <button class="logout-btn" onclick={logout}>Sign out</button>
      </div>
    </header>

    <!-- ── Body ─────────────────────────────────────────────────────────── -->
    <div class="body">
      <!-- Mobile backdrop for history -->
      {#if historyOpen}
        <div
          class="sidebar-backdrop"
          role="button"
          tabindex="-1"
          onclick={() => (historyOpen = false)}
          onkeydown={e => e.key === 'Escape' && (historyOpen = false)}
        ></div>
      {/if}

      <!-- ── Left sidebar: Post History ──────────────────────────────── -->
      <aside
        class="sidebar sidebar-history"
        class:open={historyOpen}
        class:collapsed={historyCollapsed}
        aria-label="Post history"
      >
        <div class="sidebar-header">
          <span>Post History</span>
          <button
            class="sidebar-close"
            onclick={() => (historyOpen = false)}
            aria-label="Close history"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
              />
            </svg>
          </button>
        </div>
        <div class="sidebar-body">
          {#if loadingHistory}
            <div class="sidebar-empty"><span class="spin-sm"></span></div>
          {:else if historyItems.length === 0}
            <p class="sidebar-empty-txt">No posts yet. Generate one!</p>
          {:else}
            {#each historyItems as item}
              <div class="history-item">
                <div class="history-item-row">
                  <button
                    class="history-item-btn"
                    onclick={() => goto(`/preview/${item.id}${isDemo ? '?demo' : ''}`)}
                  >
                    <span class="hi-title">{item.seoTitle || item.topic}</span>
                    <span class="hi-meta">
                      {new Date(item.savedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                      · {item.format}
                    </span>
                  </button>
                  <button
                    class="hi-delete"
                    onclick={() => promptDeletePost(item.id)}
                    aria-label="Delete post"
                    title="Delete post"
                  >
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </aside>

      <!-- ── Main content area ────────────────────────────────────────── -->
      <div class="content-area">
        {@render children()}
      </div>

      <!-- ── Right sidebar: Pipeline progress ────────────────────────── -->
      {#if pipeline.active}
        {#if pipelineOpen}
          <div
            class="sidebar-backdrop pipeline-backdrop"
            role="button"
            tabindex="-1"
            onclick={() => (pipelineOpen = false)}
            onkeydown={e => e.key === 'Escape' && (pipelineOpen = false)}
          ></div>
        {/if}

        <aside
          class="sidebar sidebar-pipeline"
          class:open={pipelineOpen}
          aria-label="Pipeline progress"
        >
          <div class="sidebar-header">
            <span>Pipeline</span>
            <button
              class="sidebar-close"
              onclick={() => (pipelineOpen = false)}
              aria-label="Close pipeline"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                />
              </svg>
            </button>
          </div>

          <div class="pipeline-body">
            <ol class="pipeline">
              {#each pipeline.stages as stage, i}
                <li
                  class="pipeline-item"
                  class:revision={stage.isRevision}
                  class:has-extra={!!stage.extra}
                  class:expanded={expandedPipelineIdx === i}
                  class:done-item={stage.isDone}
                >
                  <button
                    class="pip-row"
                    onclick={() => stage.extra && togglePipelineStage(i)}
                    disabled={!stage.extra}
                    tabindex={stage.extra ? 0 : -1}
                  >
                    <span class="pip-dot" class:done={!stage.isDone} class:complete={stage.isDone}
                    ></span>
                    <div class="pip-content">
                      <span class="pip-label">{stage.label}</span>
                      {#if stage.detail}
                        <span
                          class="pip-detail"
                          class:approved={stage.detail.startsWith('✓')}
                          class:rejected={stage.detail.startsWith('✗')}>{stage.detail}</span
                        >
                      {/if}
                    </div>
                    {#if stage.extra}
                      <span class="pip-chevron" class:rotated={expandedPipelineIdx === i}>
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fill-rule="evenodd"
                            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </span>
                    {/if}
                  </button>

                  {#if stage.extra && expandedPipelineIdx === i}
                    <div class="pip-panel">
                      {#if stage.extra.type === 'list'}
                        <ul class="pip-panel-list">
                          {#each stage.extra.items as item}
                            <li>{item}</li>
                          {/each}
                        </ul>
                      {:else if stage.extra.type === 'sources'}
                        <ul class="pip-panel-sources">
                          {#each stage.extra.items as src}
                            <li>
                              <a href={src.url} target="_blank" rel="noopener noreferrer">
                                {src.title || src.url}
                              </a>
                            </li>
                          {/each}
                        </ul>
                      {:else if stage.extra.type === 'markdown'}
                        <pre class="pip-panel-md">{stage.extra.content.slice(0, 500)}{stage.extra
                            .content.length > 500
                            ? '\n…'
                            : ''}</pre>
                      {:else if stage.extra.type === 'seo'}
                        <div class="pip-panel-seo">
                          {#if stage.extra.meta?.titles?.[0]}
                            <p class="pip-seo-val">{stage.extra.meta.titles[0]}</p>
                          {/if}
                          {#if stage.extra.meta?.slug}
                            <code class="pip-seo-slug">{stage.extra.meta.slug}</code>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </li>
              {/each}

              {#if pipeline.running}
                <li class="pipeline-item working">
                  <div class="pip-row pip-row-static">
                    <span class="pip-dot spinning"></span>
                    <div class="pip-content">
                      <span class="pip-label">
                        {pipeline.firstDraftDone ? 'Revising draft…' : 'Working…'}
                      </span>
                      {#if pipeline.writingDraft && pipeline.firstDraftDone}
                        <p class="pip-stream">
                          {pipeline.writingDraft.split(/\s+/).slice(-10).join(' ')}
                        </p>
                      {/if}
                    </div>
                  </div>
                </li>
              {/if}
            </ol>

            {#if pipeline.running && pipeline.stalled}
              <div class="pip-stall">
                <span>Taking longer than expected…</span>
                <button class="pip-retry-btn" onclick={pipeline.onRetry}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Retry
                </button>
              </div>
            {/if}

            {#if pipeline.running && !pipeline.stalled}
              <button class="pip-pause-btn" onclick={pipeline.onPause}>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="4" y="3" width="4" height="14" rx="1" />
                  <rect x="12" y="3" width="4" height="14" rx="1" />
                </svg>
                Pause generation
              </button>
            {/if}

            {#if pipeline.paused && pipeline.runId}
              <div class="pip-paused" class:all-approved={allPipelineNotesApproved}>
                {#if allPipelineNotesApproved}
                  <span>All notes approved — resuming to final edit.</span>
                {:else if pipeline.approvedNotes.size > 0}
                  <span>
                    {pipeline.approvedNotes.size}
                    {pipeline.approvedNotes.size !== 1 ? 'notes' : 'note'} approved.
                  </span>
                {:else if pipeline.revisionNotes.length > 0}
                  <span>Paused. Review the highlighted text in the draft.</span>
                {:else}
                  <span>Generation paused.</span>
                {/if}
                <button class="pip-resume-btn" onclick={pipeline.onResume}>
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                    />
                  </svg>
                  Resume
                </button>
              </div>
            {/if}
          </div>
        </aside>
      {/if}
    </div>
  </div>

  <!-- ── History delete dialog ──────────────────────────────────────────── -->
  <Dialog.Root
    open={postToDeleteId !== null}
    onOpenChange={v => {
      if (!v) postToDeleteId = null
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay class="dialog-overlay" />
      <Dialog.Content class="dialog-content" aria-describedby="del-desc">
        <div class="dialog-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <Dialog.Title class="dialog-title">Delete post?</Dialog.Title>
        <p id="del-desc" class="dialog-desc">
          This will permanently remove the post from your history and cannot be undone.
        </p>
        <div class="dialog-actions">
          <Dialog.Close class="dialog-cancel">Cancel</Dialog.Close>
          <button class="dialog-confirm" onclick={confirmDeletePost}>Delete</button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
{/if}

<style>
  :global(body) {
    margin: 0;
    overflow-x: hidden;
  }

  /* ── App shell ─────────────────────────────────────────────────────── */
  .app {
    min-height: 100vh;
    background: #080c14;
    font-family: 'Inter', ui-sans-serif, sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ── Background ────────────────────────────────────────────────────── */
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

  /* ── Header ────────────────────────────────────────────────────────── */
  header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    height: 52px;
    background: rgba(8, 12, 20, 0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 0.5rem;
  }
  .hd-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
  }
  .hd-right {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  /* Sidebar toggle buttons */
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #94a3b8;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
    flex-shrink: 0;
    padding: 0;
  }
  .sidebar-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #f1f5f9;
  }
  .mobile-toggle {
    display: none;
  }
  .desktop-toggle {
    display: flex;
  }

  /* Logo (as link) */
  .logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    flex-shrink: 0;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%);
    border: 1px solid rgba(129, 140, 248, 0.25);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .logo-name {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }
  .logo-tag {
    font-size: 0.6rem;
    color: #475569;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 500;
    line-height: 1;
  }

  /* Pipeline toggle */
  .pipeline-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.65rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.22);
    border-radius: 6px;
    color: #818cf8;
    font-size: 0.78rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
    font-family: inherit;
  }
  .pipeline-toggle:hover {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.38);
    color: #a5b4fc;
  }
  .pipeline-toggle.pip-open {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.42);
  }
  .pip-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #818cf8;
    flex-shrink: 0;
    animation: livePulse 1.1s ease-in-out infinite;
  }
  @keyframes livePulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.45;
      transform: scale(0.65);
    }
  }

  /* New Post button */
  .new-post-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.7rem;
    background: #6366f1;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s,
      transform 0.1s;
    white-space: nowrap;
  }
  .new-post-btn:hover {
    background: #818cf8;
    transform: translateY(-1px);
  }

  .user-email {
    font-size: 0.78rem;
    color: #475569;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .logout-btn {
    padding: 0.3rem 0.65rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 6px;
    color: #475569;
    font-size: 0.76rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
    white-space: nowrap;
  }
  .logout-btn:hover {
    border-color: rgba(255, 255, 255, 0.18);
    color: #94a3b8;
  }

  /* ── Body ──────────────────────────────────────────────────────────── */
  .body {
    display: flex;
    flex: 1;
    position: relative;
    overflow: hidden;
    z-index: 1;
    min-height: 0;
  }

  /* ── Sidebar base ──────────────────────────────────────────────────── */
  .sidebar {
    background: rgba(15, 21, 35, 0.82);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 20;
    position: relative;
    flex-shrink: 0;
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.7rem;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .sidebar-close {
    background: transparent;
    border: none;
    color: #334155;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .sidebar-close:hover {
    color: #94a3b8;
  }

  /* ── Left sidebar: History ─────────────────────────────────────────── */
  .sidebar-history {
    width: 256px;
    min-width: 256px;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    transition:
      width 0.2s ease,
      min-width 0.2s ease;
  }
  .sidebar-history.collapsed {
    width: 0;
    min-width: 0;
  }

  .sidebar-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem 0;
  }
  .sidebar-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .sidebar-empty-txt {
    font-size: 0.78rem;
    color: #334155;
    text-align: center;
    padding: 2rem 1rem;
    margin: 0;
    line-height: 1.5;
  }
  .history-item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background 0.1s;
  }
  .history-item:hover {
    background: rgba(255, 255, 255, 0.025);
  }
  .history-item-row {
    display: flex;
    align-items: stretch;
  }
  .history-item-btn {
    flex: 1;
    background: transparent;
    border: none;
    text-align: left;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
    min-width: 0;
  }
  .hi-title {
    display: block;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
    transition: color 0.12s;
  }
  .history-item-btn:hover .hi-title {
    color: #cbd5e1;
  }
  .hi-meta {
    display: block;
    font-size: 0.68rem;
    color: #334155;
  }
  .hi-delete {
    background: transparent;
    border: none;
    color: #1e293b;
    cursor: pointer;
    padding: 0 0.625rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .hi-delete:hover {
    color: #ef4444;
  }

  /* ── Content area ──────────────────────────────────────────────────── */
  .content-area {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
  }

  /* ── Right sidebar: Pipeline ───────────────────────────────────────── */
  .sidebar-pipeline {
    width: 0;
    min-width: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    transition:
      width 0.22s ease,
      min-width 0.22s ease;
  }
  .sidebar-pipeline.open {
    width: 284px;
    min-width: 284px;
  }

  .pipeline-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0 1rem;
    display: flex;
    flex-direction: column;
  }

  /* Pipeline stage list */
  .pipeline {
    list-style: none;
    margin: 0;
    padding: 0 0.625rem;
    display: flex;
    flex-direction: column;
  }
  .pipeline-item {
    position: relative;
    border-radius: 6px;
  }
  .pipeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 1.05rem;
    top: 1.9rem;
    bottom: -0.1rem;
    width: 1px;
    background: rgba(255, 255, 255, 0.05);
    pointer-events: none;
  }

  .pip-row {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.45rem 0.5rem;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    cursor: default;
    border-radius: 6px;
    transition: background 0.12s;
    font-family: inherit;
  }
  .pip-row:not(:disabled) {
    cursor: pointer;
  }
  .pip-row:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.035);
  }
  .pip-row-static {
    cursor: default !important;
  }

  .pip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
    margin-top: 4px;
    transition:
      background 0.2s,
      border-color 0.2s;
  }
  .pip-dot.done {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(99, 102, 241, 0.45);
  }
  .pip-dot.complete {
    background: #6366f1;
    border-color: #818cf8;
    box-shadow: 0 0 4px rgba(99, 102, 241, 0.4);
  }
  .pip-dot.spinning {
    background: transparent;
    border-color: #6366f1 transparent #6366f1 transparent;
    animation: pipSpin 0.85s linear infinite;
  }
  @keyframes pipSpin {
    to {
      transform: rotate(360deg);
    }
  }

  .pip-content {
    flex: 1;
    min-width: 0;
  }
  .pip-label {
    display: block;
    font-size: 0.76rem;
    color: #64748b;
    font-weight: 500;
    line-height: 1.35;
    word-break: break-word;
  }
  .pipeline-item:not(.done-item):not(.working) .pip-label {
    color: #94a3b8;
  }
  .working .pip-label {
    color: #818cf8;
  }

  .pip-detail {
    display: block;
    font-size: 0.68rem;
    color: #475569;
    margin-top: 1px;
  }
  .pip-detail.approved {
    color: #22c55e;
  }
  .pip-detail.rejected {
    color: #f87171;
  }

  .pip-chevron {
    color: #334155;
    flex-shrink: 0;
    margin-top: 3px;
    transition: transform 0.18s;
  }
  .pip-chevron.rotated {
    transform: rotate(180deg);
  }

  .pip-stream {
    font-size: 0.67rem;
    color: #334155;
    margin: 3px 0 0;
    font-style: italic;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Accordion panels */
  .pip-panel {
    margin: 0 0.5rem 0.35rem 1.65rem;
    padding: 0.5rem 0.625rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 5px;
  }
  .pip-panel-list,
  .pip-panel-sources {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .pip-panel-list li {
    font-size: 0.72rem;
    color: #64748b;
    padding-left: 0.75rem;
    position: relative;
    line-height: 1.45;
  }
  .pip-panel-list li::before {
    content: '·';
    position: absolute;
    left: 0.15rem;
    color: #334155;
  }
  .pip-panel-sources li a {
    font-size: 0.7rem;
    color: #6366f1;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pip-panel-sources li a:hover {
    color: #a5b4fc;
    text-decoration: underline;
  }
  .pip-panel-md {
    font-size: 0.67rem;
    color: #475569;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font-family: ui-monospace, 'Cascadia Code', monospace;
    line-height: 1.5;
  }
  .pip-panel-seo {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .pip-seo-val {
    font-size: 0.72rem;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
  }
  .pip-seo-slug {
    font-size: 0.67rem;
    color: #6366f1;
    font-family: ui-monospace, monospace;
    background: rgba(99, 102, 241, 0.08);
    padding: 1px 5px;
    border-radius: 3px;
    align-self: flex-start;
  }

  /* Stall notice */
  .pip-stall {
    margin: 0.5rem 0.625rem;
    padding: 0.6rem 0.75rem;
    background: rgba(245, 158, 11, 0.07);
    border: 1px solid rgba(245, 158, 11, 0.18);
    border-radius: 6px;
    font-size: 0.74rem;
    color: #b45309;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pip-retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 5px;
    color: #d97706;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    align-self: flex-start;
  }
  .pip-retry-btn:hover {
    background: rgba(245, 158, 11, 0.22);
  }

  /* Pause button */
  .pip-pause-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.375rem 0.625rem 0;
    padding: 0.4rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 6px;
    color: #475569;
    font-size: 0.74rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .pip-pause-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #64748b;
    border-color: rgba(255, 255, 255, 0.12);
  }

  /* Paused notice */
  .pip-paused {
    margin: 0.375rem 0.625rem 0;
    padding: 0.6rem 0.75rem;
    background: rgba(99, 102, 241, 0.07);
    border: 1px solid rgba(99, 102, 241, 0.18);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.74rem;
    color: #64748b;
  }
  .pip-paused.all-approved {
    background: rgba(34, 197, 94, 0.06);
    border-color: rgba(34, 197, 94, 0.18);
    color: #4ade80;
  }
  .pip-resume-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.32rem 0.65rem;
    background: rgba(99, 102, 241, 0.18);
    border: 1px solid rgba(99, 102, 241, 0.32);
    border-radius: 5px;
    color: #a5b4fc;
    font-size: 0.72rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
    align-self: flex-start;
  }
  .pip-resume-btn:hover {
    background: rgba(99, 102, 241, 0.28);
  }

  /* Sidebar backdrops (mobile) */
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 35;
    cursor: pointer;
    border: none;
    padding: 0;
    display: block;
  }
  .pipeline-backdrop {
    z-index: 35;
  }

  /* ── Global spinners (used by child pages) ─────────────────────────── */
  :global(.spin) {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(129, 140, 248, 0.25);
    border-top-color: #818cf8;
    border-radius: 50%;
    animation: layoutSpin 0.75s linear infinite;
  }
  :global(.spin-sm) {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 1.5px solid rgba(129, 140, 248, 0.2);
    border-top-color: #818cf8;
    border-radius: 50%;
    animation: layoutSpin 0.75s linear infinite;
  }
  @keyframes layoutSpin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Delete dialog (bits-ui, global because inside Portal) ────────── */
  :global(.dialog-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    z-index: 100;
    animation: dlgFadeIn 0.14s ease;
  }
  :global(.dialog-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
    background: #1a2235;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 1.5rem;
    width: min(420px, calc(100vw - 2rem));
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
    animation: dlgScaleIn 0.14s ease;
  }
  @keyframes dlgFadeIn {
    from {
      opacity: 0;
    }
  }
  @keyframes dlgScaleIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.94);
    }
  }
  .dialog-icon {
    width: 40px;
    height: 40px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.18);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f87171;
    margin-bottom: 1rem;
  }
  :global(.dialog-title) {
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 0.5rem;
  }
  .dialog-desc {
    font-size: 0.83rem;
    color: #475569;
    margin: 0 0 1.25rem;
    line-height: 1.55;
  }
  .dialog-actions {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
  }
  :global(.dialog-cancel) {
    padding: 0.42rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 7px;
    color: #64748b;
    font-size: 0.83rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  :global(.dialog-cancel):hover {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
  }
  .dialog-confirm {
    padding: 0.42rem 0.9rem;
    background: rgba(239, 68, 68, 0.14);
    border: 1px solid rgba(239, 68, 68, 0.28);
    border-radius: 7px;
    color: #fca5a5;
    font-size: 0.83rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
  }
  .dialog-confirm:hover {
    background: rgba(239, 68, 68, 0.24);
  }

  /* ── Responsive ────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .mobile-toggle {
      display: flex;
    }
    .desktop-toggle {
      display: none;
    }
    .user-email {
      display: none;
    }

    .sidebar-history {
      position: fixed;
      top: 52px;
      bottom: 0;
      left: 0;
      z-index: 40;
      width: 280px !important;
      min-width: 280px !important;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .sidebar-history.open {
      transform: translateX(0);
    }

    .sidebar-pipeline {
      position: fixed;
      top: 52px;
      bottom: 0;
      right: 0;
      z-index: 40;
      width: 284px !important;
      min-width: 284px !important;
      transform: translateX(100%);
      transition: transform 0.25s ease;
    }
    .sidebar-pipeline.open {
      transform: translateX(0);
    }
  }

  @media (max-width: 540px) {
    .logo-text {
      display: none;
    }
    .new-post-btn {
      padding: 0.32rem 0.55rem;
      font-size: 0;
      gap: 0;
    }
    .new-post-btn svg {
      margin: 0;
    }
    .pipeline-toggle {
      padding: 0.3rem 0.5rem;
      font-size: 0;
      gap: 0;
    }
    .pipeline-toggle svg,
    .pipeline-toggle .pip-live-dot {
      margin: 0;
    }
  }
</style>
