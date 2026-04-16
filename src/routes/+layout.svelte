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
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { DEMO_HISTORY_ITEMS } from '$lib/demo-script'
  import { PostListSchema } from '$lib/schemas/posts'
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
    if (res.ok) historyItems = PostListSchema.parse(await res.json())
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
  <div class="bg-surface-base relative flex h-screen flex-col">
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
    <div class="relative z-10 flex min-h-0 flex-1 overflow-hidden">
      <!-- Mobile backdrop for history sidebar -->
      {#if historyOpen}
        <div
          class="fixed inset-0 z-35 cursor-pointer bg-black/55"
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
        onclose={() => {
          historyOpen = false
          historyCollapsed = true
        }}
        onnavigate={id => goto(`/preview/${id}${isDemo ? '?demo' : ''}`)}
        ondelete={promptDeletePost}
      />

      <!-- ── Main column: content + pipeline ──────────────────────────── -->
      <div
        class="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-y-auto lg:flex-row lg:items-start"
      >
        <!-- Main content (first in DOM = left in flex-row, top in flex-col) -->
        <div
          class="relative z-10 flex min-h-auto min-w-0 flex-1 flex-col [view-transition-name:main-content] lg:min-h-full"
        >
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
    <Dialog.Content aria-describedby="del-desc">
      <div
        class="text-error mb-4 flex size-10 items-center justify-center rounded-[10px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.1)]"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <Dialog.Title>Delete post?</Dialog.Title>
      <p id="del-desc" class="mt-1.5 mb-5 text-[0.83rem] leading-[1.55] text-white/40">
        This will permanently remove the post from your history and cannot be undone.
      </p>
      <div class="flex justify-end gap-2.5">
        <Button variant="secondary" onclick={() => (postToDeleteId = null)}>Cancel</Button>
        <Button variant="destructive" onclick={confirmDeletePost}>Delete</Button>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  :global(body) {
    margin: 0;
    overflow: hidden; /* app scrolls internally via .main-column */
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
</style>
