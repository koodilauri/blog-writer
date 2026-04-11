import { type VariantProps, cva } from 'class-variance-authority'
import Root from './badge.svelte'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#6366f1] text-white',
        secondary: 'border-[rgba(79,70,229,0.25)] bg-[rgba(79,70,229,0.12)] text-[#818cf8]',
        destructive: 'border-transparent bg-[rgba(239,68,68,0.12)] text-[#f87171]',
        outline: 'border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.7)]',
        success: 'border-transparent bg-[rgba(34,197,94,0.12)] text-[#4ade80]',
        warning: 'border-transparent bg-[rgba(245,158,11,0.12)] text-[#d97706]'
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
