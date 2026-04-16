<script lang="ts">
  import { Button } from '$lib/components/ui/button'

  type Props = {
    userEmail: string
    isDemo: boolean
    historyCollapsed: boolean
    ontogglemobile: () => void
    ontogglesidebar: () => void
    onlogout: () => void
  }
  let { userEmail, isDemo, historyCollapsed, ontogglemobile, ontogglesidebar, onlogout }: Props =
    $props()

  const homeHref = $derived(`/generate${isDemo ? '?demo' : ''}`)
</script>

<header
  class="sticky top-0 z-30 flex h-13 items-center justify-between gap-2 border-b border-white/6 bg-[rgba(8,12,20,0.88)] px-5 backdrop-blur-md"
>
  <div class="flex min-w-0 items-center gap-2.5">
    <Button
      variant="ghost"
      size="icon"
      class="flex sm:hidden"
      onclick={ontogglemobile}
      aria-label="Toggle history"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
          clip-rule="evenodd"
        />
      </svg>
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="hidden sm:flex"
      onclick={ontogglesidebar}
      aria-label={historyCollapsed ? 'Expand history' : 'Collapse history'}
      title={historyCollapsed ? 'Show history' : 'Hide history'}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
          clip-rule="evenodd"
        />
      </svg>
    </Button>

    <a
      href={homeHref}
      class="flex shrink-0 items-center gap-2.5 no-underline"
      aria-label="BlogWriter home"
    >
      <div
        class="border-brand-400/25 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-linear-to-br from-[rgba(99,102,241,0.2)] to-[rgba(129,140,248,0.1)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="url(#lgGrad)"
            fill-opacity="0.15"
          />
          <path
            d="M17.5 6.5a1.5 1.5 0 00-2.12 0l-7.5 7.5a2.5 2.5 0 00-.63 1.07L6.5 17.5l2.43-.75a2.5 2.5 0 001.07-.63l7.5-7.5a1.5 1.5 0 000-2.12z"
            stroke="url(#lgGrad)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M15.5 8.5l2 2" stroke="url(#lgGrad)" stroke-width="1.5" stroke-linecap="round" />
          <defs>
            <linearGradient
              id="lgGrad"
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#a5b4fc" />
              <stop offset="1" stop-color="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="flex flex-col gap-px">
        <span
          class="bg-linear-to-br from-[#e2e8f0] to-[#a5b4fc] bg-clip-text text-[0.9rem] leading-[1.1] font-bold tracking-[-0.02em] text-transparent"
          >BlogWriter</span
        >
        <span
          class="text-text-muted text-[0.6rem] leading-none font-medium tracking-[0.05em] uppercase"
          >AI-powered</span
        >
      </div>
    </a>
  </div>

  <div class="flex shrink-0 items-center gap-2.5">
    <Button href={homeHref} size="sm" class="gap-[0.35rem]" title="Start a new post">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
        />
      </svg>
      New Post
    </Button>
    {#if userEmail}
      <span
        class="text-text-muted max-w-[160px] overflow-hidden text-[0.78rem] text-ellipsis whitespace-nowrap"
        >{userEmail}</span
      >
    {/if}
    <Button variant="ghost" size="sm" onclick={onlogout}>Sign out</Button>
  </div>
</header>
