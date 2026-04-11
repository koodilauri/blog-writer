<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'

  type Props = {
    outline: string
    running: boolean
    onresume: () => void
  }
  let { outline = $bindable(), running, onresume }: Props = $props()
</script>

<section class="card-surface">
  <div class="mb-5">
    <h2
      class="font-display m-0 mb-0.5 text-[0.95rem] font-semibold tracking-[-0.02em] text-[#f8fafc]"
    >
      Review Outline
    </h2>
    <p class="m-0 text-[0.82rem] text-white/30">Edit below, then continue to start writing.</p>
  </div>
  <Textarea bind:value={outline} class="min-h-48" style="field-sizing: content" />
  <Button onclick={onresume} disabled={running} class="mt-3 w-full gap-2">
    {#if running}<span class="spin-sm"></span> Resuming…{:else}Continue with this outline{/if}
  </Button>
</section>
