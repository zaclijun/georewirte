import { Loader2, AlertCircle, CheckCircle2, PauseCircle } from 'lucide-react'
import type { TaskStatus } from '@/types'
import { TASK_STATUS_META } from '@/common/constants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RewriteStatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
  withIcon?: boolean
  className?: string
}

/**
 * RewriteStatusBadge - 任务状态标签
 * pending/running/completed/failed
 */
export function RewriteStatusBadge({
  status,
  size = 'sm',
  withIcon = true,
  className,
}: RewriteStatusBadgeProps) {
  const meta = TASK_STATUS_META[status]
  const Icon =
    status === 'running'
      ? Loader2
      : status === 'completed'
        ? CheckCircle2
        : status === 'failed'
          ? AlertCircle
          : PauseCircle

  return (
    <Badge
      variant={meta.color}
      className={cn(
        // 固定最小宽度，避免不同状态文案长度差异导致列宽抖动
        'inline-flex min-w-[72px] items-center justify-center',
        size === 'md' && 'px-2.5 py-1 text-xs',
        status === 'running' && '[&_svg]:animate-spin',
        className,
      )}
    >
      {withIcon && <Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />}
      {meta.label}
    </Badge>
  )
}
