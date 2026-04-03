<script lang="ts">
  import { goto } from '$app/navigation'
  import { Dialog } from 'bits-ui'
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

  let rawMode = $state(false)
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
    goto('/generate')
  }
</script>

<main>
  <section class="card post-card">
    <!-- Header -->
    <div class="post-header">
      <div class="post-meta">
        <h1 class="post-title">{data.post.seoMeta?.titles?.[0] || data.post.topic}</h1>
        <div class="post-badges">
          <span class="badge">{data.post.format}</span>
          <span class="badge">{data.post.tone}</span>
          <span class="badge badge-date"
            >{new Date(data.post.savedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span
          >
        </div>
      </div>
      <div class="post-actions">
        <button class="md-toggle" class:active={!rawMode} onclick={() => (rawMode = false)}
          >Preview</button
        >
        <button class="md-toggle" class:active={rawMode} onclick={() => (rawMode = true)}
          >Markdown</button
        >
        <button class="copy-btn" onclick={() => copyToClipboard(data.post.post)}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"
            ><path
              d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
            /><path
              d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
            /></svg
          >
          Copy
        </button>
        <button class="delete-btn" onclick={() => (showDeleteDialog = true)}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"
            ><path
              fill-rule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clip-rule="evenodd"
            /></svg
          >
          Delete
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="post-body">
      {#if rawMode}
        <pre class="post-raw">{data.post.post}</pre>
      {:else}
        <div class="post-content prose">{@html renderMd(data.post.post)}</div>
      {/if}
    </div>

    <!-- Footer: word count -->
    <div class="post-footer">
      <span>{data.post.post.trim().split(/\s+/).filter(Boolean).length} words</span>
      <span>·</span>
      <span>{data.post.post.length} chars</span>
    </div>
  </section>

  <!-- Sources + SEO -->
  {#if data.post.sources?.length || data.post.seoMeta}
    <section class="card extras-card">
      {#if data.post.sources?.length}
        <div class="extras-section">
          <p class="extras-label">Sources</p>
          <ul class="sources-list">
            {#each data.post.sources as s}
              <li>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if data.post.seoMeta}
        <div class="extras-section">
          <p class="extras-label">SEO Metadata</p>
          <p class="seo-label">Title options</p>
          <ul class="seo-titles">
            {#each data.post.seoMeta.titles as title}
              <li>
                <button class="seo-copy-row" onclick={() => copyToClipboard(title)}>
                  <span>{title}</span>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"
                    ><path
                      d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
                    /><path
                      d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
                    /></svg
                  >
                </button>
              </li>
            {/each}
          </ul>
          <p class="seo-label">
            Meta description <span class="seo-count"
              >({data.post.seoMeta.metaDescription.length} chars)</span
            >
          </p>
          <button
            class="seo-copy-row"
            onclick={() => copyToClipboard(data.post.seoMeta!.metaDescription)}
          >
            <span class="seo-desc">{data.post.seoMeta.metaDescription}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="currentColor"
              style="flex-shrink:0;margin-top:2px"
              ><path
                d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
              /><path
                d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
              /></svg
            >
          </button>
          <div class="seo-two-col">
            <div>
              <p class="seo-label">Slug</p>
              <button class="seo-copy-row" onclick={() => copyToClipboard(data.post.seoMeta!.slug)}>
                <code class="seo-slug">{data.post.seoMeta.slug}</code>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"
                  ><path
                    d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
                  /><path
                    d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
                  /></svg
                >
              </button>
            </div>
            <div>
              <p class="seo-label">Tags</p>
              <div class="seo-tags">
                {#each data.post.seoMeta.tags as tag}
                  <button class="tag-chip" onclick={() => copyToClipboard(tag)}>{tag}</button>
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
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-content" aria-describedby="dialog-desc">
      <div class="dialog-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <Dialog.Title class="dialog-title">Delete post?</Dialog.Title>
      <p id="dialog-desc" class="dialog-desc">
        This post will be permanently deleted and cannot be recovered.
      </p>
      <div class="dialog-actions">
        <Dialog.Close class="dialog-cancel">Cancel</Dialog.Close>
        <button class="dialog-confirm" onclick={confirmDelete}>Delete</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  main {
    flex: 1;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ── Cards ───────────────────────────────────────── */
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    overflow: hidden;
  }

  /* ── Post card ───────────────────────────────────── */
  .post-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-wrap: wrap;
  }
  .post-meta {
    flex: 1;
    min-width: 0;
  }
  .post-title {
    font-family: 'Lora', Georgia, serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 0.625rem;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }
  .post-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .badge-date {
    color: rgba(129, 140, 248, 0.6);
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.12);
  }
  .post-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .md-toggle {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.35);
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s,
      background 0.15s;
  }
  .md-toggle:hover {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .md-toggle.active {
    color: #a5b4fc;
    border-color: rgba(129, 140, 248, 0.35);
    background: rgba(99, 102, 241, 0.08);
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

  .delete-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(248, 113, 113, 0.06);
    border: 1px solid rgba(248, 113, 113, 0.15);
    border-radius: 7px;
    color: rgba(248, 113, 113, 0.6);
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
  .delete-btn:hover {
    border-color: rgba(248, 113, 113, 0.3);
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }

  .post-body {
    padding: 1.5rem;
  }
  .post-raw {
    font-family: 'Lora', Georgia, serif;
    font-size: 0.925rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.7);
    white-space: pre-wrap;
    margin: 0;
  }

  /* ── Prose ───────────────────────────────────────── */
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

  .post-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.015);
  }

  /* ── Extras (sources + SEO) ──────────────────────── */
  .extras-card {
    padding: 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
  }
  .extras-section {
    flex: 1 1 280px;
    min-width: 0;
  }
  .extras-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin: 0 0 0.75rem;
  }

  .sources-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .sources-list a {
    font-size: 0.82rem;
    color: #818cf8;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sources-list a:hover {
    text-decoration: underline;
  }

  /* ── SEO ─────────────────────────────────────────── */
  .seo-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
    margin: 1rem 0 0.4rem;
  }
  .seo-label:first-of-type {
    margin-top: 0;
  }
  .seo-count {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }
  .seo-titles {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .seo-copy-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 0.5rem 0.625rem;
    cursor: pointer;
    text-align: left;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .seo-copy-row:hover {
    border-color: rgba(129, 140, 248, 0.3);
    background: rgba(129, 140, 248, 0.04);
    color: rgba(255, 255, 255, 0.85);
  }
  .seo-copy-row svg {
    color: rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }
  .seo-desc {
    font-size: 0.82rem;
    line-height: 1.55;
  }
  .seo-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  .seo-slug {
    font-family: monospace;
    font-size: 0.82rem;
    color: #818cf8;
  }
  .seo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.4rem;
  }
  .tag-chip {
    background: rgba(79, 70, 229, 0.12);
    color: #818cf8;
    border: none;
    border-radius: 6px;
    padding: 0.3rem 0.625rem;
    font-family: monospace;
    font-size: 0.78rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .tag-chip:hover {
    background: rgba(79, 70, 229, 0.22);
  }

  /* ── Dialog ──────────────────────────────────────── */
  :global(.dialog-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    z-index: 50;
    animation: fadeIn 0.15s ease;
  }
  :global(.dialog-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    background: #131929;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.75rem;
    width: min(420px, calc(100vw - 2rem));
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    animation: scaleIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  .dialog-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f87171;
    margin-bottom: 1rem;
  }
  :global(.dialog-title) {
    font-family: 'DM Sans', 'Inter', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    display: block;
  }
  .dialog-desc {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0 0 1.5rem;
    line-height: 1.55;
  }
  .dialog-actions {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
  }
  :global(.dialog-cancel) {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  :global(.dialog-cancel):hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
  }
  .dialog-confirm {
    background: #dc2626;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.5rem 1.125rem;
    cursor: pointer;
    transition:
      background 0.15s,
      box-shadow 0.15s;
  }
  .dialog-confirm:hover {
    background: #b91c1c;
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.35);
  }

  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }
    .seo-two-col {
      grid-template-columns: 1fr;
    }
    .post-header {
      flex-direction: column;
    }
  }
</style>
