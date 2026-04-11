<script lang="ts">
  import { cn } from '$lib/utils'
  import { badgeVariants, type Props } from './index.js'

  let { class: className, variant, children, ...restProps }: Props = $props()
</script>

<span class={cn(badgeVariants({ variant }), className)} {...restProps}>
  {@render children?.()}
</span>
