import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input - Apple 风格圆角输入框
 * 真源: ui-reference/apple-style-components/preview/component-input.html
 * 1px border + lg radius + ring focus
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm transition-colors duration-200 ease-apple',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
