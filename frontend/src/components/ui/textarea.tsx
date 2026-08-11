import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Textarea - 多行输入，沿用 Input 的视觉风格
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm transition-colors duration-200 ease-apple',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
