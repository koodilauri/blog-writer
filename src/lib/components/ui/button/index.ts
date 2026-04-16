import { type VariantProps, cva } from 'class-variance-authority'
import type { ButtonRootProps } from 'bits-ui'
import Root from './button.svelte'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-500 text-white shadow-sm hover:bg-brand-500/90 active:bg-brand-600',
        destructive: 'border border-error/25 bg-error/12 text-error hover:bg-error/20',
        outline:
          'border border-white/12 bg-transparent text-white/70 hover:border-white/22 hover:bg-white/5 hover:text-white',
        secondary: 'bg-white/5 text-white/70 hover:bg-white/9 hover:text-white',
        ghost: 'text-white/55 hover:bg-white/7 hover:text-white',
        link: 'text-brand-400 underline-offset-4 hover:underline',
        // Custom variants
        approve:
          'border border-success/25 bg-success/10 text-[#4ade80] hover:bg-success/18 hover:text-[#86efac]',
        'ghost-brand':
          'border border-brand-500/35 bg-transparent text-[#a5b4fc] hover:bg-brand-500/12 hover:border-brand-500/55',
        warning:
          'border border-warning/25 bg-warning/12 text-[#d97706] hover:bg-warning/20 hover:text-warning'
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
