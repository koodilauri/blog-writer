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

<textarea
  bind:this={ref}
  bind:value
  class={cn(
    'resize-vertical text-text-primary focus:border-brand-400/50 focus:bg-brand-400/6 box-border w-full rounded-[10px] border border-white/8 bg-white/4 px-3.5 py-[0.7rem] font-sans text-[0.9rem] transition-[border-color,box-shadow,background] duration-200 outline-none placeholder:text-white/20 focus:shadow-[0_0_0_3px_rgba(129,140,248,0.08)]',
    className
  )}
  {...restProps}
></textarea>
