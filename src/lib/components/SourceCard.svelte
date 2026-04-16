<script lang="ts">
  type Props = {
    url: string
    title: string
    score: number
    checked: boolean
    ontoggle: () => void
  }
  let { url, title, score, checked, ontoggle }: Props = $props()

  const scoreBadgeClass = $derived(
    score >= 4
      ? 'bg-success/15 text-success'
      : score === 3
        ? 'bg-warning/15 text-[#fbbf24]'
        : 'bg-error/15 text-error'
  )
</script>

<li class="flex items-center gap-2.5">
  <input
    type="checkbox"
    {checked}
    onchange={ontoggle}
    class="accent-brand-600 size-[15px] shrink-0 cursor-pointer"
  />
  <span class="shrink-0 rounded px-[0.4rem] py-[0.15rem] text-[0.68rem] font-bold {scoreBadgeClass}"
    >{score}/5</span
  >
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    class="text-brand-400 min-w-0 overflow-hidden text-[0.8rem] text-ellipsis whitespace-nowrap no-underline"
    >{title || url}</a
  >
</li>
