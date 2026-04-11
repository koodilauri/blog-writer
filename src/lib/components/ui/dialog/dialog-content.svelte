<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import { cn } from '$lib/utils'
  import Overlay from './dialog-overlay.svelte'

  let { class: className, children, ...restProps }: DialogPrimitive.ContentProps = $props()
</script>

<DialogPrimitive.Portal>
  <Overlay />
  <DialogPrimitive.Content
    class={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0f1520] p-6 shadow-2xl outline-none',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
