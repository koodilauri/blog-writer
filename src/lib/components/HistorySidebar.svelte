<script lang="ts">
  import type { PostListItem } from '$lib/schemas/posts'
  import { Button } from '$lib/components/ui/button'

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
  <div
    class="sidebar-header text-text-muted flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 text-[0.7rem] font-semibold tracking-[0.08em] uppercase"
  >
    <span>Post History</span>
    <Button
      variant="ghost"
      size="icon"
      class="text-surface-border hover:text-text-secondary size-6 shrink-0"
      onclick={onclose}
      aria-label="Close history"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        />
      </svg>
    </Button>
  </div>
  <div class="sidebar-body flex-1 overflow-y-auto py-1.5">
    {#if loading}
      <div class="flex items-center justify-center px-4 py-8">
        <span class="spin-sm"></span>
      </div>
    {:else if items.length === 0}
      <p class="text-surface-border m-0 px-4 py-8 text-center text-[0.78rem] leading-relaxed">
        No posts yet. Generate one!
      </p>
    {:else}
      {#each items as item}
        <div class="group/item border-b border-white/3 hover:bg-white/2.5">
          <div class="flex items-stretch">
            <button
              class="min-w-0 flex-1 cursor-pointer border-none bg-transparent px-3 py-[0.55rem] text-left"
              onclick={() => onnavigate(item.id)}
            >
              <span
                class="text-text-secondary mb-0.5 block overflow-hidden text-[0.78rem] font-medium text-ellipsis whitespace-nowrap group-hover/item:text-[#cbd5e1]"
                >{item.seoTitle || item.topic}</span
              >
              <span class="text-surface-border block text-[0.68rem]">
                {new Date(item.savedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                · {item.format}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              class="shrink-0 rounded-none px-2.5 text-transparent hover:text-[--color-error]"
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
            </Button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</aside>

<style>
  /* Width animation — no Tailwind equivalent for animated collapse */
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
      transition: transform 0.22s ease;
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
