<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLHeadingElement> = $props()
</script>

<h5 class={cn('mb-1 leading-none font-semibold tracking-tight', className)} {...restProps}>
  {@render children?.()}
</h5>
