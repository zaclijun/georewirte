import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EnterpriseCard - Sidebar 底部静态销售入口（弱化版）
 *
 * 设计原则：不抢主流程注意力，仅作为侧栏底部的可选入口。
 * - 边框低饱和、无强阴影
 * - 文案克制，不使用营销话术
 * - 只保留 "了解方案" 行动入口
 *
 * 不接后端，不做 CRM，仅展示销售引导。
 */
export function EnterpriseCard({ className }: { className?: string }) {
  return (
    <Link
      to="/enterprise"
      className={cn(
        'block rounded-md border border-sidebar-border/60 bg-background/50 px-3 py-2.5 text-muted-foreground transition-colors',
        'hover:border-border hover:bg-background hover:text-foreground',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-tight">Enterprise</span>
        <ArrowUpRight className="h-3 w-3 opacity-60" />
      </div>
      <p className="mt-1 text-[10px] leading-snug opacity-80">
        团队协作 · 私有部署 · SLA
      </p>
    </Link>
  )
}
