<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'

  let {
    class: className,
    children,
    sideOffset = 6,
    ...restProps
  }: SelectPrimitive.ContentProps = $props()
</script>

<SelectPrimitive.Portal>
  <SelectPrimitive.Content
    {sideOffset}
    class={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-50 min-w-[var(--bits-select-anchor-width)] overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0f1520] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_4px_8px_rgba(0,0,0,0.3)]',
      className
    )}
    {...restProps}
  >
    <SelectPrimitive.Viewport class="flex flex-col">
      {@render children?.()}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
