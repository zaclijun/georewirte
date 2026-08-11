import { useMemo, useState } from 'react'
import { Plus, Boxes, Search, X } from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ProjectCard, WorkspaceFormDialog } from '@/components/projects'
import { useProjects } from '@/hooks/useProjects'
import { mockProjects } from '@/mock/data'
import type { Project } from '@/types'
import type { WorkspaceType } from '@/common/workspace'
import { cn } from '@/lib/utils'

/** 工作区类型筛选选项 */
const FILTER_OPTIONS: { value: 'all' | WorkspaceType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'brand', label: '品牌' },
  { value: 'professional', label: '专业服务' },
  { value: 'media', label: '自媒体' },
  { value: 'agency', label: '服务商' },
]

/**
 * ProjectListPage - 工作台（Workspace Launcher）
 *
 * 定位：选择已有工作区 / 创建新工作区
 *
 * 与旧 Dashboard 的差异：
 *   - 移除 KPI 卡片
 *   - 移除 Enterprise 大横幅
 *   - 移除蓝色错误式「请选择工作区」提示
 *   - 移除「当前工作区」分组（无当前工作区概念）
 *   - 新增按类型筛选（全部 / 品牌 / 专业 / 自媒体 / 服务商）
 *   - 新增按名称 / brand_name / 描述搜索
 *
 * 路由：/projects
 */
export function ProjectListPage() {
  const { data, isLoading, isError } = useProjects()
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<'all' | WorkspaceType>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  // API 失败时 fallback 到 mock，保证 P0 演示可用
  const projects: Project[] = data ?? (isError ? mockProjects : [])

  // 读取每个工作区的 workspace_type（localStorage）
  const workspaceTypeOf = (id: string): WorkspaceType | null => {
    try {
      const v = localStorage.getItem(`workspace_type:${id}`)
      if (v === 'brand' || v === 'professional' || v === 'media' || v === 'agency') return v
      return null
    } catch {
      return null
    }
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return projects.filter((p) => {
      // 类型筛选
      if (filter !== 'all') {
        const t = workspaceTypeOf(p.id)
        if (t !== filter) return false
      }
      // 关键词搜索
      if (kw) {
        const haystack = `${p.name} ${p.brand_name ?? ''} ${p.description ?? ''}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, keyword, filter])

  const openCreate = () => setDialogOpen(true)

  return (
    <AppShell
      topBar={
        <TopBar
          title={<h1 className="text-[var(--tier-title)] font-semibold tracking-tight">工作台</h1>}
          actions={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              创建工作区
            </Button>
          }
        />
      }
    >
      <div className="workspace-stack">
        {/* 离线警告：API 失败时醒目提示 */}
        {isError && (
          <div className="rounded border border-warning bg-warning/10 px-4 py-2 text-sm text-warning">
            ⚠️ 后端 API 连接失败，当前显示离线 mock 数据。请检查后端服务是否已启动。
          </div>
        )}

        {/* Hero 区：选择工作区主标题 */}
        <header className="flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-semibold tracking-tight">选择工作区</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              选择已有工作区，或创建一个新的内容知识库。
            </p>
          </div>
        </header>

        {/* 搜索 + 类型筛选 */}
        {projects.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称 / 品牌 / 账号 / 客户"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="清空"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-0.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    filter === opt.value
                      ? 'bg-background text-foreground shadow-soft-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 工作区卡片网格 */}
        <section className="workspace-stack">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">
              {filter === 'all' ? '全部' : FILTER_OPTIONS.find((o) => o.value === filter)?.label}
            </h3>
            <span className="text-xs text-muted-foreground">
              {isLoading ? '加载中…' : `共 ${filtered.length} 个`}
              {isError && <span className="ml-1 text-warning">（离线 mock）</span>}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-44 animate-pulse bg-secondary/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              {projects.length === 0 ? (
                // 完全没有工作区
                <EmptyState
                  icon={<Boxes />}
                  title="还没有工作区"
                  description="创建一个工作区后，你可以维护对应知识库，并优化多类内容。"
                  action={
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5" />
                      创建第一个工作区
                    </Button>
                  }
                />
              ) : (
                // 有工作区但筛选无结果
                <EmptyState
                  icon={<Search />}
                  title="未找到匹配的工作区"
                  description="尝试调整搜索关键词或切换类型筛选"
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setKeyword('')
                        setFilter('all')
                      }}
                    >
                      清空筛选
                    </Button>
                  }
                />
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>

      <WorkspaceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  )
}
