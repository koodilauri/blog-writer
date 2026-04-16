<script lang="ts">
  import type { StageItem } from '../../routes/+layout.svelte'
  import { Button } from '$lib/components/ui/button'

  type PipelineData = {
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

  type Props = {
    pipeline: PipelineData
    isDemo: boolean
    open: boolean
    allPipelineNotesApproved: boolean
    onuserclosed: () => void
  }
  let {
    pipeline,
    isDemo,
    open = $bindable(),
    allPipelineNotesApproved,
    onuserclosed
  }: Props = $props()

  let expandedIdx = $state(null as number | null)

  function toggleStage(i: number) {
    expandedIdx = expandedIdx === i ? null : i
  }
</script>

<!-- Show button: fixed top-right corner, only when panel is closed -->
{#if !open}
  <button
    class="pip-tab"
    class:pip-tab-live={pipeline.running}
    onclick={() => (open = true)}
    title="Show pipeline progress"
    aria-label="Show pipeline panel"
  >
    {#if pipeline.running}
      <span
        class="bg-brand-400 size-1.5 shrink-0 animate-[livePulse_1.1s_ease-in-out_infinite] rounded-full"
      ></span>
    {/if}
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" class="shrink-0">
      <path
        fill-rule="evenodd"
        d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.5A.75.75 0 012.75 7.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 8.25zm0 4.5A.75.75 0 012.75 12h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 12.75zm0 4.5A.75.75 0 012.75 16.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 17.25z"
        clip-rule="evenodd"
      />
    </svg>
  </button>
{/if}

<aside class="sidebar sidebar-pipeline" class:open aria-label="Pipeline progress">
  <div
    class="sidebar-header text-text-muted flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 text-[0.7rem] font-semibold tracking-[0.08em] uppercase"
  >
    <span>Pipeline</span>
    <Button
      variant="ghost"
      size="icon"
      class="text-surface-border hover:text-text-secondary size-7 shrink-0"
      onclick={() => {
        open = !open
        if (!open) onuserclosed()
      }}
      title={open ? 'Hide pipeline' : 'Show pipeline'}
      aria-label="Toggle pipeline panel"
    >
      <span class="collapse-chevron">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </Button>
  </div>

  <div class="pipeline-body flex flex-1 flex-col overflow-y-auto py-2 pb-4">
    <ol class="m-0 flex list-none flex-col p-0 px-2.5">
      {#each pipeline.stages as stage, i}
        <li
          class="pipeline-item relative rounded-[6px]"
          class:revision={stage.isRevision}
          class:has-extra={!!stage.extra}
          class:expanded={expandedIdx === i}
          class:done-item={stage.isDone}
        >
          <button
            class="pip-row flex w-full items-start gap-[0.55rem] rounded-[6px] border-none bg-transparent px-2 py-[0.45rem] text-left font-[inherit] not-disabled:cursor-pointer not-disabled:hover:bg-white/[0.035] disabled:cursor-default"
            onclick={() => stage.extra && toggleStage(i)}
            disabled={!stage.extra}
            tabindex={stage.extra ? 0 : -1}
          >
            <span
              class="pip-dot mt-1 shrink-0"
              class:done={!stage.isDone}
              class:complete={stage.isDone}
            ></span>
            <div class="min-w-0 flex-1">
              <span
                class="block text-[0.76rem] leading-[1.35] font-medium break-words"
                class:text-text-muted={stage.isDone}
                class:text-text-secondary={!stage.isDone}>{stage.label}</span
              >
              {#if stage.detail}
                <span
                  class="mt-px block text-[0.68rem]"
                  class:text-success={stage.detail.startsWith('✓')}
                  class:text-error={stage.detail.startsWith('✗')}
                  class:text-text-muted={!stage.detail.startsWith('✓') &&
                    !stage.detail.startsWith('✗')}>{stage.detail}</span
                >
              {/if}
            </div>
            {#if stage.extra}
              <span
                class="text-surface-border mt-[3px] shrink-0 transition-transform duration-[0.18s]"
                class:rotate-180={expandedIdx === i}
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            {/if}
          </button>

          {#if stage.extra && expandedIdx === i}
            <div
              class="mx-2 mb-[0.35rem] ml-[1.65rem] rounded-[5px] border border-white/[0.04] bg-black/[0.18] px-2.5 py-2"
            >
              {#if stage.extra.type === 'list'}
                <ul class="m-0 flex list-none flex-col gap-[0.3rem] p-0">
                  {#each stage.extra.items as item}
                    <li
                      class="text-text-muted before:text-surface-border relative pl-3 text-[0.72rem] leading-[1.45] before:absolute before:left-[0.15rem] before:content-['·']"
                    >
                      {item}
                    </li>
                  {/each}
                </ul>
              {:else if stage.extra.type === 'sources'}
                <ul class="m-0 flex list-none flex-col gap-[0.3rem] p-0">
                  {#each stage.extra.items as src}
                    <li>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-brand-500 block overflow-hidden text-[0.7rem] text-ellipsis whitespace-nowrap no-underline hover:text-[#a5b4fc] hover:underline"
                        >{src.title || src.url}</a
                      >
                    </li>
                  {/each}
                </ul>
              {:else if stage.extra.type === 'markdown'}
                <pre
                  class="text-text-muted m-0 font-mono text-[0.67rem] leading-[1.5] break-words whitespace-pre-wrap">{stage.extra.content.slice(
                    0,
                    500
                  )}{stage.extra.content.length > 500 ? '\n…' : ''}</pre>
              {:else if stage.extra.type === 'seo'}
                <div class="flex flex-col gap-[0.3rem]">
                  {#if stage.extra.meta?.titles?.[0]}
                    <p class="text-text-muted m-0 text-[0.72rem] leading-[1.4]">
                      {stage.extra.meta.titles[0]}
                    </p>
                  {/if}
                  {#if stage.extra.meta?.slug}
                    <code
                      class="bg-brand-500/[0.08] text-brand-500 self-start rounded-[3px] px-[5px] py-px font-mono text-[0.67rem]"
                      >{stage.extra.meta.slug}</code
                    >
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </li>
      {/each}

      {#if pipeline.running}
        <li class="pipeline-item working relative rounded-[6px]">
          <div class="flex w-full items-start gap-[0.55rem] px-2 py-[0.45rem]">
            <span class="pip-dot spinning mt-1 shrink-0"></span>
            <div class="min-w-0 flex-1">
              <span
                class="text-brand-400 block text-[0.76rem] leading-[1.35] font-medium break-words"
              >
                {pipeline.thinkingNode === 'editor'
                  ? 'Final editing…'
                  : pipeline.thinkingNode === 'seo'
                    ? 'Generating SEO…'
                    : pipeline.firstDraftDone
                      ? 'Revising draft…'
                      : 'Working…'}
              </span>
              {#if pipeline.writingDraft && pipeline.firstDraftDone}
                <p class="text-surface-border m-0 mt-[3px] line-clamp-2 text-[0.67rem] italic">
                  {pipeline.writingDraft.split(/\s+/).slice(-10).join(' ')}
                </p>
              {/if}
              {#if pipeline.thinkingNode && pipeline.thinkingBuffer}
                <p
                  class="m-0 mt-[5px] mb-[1px] text-[0.6rem] font-semibold tracking-[0.06em] text-[#2d3f55] uppercase"
                >
                  {pipeline.thinkingNode}
                </p>
                <p class="m-0 mt-[3px] line-clamp-2 text-[0.67rem] text-[#2d3f55] italic">
                  {pipeline.thinkingBuffer.slice(-200)}
                </p>
              {/if}
            </div>
          </div>
        </li>
      {/if}
    </ol>

    {#if pipeline.running && pipeline.stalled}
      <div
        class="border-warning/18 bg-warning/7 text-warning mx-2.5 mt-2 flex flex-col gap-2 rounded-[6px] border px-3 py-[0.6rem] text-[0.74rem]"
      >
        <span>Taking longer than expected…</span>
        <Button
          variant="warning"
          size="sm"
          class="gap-[0.4rem] self-start text-[0.72rem]"
          onclick={pipeline.onRetry}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
              clip-rule="evenodd"
            />
          </svg>
          Retry
        </Button>
      </div>
    {/if}

    {#if pipeline.running && !pipeline.stalled && !isDemo}
      <Button
        variant="ghost"
        size="sm"
        class="mx-2.5 mt-1.5 gap-[0.4rem] self-start text-[0.74rem]"
        onclick={pipeline.onPause}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <rect x="4" y="3" width="4" height="14" rx="1" />
          <rect x="12" y="3" width="4" height="14" rx="1" />
        </svg>
        Pause generation
      </Button>
    {/if}

    {#if pipeline.paused && pipeline.runId}
      <div
        class={`mx-2.5 mt-1.5 flex flex-col gap-2 rounded-[6px] border px-3 py-[0.6rem] text-[0.74rem] ${allPipelineNotesApproved ? 'border-success/18 bg-success/6 text-success' : 'border-brand-500/18 bg-brand-500/7 text-text-muted'}`}
      >
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
        <Button
          variant="ghost-brand"
          size="sm"
          class="gap-[0.4rem] self-start text-[0.72rem]"
          onclick={pipeline.onResume}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
            />
          </svg>
          Resume
        </Button>
      </div>
    {/if}

    {#if pipeline.factCheckerInterrupted}
      <div class="mt-2 flex gap-1.5 px-2.5">
        <Button
          variant="ghost-brand"
          size="sm"
          class="flex-1 text-[0.72rem]"
          onclick={pipeline.onRevise}>Revise</Button
        >
        <Button
          variant="approve"
          size="sm"
          class="flex-1 text-[0.72rem]"
          onclick={pipeline.onApproveAll}>Approve all</Button
        >
      </div>
    {/if}
  </div>
</aside>

<style>
  /* ── Sidebar width animation ───────────────────────────────────── */
  .sidebar {
    background: rgba(15, 21, 35, 0.82);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 20;
    position: sticky;
    top: 24px;
    align-self: flex-start;
    max-height: calc(100vh - 100px);
    width: 0;
    margin: 24px 8px 24px 0;
    border-radius: 12px;
    transition: width 0.22s ease;
    flex-shrink: 0;
  }
  /* Prevent children from reflowing during width animation */
  .sidebar-header,
  .pipeline-body {
    min-width: 284px;
  }
  .sidebar.open {
    width: 284px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 4px 32px rgba(0, 0, 0, 0.45),
      0 1px 6px rgba(0, 0, 0, 0.25);
  }

  /* ── Show tab (fixed corner button) ─────────────────────────────── */
  .pip-tab {
    position: fixed;
    top: 76px;
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0.6rem 0.4rem;
    width: 28px;
    background: rgba(15, 21, 35, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-right: none;
    border-radius: 6px 0 0 6px;
    color: var(--color-text-muted);
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .pip-tab:hover {
    color: var(--color-text-secondary);
    background: rgba(20, 28, 46, 0.98);
  }
  .pip-tab-live {
    color: var(--color-brand-400);
    border-color: rgba(99, 102, 241, 0.3);
  }
  /* ── Pipeline connector line ─────────────────────────────────────── */
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

  /* ── Stage status dots ───────────────────────────────────────────── */
  .pip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
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

  /* ── Responsive ──────────────────────────────────────────────────── */
  @media (max-width: 1023px) {
    .pip-tab {
      display: none;
    }

    .sidebar-header,
    .pipeline-body {
      min-width: 0;
    }

    .sidebar {
      order: -1;
      position: static;
      width: 100%;
      max-height: 2.5rem;
      overflow: hidden;
      margin: 0;
      border-radius: 0;
      align-self: auto;
      flex-shrink: 0;
      transition: max-height 0.22s ease;
      border: none;
      box-shadow: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .sidebar.open {
      max-height: 800px;
      width: 100%;
      border-radius: 0;
      box-shadow: none;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .sidebar.open .pipeline-body {
      overflow-y: auto;
    }

    .collapse-chevron {
      display: inline-flex;
      transform: rotate(90deg);
      transition: transform 0.2s;
    }
    .sidebar.open .collapse-chevron {
      transform: rotate(-90deg);
    }
  }
</style>
