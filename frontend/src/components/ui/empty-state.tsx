import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * EmptyState - 空状态居中卡片
 */
interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 px-6 text-center',
        className,
      )}
      {...props}
    >
      {icon && <div className="text-muted-foreground/60 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>}
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
