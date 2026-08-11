import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, Check, RefreshCw, Loader2, AlertCircle, ChevronRight, AlertTriangle, ArrowRight, ListChecks } from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MarkdownRenderer,
  ExportButton,
  CopyButton,
  RewriteStatusBadge,
} from '@/components/common'
import { ResultInspector, PlatformPublishGuideView } from '@/components/rewrite'
import {
  useTaskDetail,
  useTaskStatus,
  isTaskActive,
  useRewriteOutputs,
  pickLatestOutput,
  useRegenerateOutput,
  useRetryTask,
  useOutputDetail,
} from '@/hooks'
import { useProject } from '@/hooks/useProjects'
import type { RewriteOutput, SchemaSuggestion } from '@/types'
import { copyToClipboard, cn } from '@/lib/utils'
import {
  computeContentMetrics,
  formatMetricsLine,
  formatCharDelta,
} from '@/lib/contentMetrics'
import { cleanFinalArticle } from '@/lib/cleanArticle'
import {
  detectArticlePollution,
  getQualityGateFromOutput,
  getScoreDelta,
  getTopDeclinedDimensions,
  getQualityGateMetaForPlatform,
} from '@/lib/qualityGate'
import {
  getPlatformScorecardConfig,
  getScorecardBadgeLabel,
} from '@/lib/platformScorecard'
import { mapPlatformToAssetType, isDeprecatedPlatform } from '@/common/workspace'

/**
 * 剥离 faq_content 开头可能被 LLM 误加的 `## FAQ` / `# FAQ` 标题行。
 * LLM 偶尔会在 faq_content 开头带 `## FAQ`，与 FAQ Tab 的章节语义重复。
 */
function stripFaqHeader(faq: string | undefined | null): string {
  if (!faq) return ''
  const stripped = faq.trimStart()
  for (const prefix of ['## FAQ', '# FAQ']) {
    if (stripped.startsWith(prefix)) {
      return stripped.slice(prefix.length).replace(/^[\s\n]+/, '')
    }
  }
  return faq
}

/**
 * 判断 schema_suggestions 是 Schema JSON-LD 还是 PlatformPublishGuide。
 */
function isPlatformGuide(suggestion: SchemaSuggestion | null | undefined): boolean {
  return !!suggestion && suggestion.type === 'PlatformPublishGuide'
}

/**
 * 根据 schema_suggestions 返回 Schema Tab 的标签文案。
 * 旧小红书任务保留「图文脚本」文案；其它 PlatformPublishGuide 显示「发布建议」。
 */
function getSchemaTabLabel(suggestion: SchemaSuggestion | null | undefined): string {
  if (!suggestion) return 'Schema'
  if (isPlatformGuide(suggestion)) {
    const platform = String(suggestion.json_ld?.platform ?? '')
    if (platform === '小红书') return '图文脚本'
    return '发布建议'
  }
  return 'Schema'
}

/**
 * RewriteResultPage - 改写结果页（核心页面）⭐
 *
 * Workspace 信息层级（Apple 风格五层阅读路径）：
 *   L0  TopBar 面包屑      ← 历史 /  ← 知道在哪
 *   L1  TopBar 标题        ← 任务标题  ← 知道是什么
 *   L2  TopBar 状态        ← 平台 + 任务状态 Badge  ← 知道当前状态
 *   L3  TopBar 操作区      ← 复制 / 导出 / 重新改写  ← 知道能做什么
 *   L3' 成果摘要带(正文顶)  ← 改前→改后评分 + 质量状态（首屏可见，不挤 TopBar）
 *   L4  正文 / Inspector   ← Tabs + 右侧雷达/策略/缺口
 *
 * 布局：正文 65% / Inspector 35%，sticky 偏移统一用 --workspace-sticky-top
 *
 * 数据流（真实 API 联调模式，不再使用 mock fallback）：
 * 1. useTaskDetail(taskId) 拿任务详情 —— 失败时显示错误视图，不再 fallback mockTasks
 * 2. useRewriteOutputs(taskId) 拿 outputs，pickLatestOutput 取最新版本 —— 失败时不再 fallback mockOutput
 * 3. useTaskStatus(taskId, task.status) 在 pending/running 时每 3s 轮询，终态自动 invalidate
 * 4. 任务 failed 时显示 TaskFailedView（含 error_message），不再掩盖后端错误
 */
