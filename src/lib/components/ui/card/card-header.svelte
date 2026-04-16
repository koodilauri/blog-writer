<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div class={cn('flex flex-col gap-1.5 pb-4', className)} {...restProps}>
  {@render children?.()}
</div>
