<script lang="ts">
  import { escHtml, findRevisionRanges, renderHighlighted } from '$lib/claim-span'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'

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

<section class="overflow-hidden rounded-2xl border border-white/7 bg-white/3">
  <div
    class="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-3.5"
  >
    <h2 class="text-text-primary m-0 text-[0.95rem] font-semibold tracking-[-0.02em]">
      {finalPost ? 'Generated Post' : 'Draft'}
    </h2>
    {#if finalPost}
      <div class="flex items-center gap-3">
        {#if sources.length > 0}
          <details class="sources-detail">
            <summary
              class="text-brand-400 cursor-pointer list-none text-[0.78rem] transition-colors hover:text-[#a5b4fc]"
            >
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </summary>
            <div class="sources-popup">
              <p
                class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase"
              >
                Sources
              </p>
              <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
                {#each sources as s}
                  <li>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-brand-400 block overflow-hidden text-[0.78rem] text-ellipsis whitespace-nowrap no-underline"
                      >{s.title || s.url}</a
                    >
                  </li>
                {/each}
              </ul>
            </div>
          </details>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          class="gap-1.5 text-[0.78rem]"
          onclick={() => oncopy(finalPost)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">{@html copyIcon}</svg>
          Copy
        </Button>
      </div>
    {:else if running && !firstDraftDone}
      <Badge
        variant="success"
        class="gap-1.5 rounded-full px-[0.6rem] py-[0.2rem] text-[0.72rem] font-medium"
      >
        <span
          class="size-1.5 shrink-0 animate-[livePulse_1.4s_ease-in-out_infinite] rounded-full bg-[#4ade80]"
        ></span>Writing first draft…
      </Badge>
    {:else if running}
      <Badge
        class="gap-1.5 rounded-full border-violet-400/25 bg-violet-400/8 px-[0.6rem] py-[0.2rem] text-[0.72rem] font-medium text-violet-400"
      >
        <span
          class="size-1.5 shrink-0 animate-[livePulse_1.4s_ease-in-out_infinite] rounded-full bg-violet-400"
        ></span>
        {thinkingNode === 'editor' ? 'Final editing…' : 'Revising…'}
      </Badge>
    {:else if revisionNotes.length > 0}
      <Badge
        variant="warning"
        class="rounded-full px-[0.6rem] py-[0.2rem] text-[0.72rem] font-medium"
      >
        revision highlights
      </Badge>
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
          <Button
            variant="approve"
            size="sm"
            class="self-start text-[0.72rem]"
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
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clip-rule="evenodd"
              />
            </svg>
            Mark as OK
          </Button>
        {:else}
          <span class="text-[0.72rem] font-semibold text-[#4ade80]">✓ Approved</span>
        {/if}
      </div>
    {/if}

    {#if revisionNotes.length > 0 && !finalPost && firstDraftDone && !factCheckerInterrupted}
      <div class="flex flex-col gap-1.5 border-t border-white/6 px-5 py-3.5">
        <p class="mb-1 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
          Revision notes
        </p>
        {#each revisionNotes as note}
          <div class="flex items-start gap-2 text-[0.8rem] leading-relaxed text-white/45">
            <span class="shrink-0 text-white/20">–</span>
            <span>{note}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if finalPost}
      <div
        class="flex items-center gap-2 border-t border-white/6 px-5 py-2.5 text-[0.75rem] text-white/20"
      >
        <span>{finalPost.trim().split(/\s+/).filter(Boolean).length} words</span>
        <span>·</span>
        <span>{finalPost.length} chars</span>
      </div>
    {/if}
  {:else}
    <div class="flex items-center gap-2.5 px-5 py-8 text-[0.85rem] text-white/25">
      <span
        class="border-brand-400/20 border-t-brand-400 inline-block size-[11px] shrink-0 animate-[layoutSpin_0.75s_linear_infinite] rounded-full border-[1.5px]"
      ></span>
      <span>Writing first draft…</span>
    </div>
  {/if}
</section>

<style>
  /* Sources dropdown — absolute positioning, no Tailwind equivalent */
  .sources-detail {
    position: relative;
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

  /* Draft body — serif font + pre-wrap layout */
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

  /* Revision tooltip — fixed position with CSS arrow, must stay custom */
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

  /* Inline text highlighting — rendered via {@html}, must be global */
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
