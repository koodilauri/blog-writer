<script lang="ts">
  type Props = {
    url: string
    title: string
    score: number
    checked: boolean
    ontoggle: () => void
  }
  let { url, title, score, checked, ontoggle }: Props = $props()
</script>

<li class="flex items-center gap-2.5">
  <input
    type="checkbox"
    {checked}
    onchange={ontoggle}
    class="accent-brand-600 size-[15px] shrink-0 cursor-pointer"
  />
  <span
    class="score-badge shrink-0"
    class:high={score >= 4}
    class:mid={score === 3}
    class:low={score < 3}>{score}/5</span
  >
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    class="text-brand-400 min-w-0 overflow-hidden text-[0.8rem] text-ellipsis whitespace-nowrap no-underline"
    >{title || url}</a
  >
</li>

<style>
  /* Color-coded score badges — kept as scoped CSS (3 distinct color states) */
  .score-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
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
</style>
