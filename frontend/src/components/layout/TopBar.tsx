import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  /**
   * L0 面包屑区：低饱和、轻量，告诉用户"在哪"
   * 例：← 历史 / ← 项目
   */
  breadcrumb?: ReactNode
  /**
   * L1 标题 + L2 状态区：页面主体识别
   * 例：标题 + 平台 Badge + 任务状态 Badge
   */
  title?: ReactNode
  /**
   * L3 操作区：页面级动作
   * 例：复制 / 导出 / 重新改写 / 新建
   */
  actions?: ReactNode
  /** 兼容旧用法：直接传入完整内容（不再推荐） */
  children?: ReactNode
  className?: string
}

/**
 * TopBar - 顶部状态栏
 *
 * 信息层级（Apple 风格五层阅读路径的上三层）：
 *   L0 breadcrumb  ←  知道在哪（轻、低饱和）
 *   L1 title       ←  知道是什么（semibold）
 *   L2 status      ←  知道当前状态（与 title 同段，徽章形式）
 *   L3 actions     ←  知道能做什么（按钮组）
 *
 * 几何：
 *   - 高度固定 56px (h-14)，位于 flex 列上方，不随 main 滚动
 *   - sticky top-0 在 AppShell 结构下冗余但保留，兼容 hideSidebar 场景
 *   - backdrop-blur + 半透明底 + 1px bottom border
 *
 * 真源: ui-reference/apple-style-components/ui_kits/website/index.html .globalnav
 */
export function TopBar({ breadcrumb, title, actions, children, className }: TopBarProps) {
  return (
    <header
      style={{ height: 'var(--topbar-h)' }}
      className={cn(
        'sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/80 px-8 backdrop-blur-xl',
        className,
      )}
    >
      {children ? (
        children
      ) : (
        <>
          {/* L0 面包屑 */}
          {breadcrumb && (
            <nav className="flex min-w-0 items-center gap-2 text-[var(--tier-breadcrumb)] text-muted-foreground">
              {breadcrumb}
            </nav>
          )}
          {/* L1 标题 + L2 状态 */}
          {title && (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">{title}</div>
          )}
          {/* L3 操作区 */}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </>
      )}
    </header>
  )
}
