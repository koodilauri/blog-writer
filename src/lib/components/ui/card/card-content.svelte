<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div class={cn('', className)} {...restProps}>
  {@render children?.()}
</div>
