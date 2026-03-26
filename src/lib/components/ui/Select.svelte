<script lang="ts">
  import { Select } from 'bits-ui'

  let {
    value = $bindable(''),
    options,
    placeholder = 'Select…'
  }: {
    value: string
    options: string[]
    placeholder?: string
  } = $props()

  const display = $derived(value || placeholder)
</script>

<Select.Root type="single" bind:value>
  <Select.Trigger class="sel-trigger">
    <span class="sel-value" class:placeholder={!value}>{display}</span>
    <svg class="sel-chevron" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clip-rule="evenodd"
      />
    </svg>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content class="sel-content" sideOffset={6}>
      <Select.Viewport class="sel-viewport">
        {#each options as opt}
          <Select.Item value={opt} label={opt} class="sel-item">
            {#snippet children({ selected })}
              <span class="sel-item-check">{selected ? '✓' : ''}</span>
              {opt}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>

<style>
  :global(.sel-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #f1f5f9;
    font-family: 'Inter', ui-sans-serif, sans-serif;
    font-size: 0.9rem;
    padding: 0.7rem 0.875rem;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background 0.2s;
    text-align: left;
  }

  :global(.sel-trigger:hover) {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
  }

  :global(.sel-trigger[data-state='open']) {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(129, 140, 248, 0.06);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
  }

  :global(.sel-value) {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.sel-value.placeholder) {
    color: rgba(255, 255, 255, 0.2);
  }

  :global(.sel-chevron) {
    color: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  :global(.sel-trigger[data-state='open'] .sel-chevron) {
    transform: rotate(180deg);
  }

  :global(.sel-content) {
    background: #0f1520;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 0.375rem;
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.6),
      0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: 100;
    min-width: var(--bits-select-anchor-width);
    animation: selIn 0.12s ease;
  }

  :global(.sel-viewport) {
    display: flex;
    flex-direction: column;
  }

  @keyframes selIn {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  :global(.sel-item) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 6px;
    font-family: 'Inter', ui-sans-serif, sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    outline: none;
    transition:
      background 0.1s,
      color 0.1s;
    user-select: none;
  }

  :global(.sel-item:hover),
  :global(.sel-item[data-highlighted]) {
    background: rgba(129, 140, 248, 0.1);
    color: #f1f5f9;
  }

  :global(.sel-item[data-selected]) {
    color: #818cf8;
  }

  :global(.sel-item-check) {
    width: 12px;
    font-size: 0.7rem;
    color: #818cf8;
    flex-shrink: 0;
  }
</style>
