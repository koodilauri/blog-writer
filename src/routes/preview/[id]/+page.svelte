<script lang="ts">
  import { goto } from '$app/navigation'
  import { getContext } from 'svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { marked } from 'marked'

  type Source = { url: string; title: string }
  type SeoMeta = { titles: string[]; metaDescription: string; tags: string[]; slug: string }
  type SavedPost = {
    id: string
    savedAt: string
    topic: string
    seoTitle: string
    format: string
    tone: string
    wordCount: string
    post: string
    sources: Source[]
    seoMeta?: SeoMeta | null
  }

  const { data } = $props<{ data: { post: SavedPost } }>()
  const { refreshHistory } = getContext<{ refreshHistory: () => void }>('app')

  let showDeleteDialog = $state(false)

  function renderMd(text: string): string {
    return marked.parse(text, { async: false }) as string
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* silent */
    }
  }

  async function confirmDelete() {
    await fetch(`/api/posts?id=${data.post.id}`, { method: 'DELETE' })
    refreshHistory()
    goto('/generate')
  }

  const copyIcon = `<path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>`
  const trashIcon = `<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd"/>`
</script>

<main class="mx-auto box-border flex w-full max-w-[900px] flex-1 flex-col gap-5 p-4 md:p-6">
  <section class="card-surface overflow-hidden">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-white/6 px-6 py-5">
      <div class="min-w-0 flex-1">
        <h1
          class="text-text-primary m-0 mb-2.5 font-serif text-[1.2rem] leading-[1.35] font-semibold tracking-[-0.01em]"
        >
          {data.post.seoMeta?.titles?.[0] || data.post.topic}
        </h1>
        <div class="flex flex-wrap gap-1.5">
          <Badge variant="outline" class="text-[0.7rem]">{data.post.format}</Badge>
          <Badge variant="outline" class="text-[0.7rem]">{data.post.tone}</Badge>
          <Badge variant="secondary" class="text-[0.7rem]"
            >{new Date(data.post.savedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</Badge
          >
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          class="gap-1.5 text-[0.78rem]"
          onclick={() => copyToClipboard(data.post.post)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">{@html copyIcon}</svg>
          Copy
        </Button>
        <Button
          variant="destructive"
          size="sm"
          class="gap-1.5 text-[0.78rem]"
          onclick={() => (showDeleteDialog = true)}
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">{@html trashIcon}</svg
          >
          Delete
        </Button>
      </div>
    </div>

    <!-- Body -->
    <div class="p-6">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="prose">{@html renderMd(data.post.post)}</div>
    </div>

    <!-- Footer: word count -->
    <div
      class="flex items-center gap-2 border-t border-white/6 px-6 py-2.5 text-[0.75rem] text-white/20"
      style="background:rgba(255,255,255,0.015)"
    >
      <span>{data.post.post.trim().split(/\s+/).filter(Boolean).length} words</span>
      <span>·</span>
      <span>{data.post.post.length} chars</span>
    </div>
  </section>

  <!-- Sources + SEO -->
  {#if data.post.sources?.length || data.post.seoMeta}
    <section class="card-surface flex flex-wrap gap-8 p-6">
      {#if data.post.sources?.length}
        <div class="min-w-[280px] flex-1">
          <p class="section-label mb-3">Sources</p>
          <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
            {#each data.post.sources as s}
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

      {#if data.post.seoMeta}
        <div class="min-w-[280px] flex-1">
          <p class="section-label mb-3">SEO Metadata</p>
          <p class="section-label mt-0 mb-1.5">Title options</p>
          <ul class="m-0 mb-2 flex list-none flex-col gap-1.5 p-0">
            {#each data.post.seoMeta.titles as title}
              <li>
                <button class="seo-copy-row" onclick={() => copyToClipboard(title)}>
                  <span>{title}</span>
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
                    >{@html copyIcon}</svg
                  >
                </button>
              </li>
            {/each}
          </ul>
          <p class="section-label mt-4 mb-1.5">
            Meta description
            <span class="font-normal tracking-normal normal-case"
              >({data.post.seoMeta.metaDescription.length} chars)</span
            >
          </p>
          <button
            class="seo-copy-row"
            onclick={() => copyToClipboard(data.post.seoMeta!.metaDescription)}
          >
            <span class="text-[0.82rem] leading-[1.55]">{data.post.seoMeta.metaDescription}</span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              style="flex-shrink:0;margin-top:2px">{@html copyIcon}</svg
            >
          </button>
          <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p class="section-label mt-4 mb-1.5">Slug</p>
              <button class="seo-copy-row" onclick={() => copyToClipboard(data.post.seoMeta!.slug)}>
                <code class="text-brand-400 font-mono text-[0.82rem]">{data.post.seoMeta.slug}</code
                >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
                  >{@html copyIcon}</svg
                >
              </button>
            </div>
            <div>
              <p class="section-label mt-4 mb-1.5">Tags</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                {#each data.post.seoMeta.tags as tag}
                  <Badge
                    variant="secondary"
                    class="cursor-pointer font-mono text-[0.78rem] hover:bg-[rgba(79,70,229,0.22)]"
                    onclick={() => copyToClipboard(tag)}>{tag}</Badge
                  >
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>
  {/if}
</main>

<!-- Delete confirmation dialog -->
<Dialog.Root
  open={showDeleteDialog}
  onOpenChange={open => {
    if (!open) showDeleteDialog = false
  }}
>
  <Dialog.Content aria-describedby="dialog-desc">
    <div
      class="text-error mb-4 flex size-10 items-center justify-center rounded-[10px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.1)]"
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">{@html trashIcon}</svg>
    </div>
    <Dialog.Title>Delete post?</Dialog.Title>
    <p id="dialog-desc" class="mt-1.5 mb-6 text-[0.875rem] leading-[1.55] text-white/40">
      This post will be permanently deleted and cannot be recovered.
    </p>
    <div class="flex justify-end gap-2.5">
      <Button variant="secondary" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
      <Button variant="destructive" onclick={confirmDelete}>Delete</Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  main {
    flex: 1;
  }

  /* ── Prose — keep entirely: complex rendered markdown ─────────────── */
  .prose {
    font-family: 'Lora', Georgia, serif;
    font-size: 0.925rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.75);
    white-space: normal;
  }
  .prose :global(h1),
  .prose :global(h2),
  .prose :global(h3),
  .prose :global(h4) {
    font-family: 'DM Sans', 'Inter', sans-serif;
    color: #f1f5f9;
    line-height: 1.25;
    margin: 1.75em 0 0.5em;
  }
  .prose :global(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  .prose :global(h2) {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .prose :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.015em;
  }
  .prose :global(h4) {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .prose :global(p) {
    margin: 0 0 1em;
  }
  .prose :global(p:last-child) {
    margin-bottom: 0;
  }
  .prose :global(strong) {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  .prose :global(em) {
    font-style: italic;
  }
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0.5em 0 1em;
    padding-left: 1.5em;
  }
  .prose :global(li) {
    margin-bottom: 0.35em;
  }
  .prose :global(blockquote) {
    border-left: 3px solid rgba(129, 140, 248, 0.4);
    margin: 1em 0;
    padding: 0.25em 0 0.25em 1em;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
  .prose :global(code) {
    font-family: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    font-size: 0.82em;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 0.1em 0.35em;
    color: #a5b4fc;
  }
  .prose :global(pre) {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 1em 1.25em;
    overflow-x: auto;
    margin: 1em 0;
  }
  .prose :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.85em;
    color: rgba(255, 255, 255, 0.7);
  }
  .prose :global(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 2em 0;
  }
  .prose :global(a) {
    color: #818cf8;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .prose :global(a:hover) {
    color: #a5b4fc;
  }
</style>
