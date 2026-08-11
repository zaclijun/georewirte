import type { ReviewStatus } from '@/types'
import { REVIEW_STATUS_META } from '@/common/constants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReviewStatusBadgeProps {
  status: ReviewStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * ReviewStatusBadge - 质量状态标签
 * ready/review/needs_material/exported
 * ready 绿、review 琥珀、needs_material 红、exported 靛蓝
 */
export function ReviewStatusBadge({ status, size = 'sm', className }: ReviewStatusBadgeProps) {
  const meta = REVIEW_STATUS_META[status]
  return (
    <Badge
      variant={meta.color}
      title={meta.description}
      className={cn(
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className,
      )}
    >
      {meta.label}
    </Badge>
  )
}
