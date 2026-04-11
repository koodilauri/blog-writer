<script lang="ts">
  import { Button as ButtonPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'
  import { buttonVariants, type Props } from './index.js'

  let {
    class: className,
    variant,
    size,
    ref = $bindable(null as HTMLElement | null),
    children,
    ...restProps
  }: Props = $props()
</script>

<ButtonPrimitive.Root
  bind:ref
  class={cn(buttonVariants({ variant, size }), className)}
  {...restProps}
>
  {@render children?.()}
</ButtonPrimitive.Root>
