import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Inbox as InboxIcon,
  PenLine,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RewriteStatusBadge } from '@/components/common'
import { useProject } from '@/hooks/useProjects'
import { useBrandFacts } from '@/hooks/useBrandFacts'
import { useRewriteTasks } from '@/hooks/useRewriteTasks'
import { useWorkspaceType } from '@/hooks/useWorkspaceType'
import { mockProjects, mockTasks, mockBrandFacts } from '@/mock/data'
import { formatDateTime, relativeTime } from '@/lib/utils'
import { mapPlatformToAssetType } from '@/common/workspace'

/** 各工作区类型的 Workspace Home 文案 */
const HOME_COPY = {
  brand: {
    description: '维护品牌知识库，并优化多类内容。',
  },
  professional: {
    description: '沉淀专业能力、案例和合规边界，并优化专业内容。',
  },
  media: {
    description: '沉淀账号定位、读者画像和内容风格，并优化多类内容。',
  },
  agency: {
    description: '维护客户资料、审核偏好和交付要求，并为客户优化内容。',
  },
  unknown: {
    description: '维护知识库，并优化多类内容。',
  },
} as const

/**
 * ProjectOverviewPage - Workspace Home（工作区首页）
 *
 * 作为当前工作区的操作中心：
 *   - 顶部标题区：动态 eyebrow（品牌工作区 / 专业服务工作区 / 自媒体工作区 / 客户工作区）
 *   - 下一步行动卡片：完善知识库 / 导入素材 / 生成内容包（带状态）
 *   - 新手 Checklist：展示四步进度（仅展示与跳转）
 *   - 最近任务：最近 3-5 条任务
 *
 * 路由：/projects/:projectId
 */
