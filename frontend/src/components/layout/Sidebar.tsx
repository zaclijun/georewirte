import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  FolderOpen,
  History,
  Inbox,
  Layers,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Square,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountWidget } from './AccountWidget'
import { useProject, useProjects } from '@/hooks/useProjects'
import { useWorkspaceType } from '@/hooks/useWorkspaceType'
import { mockProjects } from '@/mock/data'
import { getLastActiveProjectId } from '@/lib/projectContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { WorkspaceFormDialog } from '@/components/projects'
import { getWorkspaceMeta } from '@/common/workspace'

interface SidebarProps {
  /** 当前工作区 id（用于子路由高亮），未选时为空 */
  projectId?: string
  className?: string
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface NavGroup {
  /** eyebrow 标题；首组为空避免顶部下沉 */
  label?: string
  items: NavItem[]
}

/**
 * Sidebar - 左侧主导航（双模式）
 *
 * 信息架构：
 *   - 无 projectId → Global Mode
 *       工作台     → 工作区
 *       全局       → 历史任务
 *       顶部卡片   → 「选择工作区」引导
 *
 *   - 有 projectId → Workspace Mode
 *       工作台     → 工作区
 *       当前工作区 → 工作区概览 / 动态知识库 / 素材库 / 生成内容资产
 *       全局       → 历史任务
 *       顶部卡片   → 当前工作区名 + 类型徽标 + 切换工作区
 *
 * 动态文案：
 *   - workspace_type 决定知识库名称（品牌 / 专业 / 账号 / 客户知识库）
 *   - 项目 → 工作区、新建改写 → 生成内容资产
 */
export function Sidebar({ projectId, className }: SidebarProps) {
  const { data: projectData, isError } = useProject(projectId)
  const project =
    projectData ?? (isError && projectId ? mockProjects.find((p) => p.id === projectId) : undefined)
  const { meta: wsMeta } = useWorkspaceType(projectId)

  const hasProject = !!projectId

  // Global Mode：未选工作区时只显示「工作区」+「历史任务」
  // Workspace Mode：显示工作区内完整导航（含素材库）
  const projectNavFallback = '/projects'
  const projectOverviewPath = hasProject ? `/projects/${projectId}` : projectNavFallback
  const factsPath = hasProject ? `/projects/${projectId}/facts` : projectNavFallback
  const inboxPath = hasProject ? `/projects/${projectId}/inbox` : projectNavFallback
  const rewritePath = hasProject ? `/projects/${projectId}/rewrite/new` : projectNavFallback

  const groups: NavGroup[] = hasProject
    ? [
        {
          // 首组无 eyebrow，避免顶部下沉
          items: [{ to: '/projects', label: '工作台', icon: Boxes, exact: true }],
        },
        {
          label: '当前工作区',
          items: [
            { to: projectOverviewPath, label: '工作区概览', icon: Layers, exact: true },
            { to: factsPath, label: wsMeta.knowledgeBaseName, icon: FolderOpen },
            { to: inboxPath, label: '素材库', icon: Inbox },
            { to: rewritePath, label: '内容优化', icon: PenLine },
          ],
        },
        {
          label: '全局',
          items: [{ to: '/history', label: '历史任务', icon: History }],
        },
      ]
    : [
        {
          items: [{ to: '/projects', label: '工作台', icon: Boxes, exact: true }],
        },
        {
          label: '全局',
          items: [{ to: '/history', label: '历史任务', icon: History }],
        },
      ]

  return (
    <aside
      className={cn(
        'flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5',
        className,
      )}
      aria-label="主导航"
    >
      {/* Brand */}
      <div className="mb-5 flex items-center gap-2 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">GEO 工作台</div>
          <div className="text-[10px] text-muted-foreground">Rewrite Workbench</div>
        </div>
      </div>

      {/* 当前工作区上下文卡片 */}
      <CurrentWorkspaceCard
        hasProject={hasProject}
        projectName={project?.name}
        workspaceTypeLabel={wsMeta.shortLabel}
      />

      {/* Nav groups */}
      <nav className="mt-2 flex flex-1 flex-col gap-3">
        {groups.map((group, gi) => (
          <section key={group.label ?? `g-${gi}`} className="flex flex-col gap-0.5">
            {group.label && (
              <div className="px-3 pb-1 pt-2 text-eyebrow">{group.label}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-full px-3 py-2 text-sm transition-colors duration-200 ease-apple',
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </section>
        ))}
      </nav>

      {/* AccountWidget：底部，账户中心入口（替代原 EnterpriseCard） */}
      <AccountWidget className="mt-4" />
    </aside>
  )
}

// ===== 当前工作区上下文卡片 =====
interface CurrentWorkspaceCardProps {
  hasProject: boolean
  projectName?: string
  workspaceTypeLabel: string
}

/**
 * 当前工作区上下文卡片
 *
 * - Workspace Mode：显示工作区类型徽标 + 工作区名 + 「切换工作区」按钮
 *   点击「切换工作区」打开 WorkspaceSwitcherDialog
 * - Global Mode：显示「选择工作区」+ 引导文案，点击进入 /projects
 */
function CurrentWorkspaceCard({
  hasProject,
  projectName,
  workspaceTypeLabel,
}: CurrentWorkspaceCardProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false)

  if (hasProject) {
    return (
      <>
        <div className="group mx-1 flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-eyebrow">当前工作区</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium tracking-tight">
              {projectName ?? '加载中…'}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {workspaceTypeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="mt-1.5 inline-flex items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeftRight className="h-3 w-3" />
            切换工作区
          </button>
        </div>
        <WorkspaceSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
      </>
    )
  }

  return (
    <NavLink
      to="/projects"
      className="group mx-1 flex flex-col gap-1 rounded-lg border border-dashed border-border bg-card/50 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-card"
      title="选择一个工作区"
    >
      <div className="flex items-center gap-1.5">
        <Square className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-eyebrow">选择工作区</span>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">
        进入一个工作区后，可维护知识库、导入素材并优化内容。
      </div>
    </NavLink>
  )
}

// ===== Workspace Switcher Dialog =====
interface WorkspaceSwitcherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * WorkspaceSwitcherDialog - 切换工作区弹窗
 *
 * - 搜索框：按名称 / brand_name 模糊匹配
 * - 最近使用：最多 3 个（基于 localStorage lastActiveProjectId + 已加载列表前几个）
 * - 全部：当前 useProjects 返回的全部
 * - 创建工作区：打开 WorkspaceFormDialog
 *
 * 选择工作区后跳转 /projects/:id 并关闭弹窗
 */
function WorkspaceSwitcherDialog({ open, onOpenChange }: WorkspaceSwitcherDialogProps) {
  const navigate = useNavigate()
  const { data, isError } = useProjects()
  const projects = data ?? (isError ? mockProjects : [])
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const lastId = getLastActiveProjectId()

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return projects
    return projects.filter((p) => {
      return (
        p.name.toLowerCase().includes(kw) ||
        (p.brand_name ?? '').toLowerCase().includes(kw) ||
        (p.description ?? '').toLowerCase().includes(kw)
      )
    })
  }, [projects, keyword])

  const recent = useMemo(() => {
    if (!lastId) return projects.slice(0, 3)
    const last = projects.find((p) => p.id === lastId)
    if (!last) return projects.slice(0, 3)
    return [last, ...projects.filter((p) => p.id !== lastId).slice(0, 2)]
  }, [projects, lastId])

  const handlePick = (id: string) => {
    onOpenChange(false)
    navigate(`/projects/${id}`)
  }

  const handleOpenCreate = () => {
    onOpenChange(false)
    setCreateOpen(true)
  }

  const renderRow = (p: (typeof projects)[number]) => {
    const meta = getWorkspaceMeta(
      // 优先使用后端 project.workspace_type，localStorage 作为兼容 fallback
      p.workspace_type ??
      (() => {
        try {
          const v = localStorage.getItem(`workspace_type:${p.id}`)
          if (v === 'brand' || v === 'professional' || v === 'media' || v === 'agency') return v
          return null
        } catch {
          return null
        }
      })(),
    )
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => handlePick(p.id)}
        className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground [&>svg]:h-4 [&>svg]:w-4">
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium tracking-tight">{p.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {p.brand_name ?? meta.shortLabel}
          </div>
        </div>
        <Badge variant="muted" className="shrink-0 text-[10px]">
          {meta.shortLabel}
        </Badge>
      </button>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent side="center" className="flex max-w-lg flex-col gap-4">
          <DialogHeader>
            <DialogTitle>切换工作区</DialogTitle>
            <DialogDescription>选择一个工作区进入，或新建一个工作区。</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索工作区名称 / 品牌 / 账号 / 客户名"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {!keyword && recent.length > 0 && (
              <section>
                <div className="mb-1.5 px-1 text-eyebrow">最近使用</div>
                <div className="flex flex-col gap-0.5">{recent.map(renderRow)}</div>
              </section>
            )}

            <section>
              <div className="mb-1.5 px-1 text-eyebrow">
                {keyword ? `搜索结果（${filtered.length}）` : '全部'}
              </div>
              {filtered.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-secondary/30 px-3 py-6 text-center text-xs text-muted-foreground">
                  {keyword ? '未找到匹配的工作区' : '暂无工作区'}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">{filtered.map(renderRow)}</div>
              )}
            </section>
          </div>

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              创建工作区
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkspaceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
