<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'

  let { class: className, children, ...restProps }: DialogPrimitive.TitleProps = $props()
</script>

<DialogPrimitive.Title
  class={cn('text-lg font-semibold text-[--color-text-primary]', className)}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Title>
