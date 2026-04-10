<script lang="ts">
  type Source = { url: string; title: string; content?: string }

  type Props = {
    activity: string
    sources: Source[]
    writingOutline: string
  }
  let { activity, sources, writingOutline }: Props = $props()
</script>

<section class="card waiting-card">
  <div class="waiting-header">
    <span class="spin-sm"></span>
    <span class="waiting-label">{activity}</span>
  </div>
  {#if sources.length > 0}
    <div class="waiting-sources">
      <p class="waiting-sources-label">Sources found</p>
      <ul class="waiting-sources-list">
        {#each sources as s}
          <li>
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if writingOutline}
    <div class="waiting-outline">
      <p class="waiting-sources-label">Generating outline…</p>
      <pre class="waiting-outline-text">{writingOutline}</pre>
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
  .waiting-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .waiting-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.85rem;
  }
  .waiting-label {
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.85rem;
  }
  .waiting-sources-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
    margin: 0 0 0.6rem;
  }
  .waiting-sources-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .waiting-sources-list a {
    font-size: 0.82rem;
    color: #818cf8;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .waiting-sources-list a:hover {
    text-decoration: underline;
  }
  .waiting-outline {
    margin-top: 1rem;
  }
  .waiting-outline-text {
    font-family: 'Lora', Georgia, serif;
    font-size: 0.85rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.45);
    white-space: pre-wrap;
    margin: 0;
    background: none;
    border: none;
    padding: 0;
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
</style>
