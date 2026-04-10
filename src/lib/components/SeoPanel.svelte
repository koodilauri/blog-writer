<script lang="ts">
  type SeoMeta = { titles: string[]; metaDescription: string; tags: string[]; slug: string }

  type Props = {
    seoMeta: SeoMeta
    oncopy: (text: string) => void
  }
  let { seoMeta, oncopy }: Props = $props()

  const copyIcon = `<path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/>`
</script>

<section class="card">
  <div class="card-head">
    <h2>SEO Metadata</h2>
    <p>Click any item to copy.</p>
  </div>

  <div class="seo-section">
    <p class="seo-label">Title options</p>
    <ul class="seo-titles">
      {#each seoMeta.titles as title}
        <li>
          <button class="seo-copy-row" onclick={() => oncopy(title)}>
            <span>{title}</span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
              >{@html copyIcon}</svg
            >
          </button>
        </li>
      {/each}
    </ul>
  </div>

  <div class="seo-section">
    <p class="seo-label">
      Meta description <span class="seo-count">({seoMeta.metaDescription.length} chars)</span>
    </p>
    <button class="seo-copy-row" onclick={() => oncopy(seoMeta.metaDescription)}>
      <span class="seo-desc">{seoMeta.metaDescription}</span>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="currentColor"
        style="flex-shrink:0;margin-top:2px">{@html copyIcon}</svg
      >
    </button>
  </div>

  <div class="seo-two-col">
    <div class="seo-section">
      <p class="seo-label">Slug</p>
      <button class="seo-copy-row" onclick={() => oncopy(seoMeta.slug)}>
        <code class="seo-slug">{seoMeta.slug}</code>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">{@html copyIcon}</svg>
      </button>
    </div>
    <div class="seo-section">
      <p class="seo-label">Tags</p>
      <div class="seo-tags">
        {#each seoMeta.tags as tag}
          <button class="tag-chip" onclick={() => oncopy(tag)}>{tag}</button>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.5rem;
  }
  .card-head {
    margin-bottom: 1.25rem;
  }
  .card-head h2 {
    font-family: 'DM Sans', 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.02em;
    margin: 0 0 0.2rem;
  }
  .card-head p {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0;
  }
  .seo-section {
    margin-bottom: 1.25rem;
  }
  .seo-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin: 0 0 0.5rem;
  }
  .seo-count {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }
  .seo-titles {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
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
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    text-align: left;
    color: rgba(255, 255, 255, 0.65);
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .seo-copy-row:hover {
    border-color: rgba(129, 140, 248, 0.3);
    background: rgba(129, 140, 248, 0.04);
    color: rgba(255, 255, 255, 0.85);
  }
  .seo-copy-row :global(svg) {
    color: rgba(255, 255, 255, 0.25);
    flex-shrink: 0;
  }
  .seo-copy-row:hover :global(svg) {
    color: #818cf8;
  }
  .seo-desc {
    font-size: 0.85rem;
    line-height: 1.55;
  }
  .seo-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .seo-slug {
    font-family: monospace;
    font-size: 0.85rem;
    color: #818cf8;
  }
  .seo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
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
</style>
