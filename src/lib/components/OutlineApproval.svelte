<script lang="ts">
  type Props = {
    outline: string
    running: boolean
    onresume: () => void
  }
  let { outline = $bindable(), running, onresume }: Props = $props()
</script>

<section class="card">
  <div class="card-head">
    <h2>Review Outline</h2>
    <p>Edit below, then continue to start writing.</p>
  </div>
  <div class="field">
    <textarea bind:value={outline} class="outline-textarea"></textarea>
  </div>
  <button class="action-btn" onclick={onresume} disabled={running}>
    {#if running}<span class="spin"></span> Resuming…{:else}Continue with this outline{/if}
  </button>
</section>

<style>
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 1.5rem;
  }
  .card-head {
    margin-bottom: 1.25rem;
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
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .outline-textarea {
    field-sizing: content;
    min-height: 12rem;
  }
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
    min-height: 80px;
  }
  textarea:focus {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(129, 140, 248, 0.06);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
  }
  .action-btn {
    background: #4f46e5;
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.7rem 1.25rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition:
      background 0.2s,
      transform 0.15s;
    margin-top: 0.75rem;
  }
  .action-btn:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
  }
  .action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .spin {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
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
