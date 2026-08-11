import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: ReactNode
  /** 副标或趋势 */
  hint?: string
  /** 数值变化（正向上、负向下） */
  delta?: number
  icon?: ReactNode
  className?: string
}

/**
 * MetricCard - 统计卡片
 * 真源: ui-reference/apple-style-components/ui_kits/website/index.html .feature-stripe cell
 * label + 大数字 + 副标，不要 cta
 */
export function MetricCard({ label, value, hint, delta, icon, className }: MetricCardProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 px-5 py-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-eyebrow">{label}</span>
        {icon && <span className="text-muted-foreground/70 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight nums">{value}</span>
        {typeof delta === 'number' && delta !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              delta > 0 ? 'text-success' : 'text-destructive',
            )}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
