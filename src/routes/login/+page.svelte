<script lang="ts">
  import { goto } from '$app/navigation'
  import { setAuth } from '$lib/auth'
  import { onMount } from 'svelte'
  import { LoginResponseSchema } from '$lib/schemas/login'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

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
      const data = LoginResponseSchema.parse(await res.json())
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

<div
  class="bg-surface-base relative box-border flex min-h-screen items-center justify-center overflow-hidden p-8"
>
  <!-- Slow drifting orbs -->
  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>
  </div>

  <!-- Dot grid, fades toward edges -->
  <div class="bg-dots" aria-hidden="true"></div>

  <main
    class="relative z-10 w-full max-w-[360px] transition-[opacity,transform] duration-600 ease-out"
    class:opacity-0={!visible}
    class:translate-y-4={!visible}
    class:opacity-100={visible}
    class:translate-y-0={visible}
  >
    <div
      class="mb-9 flex items-center gap-[0.6rem] text-base font-semibold tracking-[-0.01em] text-white/80"
    >
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

    <h1 class="text-text-primary m-0 mb-1.5 text-[2rem] leading-[1.1] font-bold tracking-[-0.04em]">
      Login or try the demo
    </h1>
    <p class="mt-0 mb-8 text-[0.9rem] text-white/30">Sign in to continue writing.</p>

    <form class="flex flex-col gap-4" onsubmit={onSubmit}>
      <div class="flex flex-col gap-[0.4rem]">
        <label for="email" class="text-[0.8rem] font-medium tracking-[0.01em] text-white/45">
          Email
        </label>
        <Input
          id="email"
          bind:value={email}
          type="email"
          placeholder="you@company.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="flex flex-col gap-[0.4rem]">
        <div class="flex items-center justify-between">
          <label for="password" class="text-[0.8rem] font-medium tracking-[0.01em] text-white/45">
            Password
          </label>
        </div>
        <Input
          id="password"
          bind:value={password}
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
        />
      </div>

      {#if error}
        <div
          class="border-error/18 bg-error/8 flex items-center gap-2 rounded-lg border px-3 py-[0.55rem] text-[0.8rem] text-[#fca5a5]"
          role="alert"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class="shrink-0">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"
            />
          </svg>
          {error}
        </div>
      {/if}

      <Button type="submit" disabled={loading} class="mt-1 h-11 w-full text-[0.9rem]">
        {#if loading}
          <span
            class="border-brand-400/25 border-t-brand-400 inline-block size-3.5 shrink-0 animate-[layoutSpin_0.75s_linear_infinite] rounded-full border-2"
          ></span>
          Signing in…
        {:else}
          Sign in
        {/if}
      </Button>
    </form>

    <div
      class="my-3 flex items-center gap-3 before:h-px before:flex-1 before:bg-white/7 after:h-px after:flex-1 after:bg-white/7"
    >
      <span class="text-[0.75rem] text-white/20">or</span>
    </div>

    <Button
      variant="outline"
      class="demo-btn h-[2.8rem] w-full"
      onclick={() => void goto('/generate?demo')}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 10a8 8 0 1116 0A8 8 0 012 10zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"
          clip-rule="evenodd"
        />
      </svg>
      Try the demo
    </Button>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
  }

  /* Orbs — complex radial-gradient + filter:blur animations, cannot be Tailwind */
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

  /* Dot grid — uses mask-image which has no Tailwind equivalent */
  .bg-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
    pointer-events: none;
  }
</style>
