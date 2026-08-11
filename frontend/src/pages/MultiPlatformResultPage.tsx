import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/common/ExportButton'
import { RewriteStatusBadge } from '@/components/common/RewriteStatusBadge'
import {
  useTaskDetail,
  useTaskStatus,
  useRewriteOutputs,
  pickLatestOutput,
  useOutputScores,
  useOutputDetail,
  useRetryTask,
} from '@/hooks'
import { TASK_STATUS_META } from '@/common/constants'
import { mapPlatformToAssetType, isDeprecatedPlatform } from '@/common/workspace'
import { computeContentMetrics } from '@/lib/contentMetrics'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types'

/**
 * MultiPlatformResultPage - 内容资产包结果页（纯前端）
 *
 * 数据流：
 * - 通过 query string ?taskIds=id1,id2,id3 携带多个任务 id
 * - 每个任务用 useTaskDetail + useTaskStatus 轮询
 * - 完成后用 useRewriteOutputs 取最新 output，useOutputScores 取评分
 *
 * 不新增后端 API，复用现有单任务查询能力。
 *
 * P0 内容资产类型重构：原「多平台内容包」改为「内容资产包」。
 * 旧平台值（官网文章/公众号/知乎问答/小红书）通过 mapPlatformToAssetType 映射展示。
 */
export function MultiPlatformResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const taskIds = useMemo(() => {
    const raw = searchParams.get('taskIds') ?? ''
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [searchParams])

  return (
    <AppShell
      topBar={
        <TopBar
          breadcrumb={
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回
            </button>
          }
          title={
            <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
              内容优化包（{taskIds.length} 类）
            </h1>
          }
        />
      }
    >
      {taskIds.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          未检测到任务 ID。请从「文章工作台」选择多类内容后提交。
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taskIds.map((id) => (
            <PlatformTaskCard key={id} taskId={id} />
          ))}
        </div>
      )}
    </AppShell>
  )
}

function PlatformTaskCard({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useTaskDetail(taskId)
  const statusQuery = useTaskStatus(taskId, task?.status)
  const status: TaskStatus = statusQuery.data?.status ?? task?.status ?? 'pending'
  const errorMessage = statusQuery.data?.error_message ?? task?.error_message ?? null

  const outputsQuery = useRewriteOutputs(taskId, status === 'completed')
  const latestOutput = pickLatestOutput(outputsQuery.data)
  const scoresQuery = useOutputScores(latestOutput?.id)
  // 获取完整 output 详情（用于导出 HTML 报告）
  const { data: outputDetail } = useOutputDetail(latestOutput?.id)

  // 复用现有 retry 接口（不新增后端 API）
  const retryMut = useRetryTask(task?.project_id ?? '')

  const scoreAfter = scoresQuery.data?.find((s) => s.score_type === 'after')
  const rawPlatform = task?.publish_platform ?? '未知资产类型'
  // 旧平台值映射为内容资产类型展示（小红书 → 已下线平台历史内容）
  const assetTypeLabel = mapPlatformToAssetType(rawPlatform)
  const isDeprecated = isDeprecatedPlatform(rawPlatform)
  const isActive = status === 'pending' || status === 'running'
  const isFailed = status === 'failed'

  // 耗时：completed/failed 时显示，基于 created_at → updated_at
  const elapsedLabel = useMemo(() => {
    if (!task || isActive) return null
    const start = new Date(task.created_at).getTime()
    const end = new Date(task.updated_at).getTime()
    if (!start || !end || end < start) return null
    const seconds = Math.round((end - start) / 1000)
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }, [task, isActive])

  const handleRetry = () => {
    if (!task) return
    retryMut.mutate(task.id)
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* 头部：资产类型 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={isDeprecated ? 'muted' : 'primary'} className="shrink-0">
              {assetTypeLabel}
            </Badge>
            {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {status === 'completed' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
            {isFailed && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-medium" title={task?.title ?? ''}>
            {isLoading ? '加载中…' : task?.title ?? '未命名任务'}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RewriteStatusBadge status={status} />
          {elapsedLabel && (
            <span className="text-[11px] text-muted-foreground">耗时 {elapsedLabel}</span>
          )}
        </div>
      </div>

      {/* 评分 */}
      {scoreAfter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>GEO 评分</span>
          <span className="text-base font-semibold text-foreground">
            {scoreAfter.overall}
          </span>
          <span className="text-[11px]">/ 100</span>
        </div>
      )}

      {/* 失败信息 + 重新生成入口（不影响其他资产；小红书已下线不允许重新生成） */}
      {isFailed && !isDeprecated && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={retryMut.isPending}
            className="w-full"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', retryMut.isPending && 'animate-spin')} />
            {retryMut.isPending ? '重新生成中…' : '重新生成该资产'}
          </Button>
        </div>
      )}
      {isFailed && isDeprecated && (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          该资产类型已下线，无法重新生成。
        </div>
      )}

      {/* 进度提示：AI 工作状态文案 */}
      {isActive && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          AI 正在优化内容，完成后将自动展示结果。
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          asChild
          disabled={status !== 'completed'}
          className={cn(status !== 'completed' && 'pointer-events-none opacity-50')}
        >
          <Link to={`/tasks/${taskId}/result`}>
            <ExternalLink className="h-3.5 w-3.5" />
            查看结果
          </Link>
        </Button>
        {latestOutput && (
          <ExportButton
            outputId={latestOutput.id}
            filename={`${assetTypeLabel}-${task?.title ?? 'rewrite'}`}
            size="sm"
          />
        )}
        {latestOutput && outputDetail && task && (
          <ExportButton
            format="html"
            filename={`${assetTypeLabel}-${task.title ?? 'rewrite'}`}
            size="sm"
            htmlReportArgs={{
              task,
              output: outputDetail,
              beforeMetrics: computeContentMetrics(task.original_content),
              afterMetrics: computeContentMetrics(outputDetail.final_article),
              assetType: assetTypeLabel,
            }}
          />
        )}
      </div>
    </Card>
  )
}
