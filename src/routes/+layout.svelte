<script module lang="ts">
  export type StageItem = {
    label: string
    detail?: string
    isRevision?: boolean
    extra?:
      | { type: 'sources'; items: { url: string; title: string }[] }
      | { type: 'list'; items: string[] }
      | { type: 'markdown'; content: string }
      | {
          type: 'seo'
          meta: { titles: string[]; metaDescription: string; tags: string[]; slug: string }
        }
    stageType?: string
    preview?: string
    isDone?: boolean
  }
  export type AppCtx = {
    pipeline: {
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
      thinkingNode: string
      thinkingBuffer: string
      factCheckerInterrupted: boolean
      onRetry: () => void
      onPause: () => void
      onResume: () => void
      onRevise: () => void
      onApproveAll: () => void
    }
    refreshHistory: () => void
  }
</script>

<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import { goto, onNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import './layout.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Dialog } from 'bits-ui'
  import { DEMO_HISTORY_ITEMS } from '$lib/demo-script'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import HistorySidebar from '$lib/components/HistorySidebar.svelte'
  import PipelinePanel from '$lib/components/PipelinePanel.svelte'

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
  // ── Shell state ──────────────────────────────────────────────────────────
  let userEmail = $state('')
  let historyOpen = $state(false)
  let historyCollapsed = $state(false)
  let historyItems = $state([] as PostListItem[])
  let loadingHistory = $state(false)
  let postToDeleteId = $state(null as string | null)

  let pipelineOpen = $state(false)
  let userClosedPipeline = $state(false)

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
    thinkingNode: '',
    thinkingBuffer: '',
    factCheckerInterrupted: false,
    onRetry: () => {},
    onPause: () => {},
    onResume: () => {},
    onRevise: () => {},
    onApproveAll: () => {}
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

  // Auto-open the pipeline panel the moment generation starts (unless user explicitly closed it)
  $effect(() => {
    if (
      pipeline.active &&
      (pipeline.running || pipeline.factCheckerInterrupted) &&
      !pipelineOpen &&
      !userClosedPipeline
    ) {
      pipelineOpen = true
    }
    if (!pipeline.active) {
      userClosedPipeline = false
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

  // Trigger a View Transitions cross-fade on every client-side navigation
  onNavigate(navigation => {
    if (!document.startViewTransition) return
    return new Promise(resolve => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
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
    <AppHeader
      {userEmail}
      {isDemo}
      {historyCollapsed}
      ontogglemobile={() => (historyOpen = !historyOpen)}
      ontogglesidebar={() => (historyCollapsed = !historyCollapsed)}
      onlogout={logout}
    />

    <!-- ── Body ─────────────────────────────────────────────────────────── -->
    <div class="body">
      <!-- Mobile backdrop for history sidebar -->
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
      <HistorySidebar
        items={historyItems}
        loading={loadingHistory}
        collapsed={historyCollapsed}
        open={historyOpen}
        {isDemo}
        onclose={() => (historyOpen = false)}
        onnavigate={id => goto(`/preview/${id}${isDemo ? '?demo' : ''}`)}
        ondelete={promptDeletePost}
      />

      <!-- ── Main column: content + pipeline ──────────────────────────── -->
      <div class="main-column">
        <!-- Main content (first in DOM = left in flex-row, top in flex-col) -->
        <div class="content-area">
          {@render children()}
        </div>

        <!-- Pipeline: right sidebar on wide, inline strip on narrow -->
        {#if pipeline.active}
          <PipelinePanel
            {pipeline}
            {isDemo}
            bind:open={pipelineOpen}
            {allPipelineNotesApproved}
            onuserclosed={() => (userClosedPipeline = true)}
          />
        {/if}
      </div>
      <!-- /.main-column -->
    </div>
    <!-- /.body -->
  </div>
  <!-- /.app -->

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
    overflow: hidden; /* app scrolls internally via .main-column */
  }

  /* ── App shell ─────────────────────────────────────────────────────── */
  .app {
    height: 100vh; /* lock to viewport — prevents document scroll */
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

  /* ── Body ──────────────────────────────────────────────────────────── */
  .body {
    display: flex;
    flex: 1;
    position: relative;
    overflow: hidden;
    z-index: 1;
    min-height: 0;
  }

  /* ── Main column (content + pipeline) ─────────────────────────────── */
  .main-column {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-y: auto; /* this is now the scroll container */
    align-items: flex-start; /* children take natural height so they can overflow */
  }

  /* ── Content area ──────────────────────────────────────────────────── */
  .content-area {
    flex: 1;
    min-width: 0;
    min-height: 100%; /* at least full column height even on short pages */
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    view-transition-name: main-content;
  }

  /* Sidebar backdrop (mobile history) */
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
  @media (max-width: 1023px) {
    .main-column {
      flex-direction: column;
      align-items: stretch;
      overflow-y: auto;
    }
    .content-area {
      order: 0;
      min-height: auto;
    }
  }
</style>
