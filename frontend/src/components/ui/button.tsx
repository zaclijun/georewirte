import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button - Apple 风格胶囊按钮
 * 真源: ui-reference/apple-style-components/preview/component-button.html
 * 三档变体 × 三档尺寸，全部胶囊形（rounded-full）
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-all duration-200 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // 主行动色 - Apple System Blue #007aff
        primary: 'bg-primary text-primary-foreground shadow-soft-sm hover:brightness-[0.96]',
        // 次级表面 - 浅灰底
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
        // 描边
        outline:
          'border border-border bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground',
        // 文字按钮
        ghost: 'text-foreground hover:bg-secondary hover:text-secondary-foreground',
        // 危险
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft-sm hover:brightness-[0.96]',
        // 文字链接 + trailing ›
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-6 text-sm',
        xl: 'h-14 px-7 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
