import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface ScoreCompareCardProps {
  before: number
  after: number
  /** 紧凑模式：用于 TopBar，单行展示 */
  compact?: boolean
  className?: string
}

/**
 * ScoreCompareCard - 改写前后评分对比
 * 真源: ui-reference/apple-style-components/preview/component-comparison-table.html
 * 复用 grid 结构 + cell 类型语义（label/value/muted）
 */
export function ScoreCompareCard({
  before,
  after,
  compact = false,
  className,
}: ScoreCompareCardProps) {
  const delta = after - before
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaColor =
    delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1 text-sm nums',
          className,
        )}
      >
        <span className="text-muted-foreground">改前</span>
        <span className="font-medium text-foreground">{before}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">改后</span>
        <span className="font-semibold text-primary">{after}</span>
        <span className={cn('flex items-center gap-0.5 font-semibold', deltaColor)}>
          <DeltaIcon className="h-3.5 w-3.5" />
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
    )
  }

  return (
    <Card className={cn('p-5', className)}>
      <div className="text-eyebrow mb-3">改写评分对比</div>
      <div className="grid grid-cols-3 items-end gap-4">
        <div>
          <div className="text-xs text-muted-foreground">改前</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-muted-foreground nums">
            {before}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className={cn('mt-1 flex items-center gap-1 text-sm font-semibold', deltaColor)}>
            <DeltaIcon className="h-4 w-4" />
            {delta > 0 ? `+${delta}` : delta}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">改后</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-primary nums">{after}</div>
        </div>
      </div>
    </Card>
  )
}
