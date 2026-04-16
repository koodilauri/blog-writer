<script lang="ts">
  type Source = { url: string; title: string; content?: string }

  type Props = {
    activity: string
    sources: Source[]
    writingOutline: string
  }
  let { activity, sources, writingOutline }: Props = $props()
</script>

<section class="flex flex-col gap-5 rounded-2xl border border-white/7 bg-white/3 p-6">
  <div class="flex items-center gap-[0.6rem] text-[0.85rem] text-white/45">
    <span
      class="border-brand-400/20 border-t-brand-400 inline-block size-[11px] shrink-0 animate-[layoutSpin_0.75s_linear_infinite] rounded-full border-[1.5px]"
    ></span>
    <span>{activity}</span>
  </div>
  {#if sources.length > 0}
    <div>
      <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
        Sources found
      </p>
      <ul class="m-0 flex list-none flex-col gap-[0.35rem] p-0">
        {#each sources as s}
          <li>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-brand-400 block overflow-hidden text-[0.82rem] text-ellipsis whitespace-nowrap no-underline hover:underline"
              >{s.title || s.url}</a
            >
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if writingOutline}
    <div>
      <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
        Generating outline…
      </p>
      <pre
        class="m-0 border-none bg-none p-0 font-serif text-[0.85rem] leading-[1.7] whitespace-pre-wrap text-white/45">{writingOutline}</pre>
    </div>
  {/if}
</section>
