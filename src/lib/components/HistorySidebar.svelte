<script lang="ts">
  import type { PostListItem } from '$lib/schemas/posts'

  type Props = {
    items: PostListItem[]
    loading: boolean
    collapsed: boolean
    open: boolean
    isDemo: boolean
    onclose: () => void
    onnavigate: (id: string) => void
    ondelete: (id: string) => void
  }
  let { items, loading, collapsed, open, isDemo, onclose, onnavigate, ondelete }: Props = $props()
</script>

<aside class="sidebar" class:open class:collapsed aria-label="Post history">
  <div class="sidebar-header">
    <span>Post History</span>
    <button class="sidebar-close" onclick={onclose} aria-label="Close history">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        />
      </svg>
    </button>
  </div>
  <div class="sidebar-body">
    {#if loading}
      <div class="sidebar-empty"><span class="spin-sm"></span></div>
    {:else if items.length === 0}
      <p class="sidebar-empty-txt">No posts yet. Generate one!</p>
    {:else}
      {#each items as item}
        <div class="history-item">
          <div class="history-item-row">
            <button class="history-item-btn" onclick={() => onnavigate(item.id)}>
              <span class="hi-title">{item.seoTitle || item.topic}</span>
              <span class="hi-meta">
                {new Date(item.savedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                · {item.format}
              </span>
            </button>
            <button
              class="hi-delete"
              onclick={() => ondelete(item.id)}
              aria-label="Delete post"
              title="Delete post"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    background: rgba(15, 21, 35, 0.82);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 20;
    position: relative;
    flex-shrink: 0;
    width: 256px;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    transition: width 0.22s ease;
  }
  /* Children keep a fixed width so they never reflow during the animation */
  .sidebar-header,
  .sidebar-body {
    min-width: 256px;
  }
  .sidebar.collapsed {
    width: 0;
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.7rem;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .sidebar-close {
    background: transparent;
    border: none;
    color: #334155;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .sidebar-close:hover {
    color: #94a3b8;
  }
  .sidebar-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem 0;
  }
  .sidebar-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .sidebar-empty-txt {
    font-size: 0.78rem;
    color: #334155;
    text-align: center;
    padding: 2rem 1rem;
    margin: 0;
    line-height: 1.5;
  }
  .history-item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }
  .history-item:hover {
    background: rgba(255, 255, 255, 0.025);
  }
  .history-item-row {
    display: flex;
    align-items: stretch;
  }
  .history-item-btn {
    flex: 1;
    background: transparent;
    border: none;
    text-align: left;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
    min-width: 0;
  }
  .hi-title {
    display: block;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }
  .history-item-btn:hover .hi-title {
    color: #cbd5e1;
  }
  .hi-meta {
    display: block;
    font-size: 0.68rem;
    color: #334155;
  }
  .hi-delete {
    background: transparent;
    border: none;
    color: #1e293b;
    cursor: pointer;
    padding: 0 0.625rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .hi-delete:hover {
    color: #ef4444;
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 52px;
      bottom: 0;
      left: 0;
      z-index: 40;
      width: 280px !important;
      min-width: 280px !important;
      transform: translateX(-100%);
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .sidebar-header,
    .sidebar-body {
      min-width: 0;
    }
  }
</style>
