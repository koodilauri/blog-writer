<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select'

  const FORMAT_OPTIONS = ['blog post', 'essay', 'tutorial', 'story', 'scientific abstract']
  const TONE_OPTIONS = [
    'formal and informative',
    'funny',
    'for kids',
    'scientific',
    'inspirational'
  ]
  const WORD_COUNT_OPTIONS = [
    'short (~300 words)',
    'medium (~600 words)',
    'long (~1200 words)',
    'in-depth (~2500 words)'
  ]

  let topic = $state('')
  let format = $state('blog post')
  let tone = $state('formal and informative')
  let wordCount = $state('medium (~600 words)')
  let resumeRunId = $state<string | null>(null)
  let resumeTopic = $state('')

  const isDemo = $derived(page.url.searchParams.has('demo'))

  onMount(async () => {
    if (isDemo && !topic) topic = 'How AI coding assistants are changing software development'
    if (!isDemo) {
      const res = await fetch('/api/session')
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown> | null
        if (data && typeof data.runId === 'string' && !data.finalPost) {
          resumeRunId = data.runId
          resumeTopic = typeof data.topic === 'string' ? data.topic : ''
        }
      }
    }
  })

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    const runId = crypto.randomUUID()
    sessionStorage.setItem(`draft:${runId}`, JSON.stringify({ topic, format, tone, wordCount }))
    await goto(`/drafts/${runId}?chat=${runId}${isDemo ? '&demo' : ''}`)
  }
</script>

<main>
  {#if resumeRunId}
    <div class="resume-banner">
      <div class="resume-banner-left">
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          style="flex-shrink:0;color:#818cf8"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <span class="resume-title">Unfinished draft</span>
          {#if resumeTopic}<span class="resume-topic">{resumeTopic}</span>{/if}
        </div>
      </div>
      <a href="/drafts/{resumeRunId}?chat={resumeRunId}" class="resume-link">Continue →</a>
    </div>
  {/if}

  {#if isDemo}
    <div class="demo-banner" role="status">
      <div class="demo-banner-left">
        <span class="demo-badge">DEMO</span>
        <span
          >This is a simulated run — pre-recorded content, no API calls. Hit Generate to watch it
          play back.</span
        >
      </div>
      <a href="/login" class="demo-signin-link">Sign in →</a>
    </div>
  {/if}

  <section class="card-surface">
    <div class="mb-5">
      <h1 class="font-display m-0 mb-1 text-[1.1rem] font-bold tracking-[-0.03em] text-[#f8fafc]">
        Generate a post
      </h1>
      <p class="m-0 text-[0.82rem] text-white/30">Describe what you want to write about.</p>
    </div>

    <form class="flex flex-col gap-4" onsubmit={onSubmit}>
      <div class="flex flex-col gap-[0.4rem]">
        <label for="topic" class="text-[0.78rem] font-medium tracking-[0.01em] text-white/45">
          Topic
        </label>
        <Textarea
          id="topic"
          bind:value={topic}
          rows={3}
          class="min-h-[80px]"
          placeholder="e.g. The impact of AI on modern software development"
          required
        />
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <div class="flex flex-col gap-[0.4rem]">
          <label class="text-[0.78rem] font-medium tracking-[0.01em] text-white/45">Format</label>
          <Select type="single" bind:value={format}>
            <SelectTrigger><span>{format}</span></SelectTrigger>
            <SelectContent>
              {#each FORMAT_OPTIONS as opt}
                <SelectItem value={opt} label={opt} />
              {/each}
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-[0.4rem]">
          <label class="text-[0.78rem] font-medium tracking-[0.01em] text-white/45">Tone</label>
          <Select type="single" bind:value={tone}>
            <SelectTrigger><span>{tone}</span></SelectTrigger>
            <SelectContent>
              {#each TONE_OPTIONS as opt}
                <SelectItem value={opt} label={opt} />
              {/each}
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-[0.4rem]">
          <label class="text-[0.78rem] font-medium tracking-[0.01em] text-white/45">Length</label>
          <Select type="single" bind:value={wordCount}>
            <SelectTrigger><span>{wordCount}</span></SelectTrigger>
            <SelectContent>
              {#each WORD_COUNT_OPTIONS as opt}
                <SelectItem value={opt} label={opt} />
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg" class="mt-1 w-full gap-2" disabled={!topic.trim()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
          />
        </svg>
        Generate post
      </Button>
    </form>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    overflow-x: hidden;
  }

  main {
    flex: 1;
    min-width: 0;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 1160px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ── Resume banner ───────────────────────────────── */
  .resume-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 1rem;
    background: rgba(129, 140, 248, 0.06);
    border: 1px solid rgba(129, 140, 248, 0.18);
    border-radius: 10px;
    font-size: 0.82rem;
  }
  .resume-banner-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
  }
  .resume-title {
    display: block;
    font-weight: 600;
    color: #a5b4fc;
    font-size: 0.8rem;
  }
  .resume-topic {
    display: block;
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.76rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .resume-link {
    font-size: 0.82rem;
    font-weight: 600;
    color: #818cf8;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .resume-link:hover {
    color: #a5b4fc;
  }

  /* ── Demo banner ─────────────────────────────────── */
  .demo-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 1rem;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .demo-banner-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .demo-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
    flex-shrink: 0;
  }

  .demo-signin-link {
    font-size: 0.82rem;
    font-weight: 500;
    color: #a5b4fc;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color 0.15s;
  }
  .demo-signin-link:hover {
    color: #c7d2fe;
  }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }
  }
</style>
