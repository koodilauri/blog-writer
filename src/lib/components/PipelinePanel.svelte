<script lang="ts">
  import type { StageItem } from '../../routes/+layout.svelte'

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
      <span class="pip-live-dot"></span>
    {/if}
    <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0">
      <path
        fill-rule="evenodd"
        d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.5A.75.75 0 012.75 7.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 8.25zm0 4.5A.75.75 0 012.75 12h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 12.75zm0 4.5A.75.75 0 012.75 16.5h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 17.25z"
        clip-rule="evenodd"
      />
    </svg>
  </button>
{/if}

<aside class="sidebar" class:open aria-label="Pipeline progress">
  <div class="sidebar-header">
    <span>Pipeline</span>
    <button
      class="pip-collapse-btn"
      onclick={() => {
        open = !open
        if (!open) onuserclosed()
      }}
      title={open ? 'Hide pipeline' : 'Show pipeline'}
      aria-label="Toggle pipeline panel"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clip-rule="evenodd"
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
          class:expanded={expandedIdx === i}
          class:done-item={stage.isDone}
        >
          <button
            class="pip-row"
            onclick={() => stage.extra && toggleStage(i)}
            disabled={!stage.extra}
            tabindex={stage.extra ? 0 : -1}
          >
            <span class="pip-dot" class:done={!stage.isDone} class:complete={stage.isDone}></span>
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
              <span class="pip-chevron" class:rotated={expandedIdx === i}>
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
                <pre class="pip-panel-md">{stage.extra.content.slice(0, 500)}{stage.extra.content
                    .length > 500
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
                {pipeline.thinkingNode === 'editor'
                  ? 'Final editing…'
                  : pipeline.thinkingNode === 'seo'
                    ? 'Generating SEO…'
                    : pipeline.firstDraftDone
                      ? 'Revising draft…'
                      : 'Working…'}
              </span>
              {#if pipeline.writingDraft && pipeline.firstDraftDone}
                <p class="pip-stream">
                  {pipeline.writingDraft.split(/\s+/).slice(-10).join(' ')}
                </p>
              {/if}
              {#if pipeline.thinkingNode && pipeline.thinkingBuffer}
                <p class="pip-thinking-label">{pipeline.thinkingNode}</p>
                <p class="pip-stream pip-thinking">
                  {pipeline.thinkingBuffer.slice(-200)}
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
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
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

    {#if pipeline.running && !pipeline.stalled && !isDemo}
      <button class="pip-pause-btn" onclick={pipeline.onPause}>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
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
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
            />
          </svg>
          Resume
        </button>
      </div>
    {/if}

    {#if pipeline.factCheckerInterrupted}
      <div class="pip-fact-actions">
        <button class="pip-fact-btn pip-fact-revise" onclick={pipeline.onRevise}>Revise</button>
        <button class="pip-fact-btn pip-fact-approve" onclick={pipeline.onApproveAll}>
          Approve all
        </button>
      </div>
    {/if}
  </div>
</aside>

<style>
  /* ── Sidebar base ──────────────────────────────────────────────────── */
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
  /* Prevent children from reflowing as the sidebar width animates */
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
  .pip-collapse-btn {
    background: transparent;
    border: none;
    color: #334155;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .pip-collapse-btn:hover {
    color: #94a3b8;
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
    color: #475569;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .pip-tab:hover {
    color: #94a3b8;
    background: rgba(20, 28, 46, 0.98);
  }
  .pip-tab-live {
    color: #818cf8;
    border-color: rgba(99, 102, 241, 0.3);
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

  /* ── Pipeline body ───────────────────────────────────────────────── */
  .pipeline-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0 1rem;
    display: flex;
    flex-direction: column;
  }
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
  .pip-thinking-label {
    font-size: 0.6rem;
    color: #2d3f55;
    margin: 5px 0 1px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    font-style: normal;
  }
  .pip-thinking {
    color: #2d3f55;
  }
  .pip-stream {
    font-size: 0.67rem;
    color: #334155;
    margin: 3px 0 0;
    font-style: italic;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
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

  /* Fact-checker approval buttons */
  .pip-fact-actions {
    display: flex;
    gap: 0.375rem;
    margin: 0.5rem 0.625rem 0;
  }
  .pip-fact-btn {
    flex: 1;
    border: none;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.38rem 0.5rem;
    cursor: pointer;
    transition: background 0.12s;
  }
  .pip-fact-revise {
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.25);
    color: #a5b4fc;
  }
  .pip-fact-revise:hover {
    background: rgba(99, 102, 241, 0.22);
  }
  .pip-fact-approve {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.22);
    color: #4ade80;
  }
  .pip-fact-approve:hover {
    background: rgba(34, 197, 94, 0.18);
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 1023px) {
    /* Hide the fixed show-button — the header arrow handles toggle on narrow */
    .pip-tab {
      display: none;
    }

    /* Reset min-width on children */
    .sidebar-header,
    .pipeline-body {
      min-width: 0;
    }

    /* Stacks above content; collapses to just the header row */
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

    /* Chevron: points down when collapsed, up when expanded */
    .pip-collapse-btn svg {
      transform: rotate(90deg);
      transition: transform 0.2s;
    }
    .sidebar.open .pip-collapse-btn svg {
      transform: rotate(-90deg);
    }
  }
</style>