export function ProjectOverviewPage() {
  const { projectId = '' } = useParams()
  const { data: projectData, isLoading, isError } = useProject(projectId)
  const project = projectData ?? (isError ? mockProjects.find((p) => p.id === projectId) : undefined)
  const { type: wsType, meta: wsMeta } = useWorkspaceType(projectId)

  const { data: tasksData, isError: tasksErr } = useRewriteTasks(projectId)
  const { data: factsData, isError: factsErr } = useBrandFacts(projectId)

  const facts = useMemo(() => {
    if (factsData) return factsData
    if (factsErr) return mockBrandFacts.filter((f) => f.project_id === projectId)
    return []
  }, [factsData, factsErr, projectId])

  const recentTasks = useMemo(() => {
    if (tasksData && tasksData.length > 0) return tasksData.slice(0, 5)
    if (tasksErr) return mockTasks.filter((t) => t.project_id === projectId).slice(0, 5)
    return []
  }, [tasksData, tasksErr, projectId])

  const copy = wsType ? HOME_COPY[wsType] : HOME_COPY.unknown

  // Checklist 状态
  const checklist = [
    { label: '已创建工作区', done: true, to: `/projects/${projectId}` },
    {
      label: '完善知识库',
      done: facts.length > 0,
      to: `/projects/${projectId}/facts`,
    },
    { label: '导入第一篇素材', done: false, to: `/projects/${projectId}/inbox` },
    {
      label: '优化第一份内容',
      done: recentTasks.length > 0,
      to: `/projects/${projectId}/rewrite/new`,
    },
  ]
  const checklistDoneCount = checklist.filter((c) => c.done).length
  const showChecklist = checklistDoneCount < checklist.length

  return (
    <AppShell
      projectId={projectId}
      topBar={
        <TopBar
          breadcrumb={
            <Link
              to="/projects"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              工作区
            </Link>
          }
          title={
            <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
              {project?.name ?? '工作区概览'}
            </h1>
          }
        />
      }
    >
      <div className="workspace-stack">
        {/* 顶部标题区 */}
        <header className="flex flex-col gap-2">
          {isLoading ? (
            <div className="h-8 w-48 animate-pulse bg-secondary/50" />
          ) : project ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-eyebrow">{wsMeta.eyebrow}</div>
                <Badge variant="muted" className="shrink-0">
                  {wsMeta.shortLabel}
                </Badge>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>最近更新：{relativeTime(project.updated_at) || '—'}</span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<FolderOpen />}
              title="工作区不存在或已被删除"
              description="请返回工作区列表选择其他工作区"
              action={
                <Button asChild size="sm" variant="ghost">
                  <Link to="/projects">返回工作区列表</Link>
                </Button>
              }
            />
          )}
        </header>

        {project && (
          <>
            {/* 下一步行动卡片：三步工作流 */}
            <section>
              <h3 className="mb-3 text-sm font-semibold tracking-tight">下一步行动</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ActionCard
                  step={1}
                  icon={<FolderOpen />}
                  title="完善知识库"
                  status={
                    facts.length > 0
                      ? `已有 ${facts.length} 条知识`
                      : '还没有知识条目'
                  }
                  description={wsMeta.knowledgeBaseName}
                  cta={facts.length > 0 ? '进入知识库' : '开始完善'}
                  to={`/projects/${projectId}/facts`}
                  done={facts.length > 0}
                />
                <ActionCard
                  step={2}
                  icon={<InboxIcon />}
                  title="导入素材"
                  status="即将支持批量导入"
                  description="Word / PDF / 网页链接 / 公众号文章"
                  cta="打开素材库"
                  to={`/projects/${projectId}/inbox`}
                  disabled
                />
                <ActionCard
                  step={3}
                  icon={<PenLine />}
                  title="内容优化"
                  status={
                    recentTasks.length > 0
                      ? `已生成 ${recentTasks.length} 个任务`
                      : '支持官网 / 媒体 / 问答 / 案例 / 自媒体'
                  }
                  description="多类内容"
                  cta={recentTasks.length > 0 ? '再次优化' : '开始优化'}
                  to={`/projects/${projectId}/rewrite/new`}
                  done={recentTasks.length > 0}
                />
              </div>
            </section>

            {/* 新手 Checklist（仅展示与跳转，不做复杂状态系统） */}
            {showChecklist && (
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">开始使用</h3>
                  <span className="text-xs text-muted-foreground">
                    {checklistDoneCount} / {checklist.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {checklist.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60"
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        )}
                        <span
                          className={
                            item.done
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }
                        >
                          {item.label}
                        </span>
                        {!item.done && (
                          <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 最近任务 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">最近任务</h3>
                <Link
                  to="/history"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  查看全部
                </Link>
              </div>
              <RecentTaskList tasks={recentTasks} loading={isLoading} projectId={projectId} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

// ===== 行动卡片 =====
interface ActionCardProps {
  step: number
  icon: React.ReactNode
  title: string
  status: string
  description: string
  cta: string
  to: string
  done?: boolean
  disabled?: boolean
}

function ActionCard({
  step,
  icon,
  title,
  status,
  description,
  cta,
  to,
  done,
  disabled,
}: ActionCardProps) {
  return (
    <Card
      className={`group relative flex flex-col gap-3 p-5 transition-all duration-200 ease-apple ${
        disabled
          ? 'opacity-80'
          : 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-md'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
        <span className="text-eyebrow">第 {step} 步</span>
        {done && (
          <Badge variant="muted" className="ml-auto text-[10px] text-success">
            已完成
          </Badge>
        )}
        {disabled && (
          <Badge variant="muted" className="ml-auto text-[10px]">
            即将支持
          </Badge>
        )}
      </div>
      <div className="min-w-0">
        <h4 className="text-base font-semibold tracking-tight">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{status}</p>
      {disabled ? (
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
          {cta}
        </span>
      ) : (
        <Link
          to={to}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary opacity-90 transition-opacity group-hover:opacity-100"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </Card>
  )
}

// ===== 最近任务列表 =====
interface RecentTaskListProps {
  tasks: import('@/types').RewriteTask[]
  loading: boolean
  projectId: string
}

function RecentTaskList({ tasks, loading, projectId }: RecentTaskListProps) {
  if (loading) {
    return (
      <Card className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载中…
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText />}
          title="还没有生成记录"
          description="你可以先上传或粘贴一篇母稿，优化多类内容。"
          action={
            <Button asChild size="sm">
              <Link to={`/projects/${projectId}/rewrite/new`}>
                <PenLine className="h-3.5 w-3.5" />
                开始优化
              </Link>
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_120px_150px] items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>标题</span>
        <span>资产类型</span>
        <span>状态</span>
        <span className="text-right">创建时间</span>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((t) => (
          <Link
            key={t.id}
            to={`/tasks/${t.id}/result`}
            className="grid grid-cols-[1fr_120px_120px_150px] items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-secondary/40"
          >
            <span className="truncate font-medium text-foreground" title={t.title}>
              {t.title}
            </span>
            <span className="truncate text-xs text-muted-foreground" title={mapPlatformToAssetType(t.publish_platform)}>
              {mapPlatformToAssetType(t.publish_platform)}
            </span>
            <RewriteStatusBadge status={t.status} />
            <span className="text-right text-xs text-muted-foreground">
              {formatDateTime(t.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
