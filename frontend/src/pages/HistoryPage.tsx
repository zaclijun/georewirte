import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, Eye, Trash2, History as HistoryIcon } from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RewriteStatusBadge, ExportButton } from '@/components/common'
import { CONTENT_ASSET_TYPES } from '@/common/constants'
import { mapPlatformToAssetType } from '@/common/workspace'
import { useProjects } from '@/hooks/useProjects'
import { useRewriteTasks, useDeleteTask } from '@/hooks/useRewriteTasks'
import { mockProjects, mockTasks } from '@/mock/data'
import type { RewriteTask, TaskStatus } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getScoreColumnLabel } from '@/lib/platformScorecard'

/**
 * 资产类型下降文案：自有官网内容显示「分数下降」，其它资产类型显示「就绪度下降」。
 * 旧平台值（公众号/小红书/知乎问答）映射后视为对应资产类型。
 */
function getDeclineLabel(platform: string): string {
  const assetType = mapPlatformToAssetType(platform)
  if (assetType === '自有官网内容') return '分数下降'
  return '就绪度下降'
}

type StatusFilter = 'all' | TaskStatus
/** 资产类型筛选：'all' 或 6 类内容资产类型之一 */
type AssetTypeFilter = 'all' | (typeof CONTENT_ASSET_TYPES)[number]['value']

/**
 * HistoryPage - 历史任务页
 *
 * 数据源：先 useProjects 拿到所有项目，再对每个项目 useRewriteTasks 聚合
 * （后端契约：任务列表挂在 project 下，不提供全局 /tasks）
 * 失败 fallback：mockTasks
 */
export function HistoryPage() {
  const { data: projects, isError: projectsErr } = useProjects()
  const projectList = projects ?? (projectsErr ? mockProjects : [])

  // 对每个项目拉取任务列表
  // useRewriteTasks 需要在循环中调用违反 hooks 规则，因此用辅助组件渲染
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('all')

  const filterFn = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return (allTasks: RewriteTask[]): RewriteTask[] =>
      allTasks.filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false
        // 资产类型筛选：将任务的 publish_platform（可能是旧平台值）映射为资产类型后比较
        if (assetTypeFilter !== 'all' && mapPlatformToAssetType(t.publish_platform) !== assetTypeFilter) return false
        if (kw && !t.title.toLowerCase().includes(kw)) return false
        return true
      })
  }, [keyword, statusFilter, assetTypeFilter])

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'running', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
  ]

  return (
    <AppShell
      variant="wide"
      topBar={
        <TopBar
          title={
            <h1 className="text-[var(--tier-title)] font-semibold tracking-tight">历史任务</h1>
          }
        />
      }
    >
      <div className="workspace-stack">
        {/* 页面说明：替代旧版「N 个项目」右上角计数，避免与历史任务语义不符 */}
        <header className="flex flex-col gap-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            查看所有工作区下的内容优化任务。{projectsErr && (
              <span className="text-warning">当前为离线 mock 数据。</span>
            )}
          </p>
        </header>
        {/* 筛选栏 */}
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索任务标题"
              className="pl-9 pr-8"
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
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assetTypeFilter} onValueChange={(v) => setAssetTypeFilter(v as AssetTypeFilter)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部资产类型</SelectItem>
              {CONTENT_ASSET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* 聚合各项目任务 */}
        <AggregatedTaskTable
          projectIds={projectList.map((p) => p.id)}
          projectNameMap={Object.fromEntries(projectList.map((p) => [p.id, p.name]))}
          filterFn={filterFn}
          onFallback={() => mockTasks}
        />
      </div>
    </AppShell>
  )
}

// ===== 聚合表格组件（避免在循环中调用 hook） =====
interface AggregatedTaskTableProps {
  projectIds: string[]
  projectNameMap: Record<string, string>
  filterFn: (tasks: RewriteTask[]) => RewriteTask[]
  onFallback: () => RewriteTask[]
}

function AggregatedTaskTable({
  projectIds,
  projectNameMap,
  filterFn,
  onFallback,
}: AggregatedTaskTableProps) {
  const deleteMut = useDeleteTask('') // projectId 占位，删除走 /tasks/:id 不依赖项目

  // 没有项目时直接走 fallback
  if (projectIds.length === 0) {
    return <TaskTableView tasks={onFallback()} projectNameMap={projectNameMap} filterFn={filterFn} deleteMut={deleteMut} />
  }

  return (
    <div className="space-y-6">
      {projectIds.map((pid) => (
        <PerProjectTaskTable
          key={pid}
          projectId={pid}
          projectName={projectNameMap[pid] ?? pid}
          filterFn={filterFn}
          deleteMut={deleteMut}
        />
      ))}
    </div>
  )
}

interface PerProjectTaskTableProps {
  projectId: string
  projectName: string
  filterFn: (tasks: RewriteTask[]) => RewriteTask[]
  deleteMut: ReturnType<typeof useDeleteTask>
}

function PerProjectTaskTable({
  projectId,
  projectName,
  filterFn,
  deleteMut,
}: PerProjectTaskTableProps) {
  const { data, isLoading, isError } = useRewriteTasks(projectId)
  // 失败 fallback 到该项目的 mock 任务
  const tasks = data ?? (isError ? mockTasks.filter((t) => t.project_id === projectId) : [])
  const filtered = filterFn(tasks ?? [])

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-eyebrow mb-2">{projectName}</div>
        <div className="h-24 animate-pulse bg-secondary/40" />
      </Card>
    )
  }

  if (filtered.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold tracking-tight">{projectName}</h3>
        <span className="text-xs text-muted-foreground">{filtered.length} 条</span>
        {isError && <span className="text-xs text-warning">（离线 mock）</span>}
      </div>
      <TaskTableView tasks={filtered} projectNameMap={{}} filterFn={(t) => t} deleteMut={deleteMut} hideProjectName />
    </div>
  )
}

