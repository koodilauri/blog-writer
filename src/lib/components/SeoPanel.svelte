<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'

  type SeoMeta = { titles: string[]; metaDescription: string; tags: string[]; slug: string }

  type Props = {
    seoMeta: SeoMeta
    oncopy: (text: string) => void
  }
  let { seoMeta, oncopy }: Props = $props()

  const copyIcon = `<path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>`
</script>

<section class="rounded-2xl border border-white/7 bg-white/3 p-6">
  <div class="mb-5">
    <h2
      class="font-display text-text-primary m-0 mb-0.5 text-[0.95rem] font-semibold tracking-[-0.02em]"
    >
      SEO Metadata
    </h2>
    <p class="m-0 text-[0.82rem] text-white/30">Click any item to copy.</p>
  </div>

  <div class="mb-5">
    <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
      Title options
    </p>
    <ul class="m-0 flex list-none flex-col gap-[0.375rem] p-0">
      {#each seoMeta.titles as title}
        <li>
          <button
            class="group hover:border-brand-400/30 hover:bg-brand-400/4 flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border border-white/7 bg-white/3 px-3 py-2.5 text-left text-[0.85rem] text-white/65 transition-[border-color,background] duration-150 hover:text-white/85"
            onclick={() => oncopy(title)}
          >
            <span>{title}</span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="group-hover:text-brand-400 shrink-0 text-white/25">{@html copyIcon}</svg
            >
          </button>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mb-5">
    <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
      Meta description
      <span class="font-normal tracking-normal normal-case"
        >({seoMeta.metaDescription.length} chars)</span
      >
    </p>
    <button
      class="group hover:border-brand-400/30 hover:bg-brand-400/4 flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border border-white/7 bg-white/3 px-3 py-2.5 text-left text-[0.85rem] text-white/65 transition-[border-color,background] duration-150 hover:text-white/85"
      onclick={() => oncopy(seoMeta.metaDescription)}
    >
      <span class="text-[0.85rem] leading-[1.55]">{seoMeta.metaDescription}</span>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="group-hover:text-brand-400 mt-[2px] shrink-0 text-white/25">{@html copyIcon}</svg
      >
    </button>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
        Slug
      </p>
      <button
        class="group hover:border-brand-400/30 hover:bg-brand-400/4 flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border border-white/7 bg-white/3 px-3 py-2.5 text-left text-[0.85rem] text-white/65 transition-[border-color,background] duration-150 hover:text-white/85"
        onclick={() => oncopy(seoMeta.slug)}
      >
        <code class="text-brand-400 font-mono text-[0.85rem]">{seoMeta.slug}</code>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="group-hover:text-brand-400 shrink-0 text-white/25">{@html copyIcon}</svg
        >
      </button>
    </div>
    <div>
      <p class="mb-2 text-[0.68rem] font-semibold tracking-[0.08em] text-white/25 uppercase">
        Tags
      </p>
      <div class="flex flex-wrap gap-[0.375rem]">
        {#each seoMeta.tags as tag}
          <Badge
            variant="secondary"
            class="cursor-pointer font-mono hover:bg-[rgba(79,70,229,0.22)]"
            onclick={() => oncopy(tag)}>{tag}</Badge
          >
        {/each}
      </div>
    </div>
  </div>
</section>
