import { type VariantProps, cva } from 'class-variance-authority'
import Root from './badge.svelte'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-500 text-white',
        secondary: 'border-brand-600/25 bg-brand-600/12 text-brand-400',
        destructive: 'border-transparent bg-error/12 text-error',
        outline: 'border-white/15 text-white/70',
        success: 'border-transparent bg-success/12 text-[#4ade80]',
        warning: 'border-transparent bg-warning/12 text-[#d97706]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

import type { HTMLAttributes } from 'svelte/elements'
type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: VariantProps<typeof badgeVariants>['variant']
}

export { Root, Root as Badge, badgeVariants, type Props }
