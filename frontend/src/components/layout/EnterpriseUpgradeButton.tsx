import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EnterpriseUpgradeButton - 品牌事实库页"升级为私有品牌知识库"按钮
 * 静态销售入口，不接后端
 */
export function EnterpriseUpgradeButton({ className }: { className?: string }) {
  return (
    <Link
      to="/enterprise"
      className={cn(
        'block rounded-lg border border-dashed border-info/30 bg-info/5 p-3 transition-all duration-200 ease-apple hover:border-info/50 hover:bg-info/10',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground">升级私有知识库</div>
        <ArrowUpRight className="h-3.5 w-3.5 text-info" />
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        多品牌隔离 · 团队协作 · 私有化部署
      </p>
    </Link>
  )
}
