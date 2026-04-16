<script lang="ts">
  import { cn } from '$lib/utils'
  import { alertVariants, type Props } from './index.js'

  let { class: className, variant, children, ...restProps }: Props = $props()
</script>

<div role="alert" class={cn(alertVariants({ variant }), className)} {...restProps}>
  {@render children?.()}
</div>