// ===== 表格视图 =====
interface TaskTableViewProps {
  tasks: RewriteTask[]
  projectNameMap: Record<string, string>
  filterFn: (tasks: RewriteTask[]) => RewriteTask[]
  deleteMut: ReturnType<typeof useDeleteTask>
  hideProjectName?: boolean
}

function TaskTableView({
  tasks,
  projectNameMap,
  filterFn,
  deleteMut,
  hideProjectName = false,
}: TaskTableViewProps) {
  const filtered = filterFn(tasks)

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon />}
        title="未找到匹配的任务"
        description="尝试调整筛选条件"
      />
    )
  }

  // 列宽模板：标题 280 / 平台 100 / 视角 100 / 状态 130 / 改前 70 / 改后 70 / 提升 80 / 创建时间 160 / 操作 220
  // 合计 1210px，低于此宽度触发横向滚动，避免列内容互相覆盖
  const gridCols =
    'grid-cols-[minmax(260px,1fr)_100px_100px_130px_70px_70px_80px_160px_220px]'

  return (
    <Card className="overflow-hidden">
      {/* 横向滚动容器：保证窄屏下列宽不被压缩、按钮不重叠 */}
      <div className="overflow-x-auto">
        <div className="min-w-[1210px] w-full">
          {/* 表头 */}
          <div
            className={cn(
              'grid items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground',
              gridCols,
            )}
          >
            <span>标题</span>
            <span>资产类型</span>
            <span>视角</span>
            <span>状态</span>
            <span className="text-right">改前</span>
            <span className="text-right">改后</span>
            <span className="text-right">提升</span>
            <span>创建时间</span>
            <span className="text-right">操作</span>
          </div>
          {/* 行 */}
          <div className="divide-y divide-border">
            {filtered.map((t) => {
              const delta =
                typeof t.score_before === 'number' && typeof t.score_after === 'number'
                  ? t.score_after - t.score_before
                  : null
              return (
                <div
                  key={t.id}
                  className={cn(
                    'grid items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-secondary/40',
                    gridCols,
                  )}
                >
                  {/* 标题：单行省略，hover/title 查看完整 */}
                  <div className="min-w-0">
                    <Link
                      to={`/tasks/${t.id}/result?from=history`}
                      className="block truncate font-medium text-foreground hover:text-primary"
                      title={t.title}
                    >
                      {t.title}
                    </Link>
                    {!hideProjectName && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {projectNameMap[t.project_id] ?? t.project_id}
                      </div>
                    )}
                    {t.status === 'failed' && t.error_message && (
                      <div
                        className="truncate text-[11px] text-destructive"
                        title={t.error_message}
                      >
                        {t.error_message}
                      </div>
                    )}
                  </div>
                  {/* 资产类型 / 视角：降一级颜色；旧平台值映射为内容资产类型展示 */}
                  <span className="truncate text-xs text-muted-foreground" title={mapPlatformToAssetType(t.publish_platform)}>
                    {mapPlatformToAssetType(t.publish_platform)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={t.perspective}>
                    {t.perspective}
                  </span>
                  {/* 状态 pill：min-width 已在 RewriteStatusBadge 内固定 + 分数下降额外提示 */}
                  <div className="flex flex-col gap-0.5">
                    <RewriteStatusBadge status={t.status} />
                    {t.status === 'completed' && delta !== null && delta < 0 && (
                      <span className="text-[10px] text-warning">{getDeclineLabel(t.publish_platform)}</span>
                    )}
                  </div>
                  {/* 数字列：右对齐 */}
                  <span className="text-right nums text-muted-foreground">
                    {t.score_before ?? '—'}
                  </span>
                  <span className="text-right nums font-medium">{t.score_after ?? '—'}</span>
                  {delta !== null ? (
                    <span className="flex justify-end">
                      <Badge
                        variant={
                          delta > 0
                            ? 'success'
                            : delta < -3
                              ? 'destructive'
                              : delta < 0
                                ? 'warning'
                                : 'muted'
                        }
                        className="text-[10px]"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-right text-xs text-muted-foreground">—</span>
                  )}
                  {/* 创建时间 + 模型：不换行 */}
                  <div className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(t.created_at)}
                    </span>
                    {t.model_display_name && (
                      <span className="truncate text-[10px] text-muted-foreground/70" title={t.model_display_name}>
                        · {t.model_display_name}
                      </span>
                    )}
                  </div>
                  {/* 操作列：查看 / 导出 / 删除，稳定 flex + gap-2 */}
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <Button asChild size="icon-sm" variant="ghost" title="查看结果">
                      <Link to={`/tasks/${t.id}/result?from=history`} aria-label="查看结果">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {t.status === 'completed' && t.output_id ? (
                      <ExportButton
                        outputId={t.output_id}
                        filename={t.title || 'rewrite'}
                        fallbackContent=""
                        size="sm"
                        variant="ghost"
                        compact
                        title="导出 Markdown"
                        className="h-8 w-8 px-0"
                      />
                    ) : (
                      // 占位：保持列宽稳定，避免不同行按钮位置跳动
                      <span className="inline-block h-8 w-8" aria-hidden />
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className={cn(
                        'text-destructive hover:bg-destructive/10 hover:text-destructive',
                      )}
                      title="删除任务"
                      aria-label="删除任务"
                      onClick={() => {
                        if (confirm(`确认删除任务「${t.title}」？`)) {
                          deleteMut.mutate(t.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>共 {filtered.length} 条</span>
      </div>
    </Card>
  )
}
