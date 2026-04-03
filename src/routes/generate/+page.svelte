<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Select from '$lib/components/ui/Select.svelte'

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

  const isDemo = $derived(page.url.searchParams.has('demo'))

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    const runId = crypto.randomUUID()
    sessionStorage.setItem(`draft:${runId}`, JSON.stringify({ topic, format, tone, wordCount }))
    await goto(`/drafts/${runId}?chat=${runId}${isDemo ? '&demo' : ''}`)
  }
</script>

<main>
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

  <section class="card form-card">
    <div class="card-head">
      <h1>Generate a post</h1>
      <p>Describe what you want to write about.</p>
    </div>

    <form onsubmit={onSubmit}>
      <div class="field">
        <label for="topic">Topic</label>
        <textarea
          id="topic"
          bind:value={topic}
          rows={3}
          placeholder="e.g. The impact of AI on modern software development"
          required
        ></textarea>
      </div>

      <div class="options-grid">
        <div class="field">
          <label>Format</label>
          <Select bind:value={format} options={FORMAT_OPTIONS} />
        </div>
        <div class="field">
          <label>Tone</label>
          <Select bind:value={tone} options={TONE_OPTIONS} />
        </div>
        <div class="field">
          <label>Length</label>
          <Select bind:value={wordCount} options={WORD_COUNT_OPTIONS} />
        </div>
      </div>

      <button type="submit" class="generate-btn" disabled={!topic.trim()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
          ><path
            d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
          /></svg
        >
        Generate post
      </button>
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

  /* ── Cards ───────────────────────────────────────── */
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.5rem;
  }

  .card-head {
    margin-bottom: 1.25rem;
  }
  .card-head h1 {
    font-family: 'DM Sans', 'Inter', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.03em;
    margin: 0 0 0.25rem;
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

  /* ── Form ────────────────────────────────────────── */
  .form-card form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  label {
    font-size: 0.78rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.01em;
  }

  input[type='text'],
  textarea {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #f1f5f9;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    padding: 0.7rem 0.875rem;
    outline: none;
    resize: vertical;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  textarea {
    min-height: 80px;
  }

  input[type='text']::placeholder,
  textarea::placeholder {
    color: rgba(255, 255, 255, 0.12);
  }

  input[type='text']:focus,
  textarea:focus {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(129, 140, 248, 0.06);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .generate-btn {
    background: #4f46e5;
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition:
      background 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    margin-top: 0.25rem;
    letter-spacing: -0.01em;
  }
  .generate-btn:hover:not(:disabled) {
    background: #4338ca;
    box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
    transform: translateY(-1px);
  }
  .generate-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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

  /* ── Spinners ────────────────────────────────────── */
  .spin {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .spin-sm {
    width: 16px;
    height: 16px;
    display: inline-block;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Responsive ──────────────────────────────────── */
  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }
  }

  @media (max-width: 480px) {
    .card {
      padding: 1.125rem;
    }
  }
</style>
