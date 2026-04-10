<script lang="ts">
  import { escHtml, findRevisionRanges, renderHighlighted } from '$lib/claim-span'

  type Props = {
    finalPost: string
    currentDraft: string
    writingDraft: string
    running: boolean
    firstDraftDone: boolean
    thinkingNode: string | null
    revisionNotes: string[]
    approvedNotes: Set<number>
    factCheckerInterrupted: boolean
    interruptedFactNotes: string[]
    approvedFactNotes: Set<string>
    sources: { url: string; title: string }[]
    oncopy: (text: string) => void
    onapprovenote: (index: number) => void
    onapproveFactNote: (note: string) => void
  }

  let {
    finalPost,
    currentDraft,
    writingDraft,
    running,
    firstDraftDone,
    thinkingNode,
    revisionNotes,
    approvedNotes,
    factCheckerInterrupted,
    interruptedFactNotes,
    approvedFactNotes,
    sources,
    oncopy,
    onapprovenote,
    onapproveFactNote
  }: Props = $props()

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

  let revTooltip = $state<{
    note: string
    noteIndex: number
    x: number
    y: number
    below: boolean
  } | null>(null)

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

  const copyIcon = `<path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>`
</script>

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
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                  </li>
                {/each}
              </ul>
            </div>
          </details>
        {/if}
        <button class="copy-btn" onclick={() => oncopy(finalPost)}>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">{@html copyIcon}</svg>
          Copy
        </button>
      </div>
    {:else if running && !firstDraftDone}
      <span class="live-badge"><span class="live-dot"></span>Writing first draft…</span>
    {:else if running}
      <span
        class="live-badge"
        style="color:#a78bfa;border-color:rgba(167,139,250,0.25);background:rgba(167,139,250,0.08)"
        ><span class="live-dot" style="background:#a78bfa"></span>{thinkingNode === 'editor'
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
                if (note) onapproveFactNote(note)
              } else {
                onapprovenote(revTooltip!.noteIndex)
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

<style>
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.5rem;
  }
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
  .draft-body {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: 0.9375rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.72);
    white-space: pre-wrap;
    padding: 1.25rem;
    margin: 0;
  }
  .draft-raw {
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
    background: none;
    border: none;
  }
  .draft-empty {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 2rem 1.25rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.25);
  }
  .spin-sm {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-top-color: rgba(129, 140, 248, 0.7);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
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
    color: rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
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
</style>
