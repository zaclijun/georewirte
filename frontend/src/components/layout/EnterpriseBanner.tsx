import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EnterpriseBanner - 项目首页 Banner 静态销售入口
 */
export function EnterpriseBanner({ className }: { className?: string }) {
  return (
    <Link
      to="/enterprise"
      className={cn(
        'group flex items-center justify-between gap-4 rounded-lg border border-border bg-gradient-to-r from-info/5 via-background to-primary/5 p-5 transition-all duration-200 ease-apple',
        'hover:border-primary/30 hover:shadow-soft-sm',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">
            升级为私有品牌知识库
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            团队协作 · 多品牌隔离 · 私有化部署 · SLA 保障
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        了解 Enterprise 方案
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  )
}
