<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'

  let { class: className, children, label, ...restProps }: SelectPrimitive.ItemProps = $props()
</script>

<SelectPrimitive.Item
  class={cn(
    'data-selected:text-brand-400 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[rgba(255,255,255,0.7)] transition-colors duration-100 outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-[rgba(129,140,248,0.1)] data-highlighted:text-[--color-text-primary]',
    className
  )}
  {label}
  {...restProps}
>
  {#snippet children({ selected })}
    <span class="text-brand-400 w-3 shrink-0 text-[0.7rem]">{selected ? '✓' : ''}</span>
    {label}
  {/snippet}
</SelectPrimitive.Item>
