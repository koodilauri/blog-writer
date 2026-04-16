<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    class: className,
    orientation = 'horizontal',
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' } = $props()
</script>

<div
  role="separator"
  class={cn(
    'bg-surface-border shrink-0',
    orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    className
  )}
  {...restProps}
></div>