export function RewriteResultPage() {
  const { taskId = '' } = useParams()
  const [searchParams] = useSearchParams()
  // 从全局历史任务进入时，进入 History Result Mode：不切换当前工作区
  const isFromHistory = searchParams.get('from') === 'history'

  const { data: taskData, isError: taskErr, error: taskErrorObj } = useTaskDetail(taskId)
  // 真实 API 模式：失败时不再 fallback 到 mockTasks，让错误暴露
  const task = taskData

  // 状态轮询：task 处于 pending/running 时启用
  useTaskStatus(task?.id, task?.status)

  const { data: outputsData } = useRewriteOutputs(
    task?.id,
    !!task, // task 存在即启用（包括 running 态，轮询会自动刷新）
  )
  const latestSummary = pickLatestOutput(outputsData) // 摘要（只有 id/version）
  const { data: outputData } = useOutputDetail(latestSummary?.id) // 详情（完整数据）
  const output: RewriteOutput | undefined = outputData

  const { data: projectData } = useProject(task?.project_id)
  const project = projectData
  const regenerateMut = useRegenerateOutput(task?.id ?? '')
  const retryMut = useRetryTask(task?.project_id ?? '')

  const [copied, setCopied] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [activeTab, setActiveTab] = useState('article')

  // 内容规模统计（纯前端计算，不依赖后端字段）
  // 注意：useMemo 必须在所有早期 return 之前调用，否则违反 Hooks 规则
  const beforeMetrics = useMemo(
    () => computeContentMetrics(task?.original_content),
    [task?.original_content],
  )
  const afterMetrics = useMemo(
    () => computeContentMetrics(output?.final_article),
    [output?.final_article],
  )
  const charDeltaPercent = useMemo(
    () =>
      beforeMetrics.charCount === 0
        ? null
        : Math.round(
            ((afterMetrics.charCount - beforeMetrics.charCount) / beforeMetrics.charCount) * 1000,
          ) / 10,
    [beforeMetrics, afterMetrics],
  )

  // 纯净正文：清洗 Markdown 标题符号 / 代码围栏 / HTML 标签 / 报告型标题 / 话题 # 号 / 列表符号
  // 用于「复制正文」（TopBar + 改写正文 Tab + 原文对比 Tab 共 3 处入口）
  // 复制后可直接粘贴到公众号 / 官网编辑器 / 飞书文档 / Word
  const assetType = useMemo(
    () => mapPlatformToAssetType(task?.publish_platform),
    [task?.publish_platform],
  )
  const cleanedFinalArticle = useMemo(
    () => cleanFinalArticle(output?.final_article ?? '', assetType),
    [output?.final_article, assetType],
  )

  const handleCopy = async () => {
    if (!output) return
    const ok = await copyToClipboard(cleanedFinalArticle)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleRerewrite = () => {
    if (!output) return
    setRewriting(true)
    regenerateMut.mutate(output.id, {
      onSettled: () => setRewriting(false),
    })
  }

  const handleRetry = () => {
    if (!task) return
    setRetrying(true)
    retryMut.mutate(task.id, {
      onSettled: () => setRetrying(false),
    })
  }

  // History Result Mode：不传 projectId 给 AppShell，Sidebar 显示「选择工作区」
  // Workspace Result Mode：传 projectId，Sidebar 显示当前工作区
  const shellProjectId = isFromHistory ? undefined : task?.project_id

  // ===== 加载态：taskErr 时显示真实错误（不再 fallback mock）=====
  if (!task) {
    return (
      <AppShell projectId={undefined} variant="bare">
        <div className="workspace flex items-start justify-center pt-24">
          {taskErr ? (
            <div className="flex w-full max-w-lg flex-col items-center gap-3 text-center">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">无法加载任务（真实 API 失败）</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {taskErrorObj instanceof Error ? taskErrorObj.message : '任务不存在或后端未响应'}
              </p>
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
                联调提示：已关闭 mock fallback，请检查后端 /api/tasks/{taskId} 是否可访问
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-4">
                <Link to="/history">返回历史</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">加载任务中…</span>
            </div>
          )}
        </div>
      </AppShell>
    )
  }

  // ===== 任务失败态 =====
  if (task.status === 'failed') {
    return (
      <AppShell projectId={shellProjectId} variant="bare">
        <TaskFailedView
          task={task}
          hasOutput={!!output}
          onRetry={handleRetry}
          retrying={retrying}
        />
      </AppShell>
    )
  }

  // ===== 任务进行中态 =====
  if (isTaskActive(task) || !output) {
    return (
      <AppShell projectId={shellProjectId} variant="bare">
        <TaskRunningView task={task} hasOutput={!!output} />
      </AppShell>
    )
  }

  const schemaSuggestion = output.schema_suggestions
  const guideMode = isPlatformGuide(schemaSuggestion)
  const schemaTabLabel = getSchemaTabLabel(schemaSuggestion)
  const schemaJson = schemaSuggestion?.json_ld
    ? JSON.stringify(schemaSuggestion.json_ld, null, 2)
    : '（无 Schema 建议）'
  const articlePolluted = detectArticlePollution(output.final_article ?? '')

  return (
    <AppShell
      projectId={shellProjectId}
      topBar={
        <TopBar
          breadcrumb={
            isFromHistory ? (
              <Link
                to="/history"
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                历史任务
              </Link>
            ) : (
              <Link
                to={task.project_id ? `/projects/${task.project_id}` : '/history'}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {project?.name ?? '工作区'}
              </Link>
            )
          }
          title={
            <>
              <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
                {task.title}
              </h1>
              <Badge
                variant={isDeprecatedPlatform(task.publish_platform) ? 'muted' : 'outline'}
                className="shrink-0"
              >
                {mapPlatformToAssetType(task.publish_platform)}
              </Badge>
              <RewriteStatusBadge status={task.status} />
            </>
          }
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制正文'}
              </Button>
              <ExportButton
                outputId={output.id}
                filename={task.title || 'rewrite-result'}
                fallbackContent={output.final_article}
                size="sm"
              />
              <ExportButton
                format="html"
                filename={task.title || 'rewrite-result'}
                size="sm"
                htmlReportArgs={{
                  task,
                  output,
                  project,
                  beforeMetrics,
                  afterMetrics,
                  assetType,
                }}
              />
              <Button size="sm" variant="primary" onClick={handleRerewrite} disabled={rewriting}>
                <RefreshCw className={rewriting ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                {rewriting ? '改写中…' : '重新改写'}
              </Button>
            </>
          }
        />
      }
    >
      <div className="workspace-stack">
        {/* 任务来源信息行：所属工作区 · 资产类型 · 视角 · 版本；History Mode 显示「进入工作区」按钮 */}
        <TaskContextBar
          projectName={project?.name}
          projectId={task.project_id}
          platform={task.publish_platform}
          perspective={task.perspective}
          version={output.version}
          isFromHistory={isFromHistory}
          modelConfigId={task.model_config_id}
          modelProvider={task.model_provider}
          modelName={task.model_name}
          modelDisplayName={task.model_display_name}
        />

        {/* L3' 成果摘要带：评分对比 + 发布就绪度 + 内容规模（首屏可见，不再挤 TopBar） */}
        <ResultHeroBand
          output={output}
          platform={task.publish_platform}
          projectName={project?.name}
          beforeMetrics={beforeMetrics}
          afterMetrics={afterMetrics}
          charDeltaPercent={charDeltaPercent}
        />

        {/* 降分解释卡：delta < 0 时显示 */}
        <ScoreDeclineExplainer
          output={output}
          platform={task.publish_platform}
          onRerewrite={handleRerewrite}
          rewriting={rewriting}
        />

        {/* L4 正文 65% / Inspector 35% */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[65fr_35fr]">
          {/* 左侧主内容区 */}
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="article">改写正文</TabsTrigger>
                <TabsTrigger value="compare">原文对比</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="schema">{schemaTabLabel}</TabsTrigger>
              </TabsList>

              {/* Tab 1 改写正文 */}
              <TabsContent value="article">
                {articlePolluted && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      检测到正文中包含非正文模块（FAQ / 律师简介 / 免责声明 等），建议重新生成或人工复核。
                    </span>
                  </div>
                )}
                <Card className="p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                    <span className="text-eyebrow">改写正文</span>
                    <CopyButton text={cleanedFinalArticle} label="复制当前正文" />
                  </div>
                  {/* 正文阅读容器：限制最大宽度，保证长文章阅读舒适 */}
                  <div className="mx-auto max-w-[800px]">
                    <MarkdownRenderer content={output.final_article} />
                  </div>
                </Card>
              </TabsContent>

              {/* Tab 2 原文对比 */}
              <TabsContent value="compare">
                <div className="workspace-stack-sm">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* 原文栏 */}
                    <Card className="flex flex-col p-5">
                      <div className="mb-3 border-b border-border pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-eyebrow">原文</span>
                          <span className="text-[11px] text-muted-foreground">未改写</span>
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          {formatMetricsLine(beforeMetrics)}
                        </div>
                      </div>
                      <div className="max-h-[640px] overflow-y-auto pr-1">
                        <MarkdownRenderer
                          content={task.original_content}
                          variant="compact"
                        />
                      </div>
                    </Card>
                    {/* 改写后栏 */}
                    <Card className="flex flex-col p-5">
                      <div className="mb-3 border-b border-border pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-eyebrow">改写后</span>
                          <CopyButton text={cleanedFinalArticle} label="复制" />
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          {formatMetricsLine(afterMetrics)}
                          {charDeltaPercent !== null && (
                            <span
                              className={cn(
                                'ml-2 font-medium',
                                charDeltaPercent >= 0
                                  ? 'text-success'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {charDeltaPercent >= 0 ? '+' : ''}
                              {charDeltaPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-[640px] overflow-y-auto pr-1">
                        <MarkdownRenderer
                          content={output.final_article}
                          variant="compact"
                        />
                      </div>
                    </Card>
                  </div>
                  <Card className="p-5">
                    <div className="text-eyebrow mb-2">改写摘要</div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {output.comparison_summary}
                    </p>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 3 FAQ（剥离 LLM 可能误加的重复 `## FAQ` 标题） */}
              <TabsContent value="faq">
                <Card className="p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                    <span className="text-eyebrow">FAQ</span>
                    <CopyButton text={stripFaqHeader(output.faq_content)} label="复制" />
                  </div>
                  {/* FAQ 阅读容器：限制宽度 + 问答模块样式 */}
                  <div className="mx-auto max-w-[800px]">
                    <MarkdownRenderer
                      content={stripFaqHeader(output.faq_content)}
                      variant="faq"
                    />
                  </div>
                </Card>
              </TabsContent>

              {/* Tab 4 Schema / 平台发布建议（动态） */}
              <TabsContent value="schema">
                {guideMode ? (
                  // 自媒体 / 其它资产类型：卡片式展示发布建议
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      该资产类型不支持 JSON-LD 结构化数据，已转为发布建议。
                    </div>
                    {schemaSuggestion && <PlatformPublishGuideView suggestion={schemaSuggestion} />}
                    <Card className="overflow-hidden">
                      <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <span className="text-eyebrow">原始结构（可复制）</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await copyToClipboard(schemaJson)
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          复制 JSON
                        </Button>
                      </div>
                      <pre className="overflow-x-auto bg-foreground p-5 text-xs leading-relaxed text-background">
                        <code className="font-mono">{schemaJson}</code>
                      </pre>
                    </Card>
                  </div>
                ) : (
                  // 官网文章：JSON-LD Schema
                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-eyebrow">JSON-LD Schema</span>
                        <Badge variant="info" className="text-[10px]">
                          {schemaSuggestion?.type ?? '—'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await copyToClipboard(schemaJson)
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制 JSON
                      </Button>
                    </div>
                    <pre className="overflow-x-auto bg-foreground p-5 text-xs leading-relaxed text-background">
                      <code className="font-mono">{schemaJson}</code>
                    </pre>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* 右侧 Inspector */}
          <ResultInspector
            output={output}
            platform={task.publish_platform}
            onAddFact={() => {
              // 跳转到品牌事实库页面，并预填表单
              window.location.href = `/projects/${task.project_id}/facts`
            }}
          />
        </div>
      </div>
    </AppShell>
  )
}

// ===== 任务来源信息行 =====
interface TaskContextBarProps {
  projectName?: string
  projectId: string
  platform: string
  perspective: string
  version: number
  isFromHistory: boolean
  modelConfigId?: string | null
  modelProvider?: string | null
  modelName?: string | null
  modelDisplayName?: string | null
}

/**
 * TaskContextBar - 顶部任务来源信息行
 *
 * History Result Mode：显示「所属工作区：xxx · 资产类型 · 视角 · 版本」+ 「进入工作区」按钮
 * Workspace Result Mode：仅显示元信息行，无「进入工作区」按钮
 *
 * 旧平台值（官网文章/公众号/知乎问答/小红书）通过 mapPlatformToAssetType 映射为内容资产类型展示。
 */
function TaskContextBar({
  projectName,
  projectId,
  platform,
  perspective,
  version,
  isFromHistory,
  modelConfigId,
  modelProvider,
  modelName,
  modelDisplayName,
}: TaskContextBarProps) {
  // 模型名称回退链：display_name → model_name → model_provider → 未记录
  const resolvedModelLabel = modelDisplayName || modelName || modelProvider || null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        所属工作区：<span className="text-foreground">{projectName ?? projectId ?? '未知工作区'}</span>
      </span>
      <span className="text-border">·</span>
      <span>资产类型：<span className="text-foreground">{mapPlatformToAssetType(platform)}</span></span>
      <span className="text-border">·</span>
      <span>视角：<span className="text-foreground">{perspective}</span></span>
      <span className="text-border">·</span>
      <span>版本：<span className="text-foreground">v{version}</span></span>
      {resolvedModelLabel && (
        <>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground">
            使用模型：{resolvedModelLabel}
          </span>
        </>
      )}
      {isFromHistory && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1 px-2 text-xs"
        >
          <Link to={`/projects/${projectId}`}>
            进入工作区
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      )}
    </div>
  )
}

// ===== 降分解释卡 =====
interface ScoreDeclineExplainerProps {
  output: RewriteOutput
  platform: string | undefined | null
  onRerewrite: () => void
  rewriting: boolean
}

/**
 * ScoreDeclineExplainer - delta < 0 时显示降分解释卡
 *
 * 文案根据资产类型从 PlatformScorecardConfig.declineTitle 取：
 *   - 自有官网内容 → 「GEO 信源就绪度下降，需检查」
 *   - 其它资产类型 → 对应就绪度/适配度下降文案
 *
 * 包含：
 *   - 通用解释（原文质量高、资产类型适配压缩、实体弱化、来源不足）
 *   - 下降维度 Top 3（如 score_before/after.dimensions 存在）
 *   - 操作按钮：重新优化一版 / 保留原文（disabled） / 查看来源缺口（锚点）
 */
function ScoreDeclineExplainer({ output, platform, onRerewrite, rewriting }: ScoreDeclineExplainerProps) {
  const delta = getScoreDelta(output)
  if (delta === null || delta >= 0) return null

  const declinedDims = getTopDeclinedDimensions(output)
  const scoreConfig = getPlatformScorecardConfig(platform)

  return (
    <Card className="border-warning/30 bg-warning/5 p-5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {scoreConfig.declineTitle}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            本次改写后综合评分下降 <span className="font-medium text-warning">{Math.abs(delta)}</span> 分。常见原因包括：
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>原文本身质量较高，改写空间有限；</li>
            <li>改写为适配资产类型，可能压缩了部分事实和来源信息；</li>
            <li>部分关键实体、数据或来源在改写后弱化；</li>
            <li>当前版本仍缺少可验证来源或结构化依据。</li>
          </ul>

          {declinedDims.length > 0 && (
            <div className="mt-3">
              <div className="text-eyebrow mb-1.5">下降维度</div>
              <div className="flex flex-col gap-1">
                {declinedDims.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="text-foreground">{d.name}</span>
                    <span className="text-muted-foreground nums">
                      {d.before} → {d.after}
                    </span>
                    <Badge variant="warning" className="text-[10px]">
                      {d.delta}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={onRerewrite} disabled={rewriting}>
              <RefreshCw className={rewriting ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
              {rewriting ? '改写中…' : '重新优化一版'}
            </Button>
            <Button size="sm" variant="ghost" disabled title="后续能力，本轮暂未实现">
              保留原文，仅使用发布建议
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              title="查看来源缺口"
            >
              <a href="#source-gap">
                <ListChecks className="h-3.5 w-3.5" />
                查看来源缺口
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ===== L3' 成果摘要带 =====
function ResultHeroBand({
  output,
  platform,
  projectName,
  beforeMetrics,
  afterMetrics,
  charDeltaPercent,
}: {
  output: RewriteOutput
  platform: string | undefined | null
  projectName?: string
  beforeMetrics: import('@/lib/contentMetrics').ContentMetrics
  afterMetrics: import('@/lib/contentMetrics').ContentMetrics
  charDeltaPercent: number | null
}) {
  const beforeScore = output.score_before?.overall ?? 0
  const afterScore = output.score_after?.overall ?? 0
  const gate = getQualityGateFromOutput(output, platform)
  const gateMeta = getQualityGateMetaForPlatform(gate, platform)
  const scoreConfig = getPlatformScorecardConfig(platform)

  return (
    <Card className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
      {/* 评分对比 - 大号，首屏可见 */}
      <div className="flex items-center gap-6">
        <div>
          <div className="text-eyebrow mb-1">{scoreConfig.beforeLabel}</div>
          <div className="text-[var(--tier-hero)] font-semibold tracking-tight text-muted-foreground nums">
            {beforeScore}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
        <div>
          <div className="text-eyebrow mb-1">{scoreConfig.afterLabel}</div>
          <div className="text-[var(--tier-hero)] font-semibold tracking-tight text-primary nums">
            {afterScore}
          </div>
        </div>
        <Badge
          variant={
            afterScore > beforeScore
              ? 'success'
              : afterScore < beforeScore
                ? 'warning'
                : 'muted'
          }
          className="text-xs"
        >
          {afterScore > beforeScore
            ? `+${afterScore - beforeScore}`
            : afterScore - beforeScore}
        </Badge>
      </div>

      <div className="h-10 w-px bg-border" />

      {/* 发布就绪度（Quality Gate，区分 task.status 与交付质量） */}
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow">发布就绪度</span>
        <Badge variant={gateMeta.color} className="text-xs" title={gateMeta.description}>
          {gateMeta.title}
        </Badge>
      </div>

      {/* 元信息 */}
      <div className="ml-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
        <span>{projectName ?? '—'} · v{output.version}</span>
        <span>{getScorecardBadgeLabel(platform)}</span>
      </div>

      {/* 内容规模统计 */}
      <div className="flex w-full flex-col gap-1.5 border-t border-border pt-3 text-xs">
        <div className="text-eyebrow">内容规模</div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
          <span>
            原文：<span className="text-foreground">{formatMetricsLine(beforeMetrics)}</span>
          </span>
          <span>
            改写后：<span className="text-foreground">{formatMetricsLine(afterMetrics)}</span>
          </span>
          <span>
            变化：<span className="text-foreground">{formatCharDelta(beforeMetrics, afterMetrics)}</span>
          </span>
        </div>
        {charDeltaPercent !== null && charDeltaPercent < -30 && (
          <div className="mt-1 flex items-start gap-1.5 text-warning">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>改写后篇幅减少较多，请检查是否删减了关键事实、数据或来源。</span>
          </div>
        )}
        {charDeltaPercent !== null && charDeltaPercent > 80 && (
          <div className="mt-1 flex items-start gap-1.5 text-warning">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>改写后篇幅增加较多，请检查是否存在冗余表达。</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ===== 任务进行中视图 =====
function TaskRunningView({
  task,
  hasOutput,
}: {
  task: NonNullable<ReturnType<typeof useTaskDetail>['data']>
  hasOutput: boolean
}) {
  const isRunning = task.status === 'running'
  return (
    <div className="workspace flex flex-col items-center justify-center pt-24 pb-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
        {isRunning ? (
          <Loader2 className="h-7 w-7 animate-spin text-warning" />
        ) : (
          <RefreshCw className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {isRunning ? 'AI 正在优化内容' : '任务排队中'}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        任务「{task.title}」当前状态为
        <RewriteStatusBadge status={task.status} className="mx-1" />
        {isRunning
          ? 'AI 正在优化内容，完成后将自动展示结果。'
          : '系统将尽快开始处理，请稍候。'}
      </p>
      {hasOutput && (
        <p className="mt-3 text-xs text-muted-foreground">
          已有历史版本结果，将在新版本生成后自动刷新。
        </p>
      )}
      <div className="mt-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">返回历史</Link>
        </Button>
      </div>
    </div>
  )
}

// ===== 任务失败视图 =====
function TaskFailedView({
  task,
  hasOutput,
  onRetry,
  retrying,
}: {
  task: NonNullable<ReturnType<typeof useTaskDetail>['data']>
  hasOutput: boolean
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <div className="workspace flex flex-col items-center justify-center pt-24 pb-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">任务改写失败</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        任务「{task.title}」执行失败，当前状态为
        <RewriteStatusBadge status={task.status} className="mx-1" />
      </p>
      {task.error_message && (
        <div className="mt-4 w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left">
          <div className="text-eyebrow mb-1 text-destructive">失败原因</div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {task.error_message}
          </p>
        </div>
      )}
      {hasOutput && (
        <p className="mt-3 text-xs text-muted-foreground">
          已有历史版本结果，可在历史中查看。
        </p>
      )}
      <div className="mt-6 flex items-center gap-2">
        <Button size="sm" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {retrying ? '重试中…' : '重试'}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">返回历史</Link>
        </Button>
      </div>
    </div>
  )
}
