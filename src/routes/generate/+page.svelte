<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select'
  import { SessionSchema } from '$lib/schemas/session'

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
        const result = SessionSchema.nullable().safeParse(await res.json())
        const data = result.success ? result.data : null
        if (data && !data.finalPost) {
          resumeRunId = data.runId
          resumeTopic = data.topic ?? ''
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

<main class="mx-auto box-border flex w-full max-w-[1160px] flex-1 flex-col gap-5 p-6">
  {#if resumeRunId}
    <div
      class="border-brand-400/18 bg-brand-400/6 flex items-center justify-between gap-4 rounded-[10px] border px-4 py-2.5 text-[0.82rem]"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="text-brand-400 shrink-0"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <span class="block text-[0.8rem] font-semibold text-[#a5b4fc]">Unfinished draft</span>
          {#if resumeTopic}<span
              class="block overflow-hidden text-[0.76rem] text-ellipsis whitespace-nowrap text-white/35"
              >{resumeTopic}</span
            >{/if}
        </div>
      </div>
      <a
        href="/drafts/{resumeRunId}?chat={resumeRunId}"
        class="text-brand-400 shrink-0 text-[0.82rem] font-semibold whitespace-nowrap no-underline transition-colors duration-150 hover:text-[#a5b4fc]"
        >Continue →</a
      >
    </div>
  {/if}

  {#if isDemo}
    <div
      class="border-brand-500/20 bg-brand-500/8 flex items-center justify-between gap-4 rounded-[10px] border px-4 py-2.5 text-[0.82rem] text-white/50"
      role="status"
    >
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          class="demo-badge border-brand-500/35 bg-brand-500/20 shrink-0 rounded border px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.08em] text-[#a5b4fc]"
          >DEMO</span
        >
        <span
          >This is a simulated run — pre-recorded content, no API calls. Hit Generate to watch it
          play back.</span
        >
      </div>
      <a
        href="/login"
        class="shrink-0 text-[0.82rem] font-medium whitespace-nowrap text-[#a5b4fc] no-underline transition-colors duration-150 hover:text-[#c7d2fe]"
        >Sign in →</a
      >
    </div>
  {/if}

  <section class="rounded-2xl border border-white/7 bg-white/3 p-6">
    <div class="mb-5">
      <h1
        class="font-display text-text-primary m-0 mb-1 text-[1.1rem] font-bold tracking-[-0.03em]"
      >
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

      <Button
        type="submit"
        size="lg"
        class="generate-btn mt-1 w-full gap-2"
        disabled={!topic.trim()}
      >
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
