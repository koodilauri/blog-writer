<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    class: className,
    value = $bindable(''),
    ref = $bindable(null),
    ...restProps
  }: {
    class?: string
    value?: string
    ref?: HTMLTextAreaElement | null
    [key: string]: unknown
  } = $props()
</script>

<textarea bind:this={ref} bind:value class={cn('input-dark', className)} {...restProps}></textarea>
