import { type VariantProps, cva } from 'class-variance-authority'
import Root from './alert.svelte'
import Title from './alert-title.svelte'
import Description from './alert-description.svelte'
import type { HTMLAttributes } from 'svelte/elements'

const alertVariants = cva(
  'relative flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-white/[0.08] bg-white/[0.04] text-text-primary',
        destructive: 'border-error/25 bg-error/[0.08] text-error',
        warning: 'border-warning/25 bg-warning/[0.08] text-warning',
        success: 'border-success/25 bg-success/[0.08] text-success',
        info: 'border-brand-400/25 bg-brand-400/[0.08] text-brand-400'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: VariantProps<typeof alertVariants>['variant']
}

export {
  Root,
  Root as Alert,
  Title as AlertTitle,
  Description as AlertDescription,
  alertVariants,
  type Props
}
