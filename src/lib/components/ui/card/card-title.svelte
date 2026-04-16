<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLHeadingElement> = $props()
</script>

<h3 class={cn('text-text-primary text-base font-semibold', className)} {...restProps}>
  {@render children?.()}
</h3>
