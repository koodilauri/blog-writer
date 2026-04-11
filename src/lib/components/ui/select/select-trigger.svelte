<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'

  let { class: className, children, ...restProps }: SelectPrimitive.TriggerProps = $props()
</script>

<SelectPrimitive.Trigger
  class={cn(
    'flex w-full items-center justify-between gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3.5 py-[0.7rem] text-sm text-[--color-text-primary] transition-all duration-200 outline-none hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-[rgba(129,140,248,0.5)] data-[state=open]:bg-[rgba(129,140,248,0.06)] data-[state=open]:shadow-[0_0_0_3px_rgba(129,140,248,0.08)] [&>span]:truncate',
    className
  )}
  {...restProps}
>
  {@render children?.()}
  <svg
    class="size-3 shrink-0 text-[rgba(255,255,255,0.3)] transition-transform duration-200 data-[state=open]:rotate-180"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fill-rule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clip-rule="evenodd"
    />
  </svg>
</SelectPrimitive.Trigger>
