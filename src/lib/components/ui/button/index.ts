import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonRootProps } from 'bits-ui'
import Root from './button.svelte'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[#6366f1] text-white shadow-sm hover:bg-[#5558e8] active:bg-[#4f52e0]',
        destructive:
          'bg-[rgba(239,68,68,0.12)] text-[#f87171] border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.2)]',
        outline:
          'border border-[rgba(255,255,255,0.12)] bg-transparent text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white',
        secondary:
          'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.09)] hover:text-white',
        ghost: 'text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white',
        link: 'text-[#818cf8] underline-offset-4 hover:underline',
        // Custom variants
        approve:
          'bg-[rgba(34,197,94,0.10)] text-[#4ade80] border border-[rgba(34,197,94,0.25)] hover:bg-[rgba(34,197,94,0.18)] hover:text-[#86efac]',
        'ghost-brand':
          'border border-[rgba(99,102,241,0.35)] text-[#a5b4fc] bg-transparent hover:bg-[rgba(99,102,241,0.12)] hover:border-[rgba(99,102,241,0.55)]',
        warning:
          'bg-[rgba(245,158,11,0.12)] text-[#d97706] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.2)] hover:text-[#f59e0b]'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs rounded-[8px]',
        lg: 'h-11 px-6 text-base rounded-[10px]',
        icon: 'h-8 w-8 rounded-[8px]'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

type Props = ButtonRootProps & VariantProps<typeof buttonVariants> & { class?: string }

export { Root, Root as Button, buttonVariants, type Props }
