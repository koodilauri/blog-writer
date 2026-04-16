<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div
  class={cn('rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6', className)}
  {...restProps}
>
  {@render children?.()}
</div>
