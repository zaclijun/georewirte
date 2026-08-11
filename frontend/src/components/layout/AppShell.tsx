import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'
import { useCurrentProjectId } from '@/lib/projectContext'

type WorkspaceVariant = 'standard' | 'wide' | 'full'

interface AppShellProps {
  /** 当前项目 id（用于侧栏子路由） */
  projectId?: string
  /** 顶部状态栏内容 */
  topBar?: ReactNode
  /** 主体内容 */
  children: ReactNode
  /**
   * Workspace 内容区变体：
   * - standard  标准内容区（max-width 1200px，默认）
   * - wide      宽幅内容区（max-width 1600px，History 等数据密度页）
   * - full      撑满（Brand Facts 双栏布局等）
   * - bare      不套 Workspace 容器（自定义全屏场景，如加载/失败态）
   */
  variant?: WorkspaceVariant | 'bare'
  /** 主体额外类名（仅 bare 模式生效） */
  mainClassName?: string
  /** 是否隐藏侧栏（结果页等满屏场景） */
  hideSidebar?: boolean
}

/**
 * AppShell - 全局应用外壳
 *
 * 三段式：Sidebar（左） + TopBar（上） + 主内容区
 *
 * Workspace 节奏由本组件统一承载：
 * - TopBar 固定 56px，位于 flex 列上方，不随内容滚动
 * - 主内容区 main 单独 overflow-y-auto
 * - 内层 Workspace 容器统一 pt/pb/px/max-width（标准 / 宽幅 / 撑满）
 * - 各页面不再自行决定 max-w / px / py
 *
 * Project Workspace 上下文：
 *   - 在此统一调用 useCurrentProjectId，确保 URL 含 projectId 时自动同步到
 *     localStorage（lastActiveProjectId），供 LandingRedirect/Sidebar 引导使用。
 *
 * 真源: ui-reference/apple-style-components/ui_kits/website/index.html .section + .container
 */
export function AppShell({
  projectId,
  topBar,
  children,
  variant = 'standard',
  mainClassName,
  hideSidebar = false,
}: AppShellProps) {
  // 统一同步 URL projectId → localStorage（仅副作用）
  useCurrentProjectId()

  const workspaceClass =
    variant === 'standard'
      ? 'workspace'
      : variant === 'wide'
        ? 'workspace--wide'
        : variant === 'full'
          ? 'workspace--full'
          : ''

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {!hideSidebar && <Sidebar projectId={projectId} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        <main className="flex-1 overflow-y-auto">
          {variant === 'bare' ? (
            <div className={cn('h-full', mainClassName)}>{children}</div>
          ) : (
            <div className={workspaceClass}>{children}</div>
          )}
        </main>
      </div>
    </div>
  )
}
