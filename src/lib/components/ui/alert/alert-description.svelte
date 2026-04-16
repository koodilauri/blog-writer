<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLParagraphElement> = $props()
</script>

<p class={cn('text-sm [&_p]:leading-relaxed', className)} {...restProps}>
  {@render children?.()}
</p>
