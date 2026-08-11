import type { RewriteOutput } from '@/types'
import { PRIORITY_META } from '@/common/constants'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StrategyListProps {
  strategies: RewriteOutput['optimization_strategy']
  className?: string
}

/**
 * StrategyList - 优化策略清单
 * 每项：priority badge + issue + action + evidence
 */
export function StrategyList({ strategies, className }: StrategyListProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="text-eyebrow mb-3">优化策略</div>
      {!strategies?.length ? (
        <div className="py-2 text-sm text-muted-foreground">暂无优化建议</div>
      ) : (
        <ul className="space-y-3">
          {strategies.map((s, idx) => {
            const meta = PRIORITY_META[s.priority]
            return (
              <li key={idx} className="rounded-lg bg-secondary/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{s.issue}</div>
                  <Badge variant={meta.color} className="shrink-0">
                    {meta.label}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.action}</p>
                {s.evidence && (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    <span className="text-eyebrow mr-1">证据</span>
                    {s.evidence}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
