<script lang="ts">
  import { goto } from '$app/navigation'
  import { setAuth } from '$lib/auth'
  import { onMount } from 'svelte'

  let email = ''
  let password = ''
  let error: string | null = null
  let loading = false
  let visible = false

  onMount(() =>
    setTimeout(() => {
      visible = true
    }, 60)
  )

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = null
    loading = true
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = (await res.json()) as { user?: { email?: string }; error?: string }
      if (!res.ok) {
        error = data.error ?? 'Login failed'
        return
      }
      setAuth(data.user?.email ?? email)
      await goto('/')
    } catch {
      error = 'Network error'
    } finally {
      loading = false
    }
  }
</script>

<div class="root">
  <!-- Slow drifting orbs -->
  <div class="bg" aria-hidden="true">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>
  </div>

  <!-- Dot grid, fades toward edges -->
  <div class="bg-dots" aria-hidden="true"></div>

  <main class:visible>
    <div class="logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="white" fill-opacity="0.08" />
        <path
          d="M19 9.5L17.5 11M17.5 11L10.25 18.25a3 3 0 01-1.265.753L6 20l.533-1.79a3 3 0 01.753-1.264L14.5 9.5M17.5 11L14.5 9.5M19 9.5a1.25 1.25 0 00-1.768-1.768L16 9l2 2 1-1.5z"
          stroke="white"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>BlogWriter</span>
    </div>

    <h1>Welcome back.</h1>
    <p class="sub">Sign in to continue writing.</p>

    <form onsubmit={onSubmit}>
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          bind:value={email}
          type="email"
          placeholder="you@company.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="field">
        <div class="label-row">
          <label for="password">Password</label>
        </div>
        <input
          id="password"
          bind:value={password}
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
        />
      </div>

      {#if error}
        <div class="error-msg" role="alert">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"
            />
          </svg>
          {error}
        </div>
      {/if}

      <button type="submit" disabled={loading}>
        {#if loading}
          <span class="spin"></span>
          Signing in…
        {:else}
          Sign in
        {/if}
      </button>
    </form>

    <div class="demo-divider">
      <span>or</span>
    </div>

    <button type="button" class="demo-btn" onclick={() => goto('/generate?demo')}>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 10a8 8 0 1116 0A8 8 0 012 10zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"
          clip-rule="evenodd"
        />
      </svg>
      Try the demo
    </button>
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :global(body) {
    margin: 0;
  }

  .root {
    min-height: 100vh;
    background: #080c14;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', ui-sans-serif, sans-serif;
    position: relative;
    overflow: hidden;
    padding: 2rem;
    box-sizing: border-box;
  }

  /* Orbs */
  .bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
  }

  .orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(59, 77, 232, 0.22) 0%, transparent 70%);
    top: -200px;
    left: -150px;
    animation: drift1 28s ease-in-out infinite;
  }

  .orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, transparent 70%);
    top: 10%;
    right: -120px;
    animation: drift2 34s ease-in-out infinite;
  }

  .orb-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%);
    bottom: -100px;
    left: 25%;
    animation: drift3 24s ease-in-out infinite;
  }

  .orb-4 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
    bottom: 20%;
    right: 10%;
    animation: drift1 40s ease-in-out infinite reverse;
    animation-delay: -12s;
  }

  @keyframes drift1 {
    0%,
    100% {
      transform: translate(0, 0);
    }
    30% {
      transform: translate(50px, 30px);
    }
    60% {
      transform: translate(20px, 60px);
    }
  }

  @keyframes drift2 {
    0%,
    100% {
      transform: translate(0, 0);
    }
    40% {
      transform: translate(-40px, 50px);
    }
    70% {
      transform: translate(-60px, 20px);
    }
  }

  @keyframes drift3 {
    0%,
    100% {
      transform: translate(0, 0);
    }
    50% {
      transform: translate(30px, -40px);
    }
  }

  /* Dot grid */
  .bg-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
    pointer-events: none;
  }

  /* Content */
  main {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 360px;
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  main.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 2.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: -0.01em;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.04em;
    margin: 0 0 0.4rem;
    line-height: 1.1;
  }

  .sub {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0 0 2rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  label {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.01em;
  }

  input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #f1f5f9;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    padding: 0.7rem 0.875rem;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.12);
  }

  input:focus {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(129, 140, 248, 0.06);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
  }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.18);
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
  }

  button[type='submit'] {
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

  button[type='submit']:hover {
    background: #4338ca;
    box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
    transform: translateY(-1px);
  }

  button[type='submit']:active {
    transform: translateY(0);
  }
  button[type='submit']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .demo-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }
  .demo-divider::before,
  .demo-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
  .demo-divider span {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.2);
  }

  .demo-btn {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition:
      border-color 0.2s,
      color 0.2s,
      background 0.2s;
  }
  .demo-btn:hover {
    border-color: rgba(129, 140, 248, 0.4);
    color: rgba(255, 255, 255, 0.85);
    background: rgba(99, 102, 241, 0.06);
  }

  .spin {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
