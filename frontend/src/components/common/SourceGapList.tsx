import { AlertCircle } from 'lucide-react'
import type { RewriteOutput } from '@/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SourceGapListProps {
  missingSources: RewriteOutput['missing_sources']
  className?: string
}

/**
 * SourceGapList - 待补充来源清单
 */
export function SourceGapList({ missingSources, className }: SourceGapListProps) {
  if (!missingSources?.length) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-eyebrow mb-2">待补充来源</div>
        <div className="py-2 text-sm text-muted-foreground">暂无待补充来源</div>
      </Card>
    )
  }
  return (
    <Card id="source-gap" className={cn('scroll-mt-20 p-4', className)}>
      <div className="text-eyebrow mb-3">待补充来源</div>
      <ul className="space-y-2.5">
        {missingSources.map((src, idx) => (
          <li key={idx} className="flex gap-2 text-sm">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span className="leading-relaxed text-foreground/90">{src}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
