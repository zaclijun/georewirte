import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Loader2,
  Info,
  Upload,
  Link2,
  ChevronDown,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  ClipboardPaste,
} from 'lucide-react'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RewriteConfigPanel, type RewriteConfig } from '@/components/rewrite'
import { MarkdownRenderer } from '@/components/common'
import { useProject } from '@/hooks/useProjects'
import { useBrandFacts } from '@/hooks/useBrandFacts'
import { useCreateTask } from '@/hooks/useRewriteTasks'
import { useWorkspaceType } from '@/hooks/useWorkspaceType'
import { useModelConfigs } from '@/hooks/useModelConfigs'
import { useSettingsDialog } from '@/context/SettingsDialogContext'
import { mockBrandFacts, mockProjects } from '@/mock/data'
import { rewriteTaskApi, type TaskCreateInput } from '@/services/api'
import {
  computeContentMetrics,
  formatMetricsLine,
  type ContentMetrics,
} from '@/lib/contentMetrics'
import { getDefaultAssetTypesByWorkspaceType } from '@/common/workspace'
import { cn } from '@/lib/utils'
import type { ContentAssetType } from '@/types'
// mammoth 浏览器端入口，用于解析 .docx
import mammoth from 'mammoth/mammoth.browser'

/** 各工作区类型的知识库提示文案 */
const REWRITE_HINT = {
  brand:
    '本次生成将优先参考品牌知识库中的品牌事实、产品服务、案例和可信来源。',
  professional:
    '本次生成将优先参考专业知识库中的服务领域、专家介绍、典型案例、合规边界和专业依据。',
  media:
    '本次生成将优先参考账号知识库中的账号定位、读者画像、内容风格、栏目方向和常用信源。',
  agency:
    '本次生成将优先参考客户知识库中的客户资料、交付目标、审核偏好和风险边界。',
  unknown:
    '本次生成将优先参考当前知识库中的事实、案例与可信来源。',
} as const

const EMPTY_KB_HINT =
  '当前知识库还不完整，你仍然可以先优化内容。系统会在结果中提示需要补充的事实和来源。'

/** 内容资产类型短说明（右侧操作卡 chip tooltip 用，来源于 constants） */
const ASSET_TYPE_SHORT_DESC: Record<ContentAssetType, string> = {
  自有官网内容: '用于官网发布和 AI 抓取引用。',
  '新闻通稿 / 权威背书稿': '用于正式对外传播和媒体转载。',
  行业垂媒稿: '用于行业媒体和垂直内容场景。',
  问答型内容: '用于 FAQ、知乎和 AI 问答素材。',
  '案例 / 客户故事': '用于证明项目价值和服务结果。',
  企业自媒体稿: '用于公众号、企业号和品牌动态。',
}

/** 全部可选内容资产类型（右侧操作卡 chip 渲染顺序，P0 启用 6 类） */
const ALL_ASSET_TYPES: ContentAssetType[] = [
  '自有官网内容',
  '新闻通稿 / 权威背书稿',
  '行业垂媒稿',
  '问答型内容',
  '案例 / 客户故事',
  '企业自媒体稿',
]

/** 任务模式（仅内部 state，UI 不再展示模式卡片） */
type TaskMode = 'diagnose' | 'direct'

/** 文章输入来源 */
type ArticleSource = 'manual' | 'txt' | 'markdown' | 'html' | 'docx'

/** 导入方式切换 */
type ImportTab = 'paste' | 'upload' | 'link'

/** 前端预诊断结果（启发式，非 LLM 深度诊断） */
interface DiagnosisResult {
  readiness: 'ready' | 'review' | 'needs_material'
  issues: { severity: 'high' | 'medium' | 'low'; text: string }[]
  sourceGaps: string[]
  suggestedAction: string
}

/** 草稿暂存结构 */
interface ArticleDraft {
  title: string
  body: string
  sourceType: ArticleSource
  updatedAt: string
}

const ACCEPTED_FILE_EXT = ['.docx', '.txt', '.md', '.markdown', '.html', '.htm']
const ACCEPTED_FILE_MIME = [
  'text/plain',
  'text/markdown',
  'text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * 简单剥离 HTML 标签：提取 body 文本，去除 script/style，再剥离剩余标签。
 * 仅用于 P0 文章导入，不做完整 DOM 解析。
 */
function stripHtmlTags(html: string): string {
  // 去掉 script / style 块
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  // 尝试提取 body
  const bodyMatch = noStyle.match(/<body[\s\S]*?<\/body>/i)
  const fragment = bodyMatch ? bodyMatch[0] : noStyle
  // 块级标签转换行
  const withBreaks = fragment.replace(/<\/(p|div|section|article|h[1-6]|li|br|tr)>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, ' ')
  // 解码常见实体
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return decoded.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/** 从 HTML 中尝试提取 <title> */
function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return null
  const t = m[1].replace(/\s+/g, ' ').trim()
  return t.length > 0 ? t : null
}

/** 读取上传文件为文本 */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

/** 读取上传文件为 ArrayBuffer（用于 .docx 解析） */
function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** 判断文件是否为 P0 支持的类型（.docx / .txt / .md / .html） */
function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (ACCEPTED_FILE_EXT.some((ext) => name.endsWith(ext))) return true
  if (file.type && ACCEPTED_FILE_MIME.includes(file.type)) return true
  return false
}

/** 判断是否为 .doc（旧版 Word，不支持） */
function isLegacyDoc(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.doc')
}

/** 判断是否为 PDF（不支持） */
function isPdf(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.pdf')
}

/** 根据文件名推断来源类型 */
function inferSource(file: File): ArticleSource {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html'
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown'
  return 'txt'
}

/**
 * 使用 mammoth 解析 .docx，返回纯文本。
 * mammoth 输出 HTML 后再剥离标签，保留段落换行。
 * 失败时抛出异常，由调用方捕获并提示用户。
 */
async function parseDocxToText(file: File): Promise<{ text: string; title: string | null }> {
  const arrayBuffer = await readAsArrayBuffer(file)
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value ?? ''
  const text = stripHtmlTags(html)
  // 首行非空且较短时作为标题候选
  const firstLine = text.split('\n').map((s) => s.trim()).find((s) => s.length > 0) ?? ''
  const title = firstLine && firstLine.length <= 60 ? firstLine : null
  return { text, title }
}

const SOURCE_LABEL: Record<ArticleSource, string> = {
  manual: '手动粘贴',
  txt: 'TXT',
  markdown: 'Markdown',
  html: 'HTML',
  docx: 'Word',
}

/**
 * 前端启发式预诊断：基于内容规模统计与知识库状态给出快速判断。
 * 注意：这不是 LLM 深度诊断，深度诊断（6 维评分 + 来源缺口 + 改写策略）
 * 会在「生成内容资产」任务流程中由后端 score-and-diagnose 执行。
 */
function diagnoseArticle(
  metrics: ContentMetrics,
  content: string,
  kbEmpty: boolean,
): DiagnosisResult {
  const issues: DiagnosisResult['issues'] = []
  const sourceGaps: string[] = []

  if (metrics.charCount < 300) {
    issues.push({
      severity: 'high',
      text: '内容较短，建议补充背景、原理、数据与案例，提升事实密度（Fact Density）。',
    })
  }

  if (metrics.headingCount === 0 && metrics.charCount > 0) {
    issues.push({
      severity: 'medium',
      text: '未检测到 Markdown 标题层级，AI 难以抽取核心观点。建议增加 H2/H3 结构。',
    })
  }

  if (metrics.paragraphCount > 0 && metrics.paragraphCount < 3) {
    issues.push({
      severity: 'medium',
      text: '段落数较少，建议拆分为「问题→原理→数据→结论」的模块化结构。',
    })
  }

  // 数据信号：百分比 / 年份 / 万 / 亿
  const hasDataSignal = /\d+(\.\d+)?\s*%|20\d{2}年|[0-9]\d{1,3}万|[0-9]\d{1,3}亿/.test(content)
  if (metrics.charCount > 0 && !hasDataSignal) {
    issues.push({
      severity: 'medium',
      text: '未检测到明显的数据 / 百分比 / 年份，建议补充 2025-2026 客观数据。',
    })
  }

  // 来源信号：来源 / 报告 / 研究 / 数据 / 根据 / 显示
  const hasSourceSignal = /(来源|报告|研究|数据|根据|显示|统计|调查)/.test(content)
  if (metrics.charCount > 0 && !hasSourceSignal) {
    issues.push({
      severity: 'medium',
      text: '未检测到来源引用，建议补充权威来源以增强机器可验证性（Cross-Source Validation）。',
    })
    sourceGaps.push('原文缺少可引用的权威来源（研究报告、官方数据、第三方机构）')
  }

  if (kbEmpty) {
    issues.push({
      severity: 'high',
      text: '品牌知识库为空，建议先补充品牌事实、产品、案例与来源，以强化实体权威。',
    })
    sourceGaps.push('知识库缺少品牌事实 / 产品 / 案例条目')
  }

  const highCount = issues.filter((i) => i.severity === 'high').length
  const readiness: DiagnosisResult['readiness'] =
    highCount > 0 ? 'needs_material' : issues.length > 0 ? 'review' : 'ready'

  return {
    readiness,
    issues,
    sourceGaps,
    suggestedAction: '建议开始优化',
  }
}

/**
 * NewRewritePage - 文章工作台（Article Workbench，单页工作台）
 *
 * 从「三步向导」压缩为「单页工作台」：
 *   左侧文章编辑区（导入 / 标题 / 正文 / 编辑预览切换 / 字数统计）
 *   右侧生成操作卡（内容资产类型 chips / 先诊断 / 生成内容资产 / 高级设置 / 知识库提示）
 *
 * 取消：1/2/3 步骤条、独立确认母稿步骤、任务模式卡片、平台大卡片。
 * 用户粘贴或上传文章后即可直接点「生成内容资产」。
 *
 * 内容资产类型（P0 启用 6 类）：自有官网内容 / 新闻通稿 / 权威背书稿 / 行业垂媒稿 / 问答型内容 / 案例 / 客户故事 / 企业自媒体稿
 *
 * 数据流保持不变：
 *   - 单类型：useCreateTask 创建 1 个 task，跳转 /tasks/:taskId/result
 *   - 多类型：为每类资产分别调用 POST /projects/:id/tasks，跳转 /multi-platform-result?taskIds=...
 *   - 多类型使用 Promise.allSettled 处理部分失败
 *
 * 资产类型与 need_schema 默认规则：
 *   - 自有官网内容：need_schema=true
 *   - 其它资产类型：need_schema=false
 *   - 默认资产类型按 workspace_type 设置（用户手动修改后不被覆盖）
 *
 * 底层兼容：复用 publish_platform 字段传递新资产类型值（后端无枚举限制，max_length=20）。
 */
export function NewRewritePage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()

  const { data: projectData, isError: projectErr } = useProject(projectId)
  const project =
    projectData ?? (projectErr ? mockProjects.find((p) => p.id === projectId) : undefined)

  const { type: wsType } = useWorkspaceType(projectId)

  const { data: factsData, isError: factsErr } = useBrandFacts(projectId)
  const facts = useMemo(() => {
    if (factsData) return factsData.filter((f) => f.is_active)
    if (factsErr) return mockBrandFacts.filter((f) => f.project_id === projectId && f.is_active)
    return []
  }, [factsData, factsErr, projectId])

  const kbEmpty = facts.length === 0
  const hint = wsType ? REWRITE_HINT[wsType] : REWRITE_HINT.unknown

  const createMut = useCreateTask(projectId)

  // ===== 模型选择 =====
  const { data: modelConfigs } = useModelConfigs()
  const { openDialog: openSettings } = useSettingsDialog()
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  // 兼容 enabled 字段缺失：仅明确为 false 才视为禁用（旧数据可能无该字段）
  const enabledModels = useMemo(
    () => (modelConfigs ?? []).filter((m) => m.enabled !== false),
    [modelConfigs],
  )

  // 默认选中 is_default 模型；无默认时选中第一个启用模型
  useEffect(() => {
    if (enabledModels.length === 0) return
    if (!selectedModelId) {
      const def = enabledModels.find((m) => m.is_default)
      setSelectedModelId(def?.id ?? enabledModels[0].id)
      return
    }
    // 当前选中模型已不在启用列表中（被删除/禁用），重置为默认或第一个
    const stillExists = enabledModels.some((m) => m.id === selectedModelId)
    if (!stillExists) {
      const def = enabledModels.find((m) => m.is_default)
      setSelectedModelId(def?.id ?? enabledModels[0].id)
    }
  }, [enabledModels, selectedModelId])

  // ===== 文章工作台状态（单页，无步骤机） =====
  const [importTab, setImportTab] = useState<ImportTab>('paste')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceType, setSourceType] = useState<ArticleSource>('manual')
  const [titleAutoFilled, setTitleAutoFilled] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [config, setConfig] = useState<RewriteConfig>({
    // 内部字段名仍叫 platforms（不改底层契约），但值已改为内容资产类型
    platforms: getDefaultAssetTypesByWorkspaceType(wsType),
    perspective: project?.default_perspective ?? '品牌方',
    sourcePolicy: 'mark_missing_sources',
    outputLength: 'standard',
    needSchema: true,
    brandFactIds: [],
  })
  // taskMode 保留内部 state，由按钮触发；默认 direct，不再强推先诊断
  const [taskMode, setTaskMode] = useState<TaskMode>('direct')
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [draftBanner, setDraftBanner] = useState<ArticleDraft | null>(null)
  const [fileMsg, setFileMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // 用户手动修改内容资产类型后，不再被 workspace_type 默认值覆盖
  const platformsTouchedRef = useRef(false)

  // ===== 内容规模统计（实时） =====
  const metrics = useMemo(() => computeContentMetrics(content), [content])
  const hasArticle = title.trim().length > 0 && content.trim().length > 0

  // ===== 草稿暂存：进入页面时检测未完成草稿 =====
  const draftKey = `article_draft:${projectId}`

  useEffect(() => {
    // 不自动覆盖当前已有输入（如 HMR 重载）
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as ArticleDraft
      if (
        draft &&
        (draft.title?.trim() || draft.body?.trim()) &&
        typeof draft.updatedAt === 'string'
      ) {
        setDraftBanner(draft)
      }
    } catch {
      // 忽略损坏的草稿
    }
    // 仅在 projectId 变化时检测一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ===== 草稿暂存：输入变化时自动保存（防抖） =====
  useEffect(() => {
    if (!title.trim() && !content.trim()) return
    const timer = setTimeout(() => {
      try {
        const draft: ArticleDraft = {
          title,
          body: content,
          sourceType,
          updatedAt: new Date().toISOString(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draft))
      } catch {
        // 忽略写入失败（隐私模式等）
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [title, content, sourceType, draftKey])

  // ===== wsType 异步加载后同步默认内容资产类型（用户手动修改后不被覆盖） =====
  useEffect(() => {
    if (platformsTouchedRef.current) return
    setConfig((c) => ({ ...c, platforms: getDefaultAssetTypesByWorkspaceType(wsType) }))
  }, [wsType])

  const restoreDraft = (draft: ArticleDraft) => {
    setTitle(draft.title ?? '')
    setContent(draft.body ?? '')
    setSourceType(draft.sourceType ?? 'manual')
    setDraftBanner(null)
  }

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
    setDraftBanner(null)
  }

  // ===== 文件上传处理 =====
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (file: File) => {
    setFileMsg(null)

    // 优先判定明确不支持的类型，给出针对性提示
    if (isLegacyDoc(file)) {
      setFileMsg('暂不支持 .doc 格式，请先另存为 .docx 后上传。')
      return
    }
    if (isPdf(file)) {
      setFileMsg(
        '当前版本暂不支持 PDF 解析，请复制正文粘贴，或转为 Word / TXT / HTML 后上传。',
      )
      return
    }
    if (!isAcceptedFile(file)) {
      setFileMsg('不支持该文件格式。请上传 .docx / .txt / .md / .html，或直接粘贴正文。')
      return
    }

    setUploading(true)
    try {
      const src = inferSource(file)
      setTitleAutoFilled(false)
      if (src === 'docx') {
        // mammoth 浏览器端解析 .docx
        const { text, title: docxTitle } = await parseDocxToText(file)
        if (!text.trim()) {
          setFileMsg('Word 文档解析后正文为空，请确认文档内容或直接粘贴正文。')
          return
        }
        setContent(text)
        if (docxTitle && !title.trim()) {
          setTitle(docxTitle)
          setTitleAutoFilled(true)
        }
      } else {
        const raw = await readAsText(file)
        if (src === 'html') {
          const stripped = stripHtmlTags(raw)
          const htmlTitle = extractHtmlTitle(raw)
          setContent(stripped)
          if (htmlTitle && !title.trim()) {
            setTitle(htmlTitle)
            setTitleAutoFilled(true)
          }
        } else {
          setContent(raw)
        }
      }
      setSourceType(src)
      setImportTab('paste')
      setFileMsg(`已导入文件：${file.name}（${SOURCE_LABEL[src]}）`)
    } catch {
      setFileMsg('Word 文档解析失败，请复制正文后粘贴。')
    } finally {
      setUploading(false)
    }
  }

  // ===== 任务提交（保持原有多类型 Promise.allSettled 逻辑） =====
  // needSchema 仅对「自有官网内容」生效；其它资产类型按平台自动处理
  const resolveNeedSchema = (assetType: ContentAssetType): boolean => {
    if (assetType === '自有官网内容') return config.needSchema
    return false
  }

  const buildPayload = (assetType: ContentAssetType): TaskCreateInput => ({
    title: title.trim(),
    original_content: content,
    perspective: config.perspective,
    // 复用 publish_platform 字段传递新资产类型值（后端无枚举限制）
    publish_platform: assetType,
    source_policy: config.sourcePolicy,
    output_length: config.outputLength,
    need_schema: resolveNeedSchema(assetType),
    brand_fact_ids: config.brandFactIds,
    model_config_id: selectedModelId || undefined,
  })

  const submitting = createMut.isPending

  const handleSubmit = async () => {
    if (!hasArticle) return
    setErrorMsg(null)
    const assetTypes = config.platforms

    // 单类型：走原 mutation 流程
    if (assetTypes.length === 1) {
      createMut.mutate(buildPayload(assetTypes[0]), {
        onSuccess: (task) => {
          // 提交成功后清除草稿
          try {
            localStorage.removeItem(draftKey)
          } catch {
            // ignore
          }
          navigate(`/tasks/${task.id}/result`)
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '提交失败，请稍后重试'
          setErrorMsg(msg)
        },
      })
      return
    }

    // 多类型：并行创建 task，使用 Promise.allSettled 处理部分失败
    const results = await Promise.allSettled(
      assetTypes.map((assetType) => rewriteTaskApi.create(projectId, buildPayload(assetType))),
    )
    const createdIds: string[] = []
    const failedAssetTypes: ContentAssetType[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        createdIds.push(r.value.id)
      } else {
        failedAssetTypes.push(assetTypes[i])
      }
    })

    // 全部失败：不跳转，提示创建失败
    if (createdIds.length === 0) {
      setErrorMsg(`全部 ${assetTypes.length} 类内容资产任务创建失败，请稍后重试`)
      return
    }

    // 提交成功后清除草稿
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }

    // 部分或全部成功：跳转结果页
    navigate(`/multi-platform-result?taskIds=${createdIds.join(',')}`)

    // 部分失败：跳转后提示
    if (failedAssetTypes.length > 0) {
      setTimeout(() => {
        alert(
          `已创建 ${createdIds.length} 类内容资产任务，${failedAssetTypes.length} 类失败：${failedAssetTypes.join('、')}`,
        )
      }, 200)
    }
  }

  // ===== 诊断评分（前端启发式预诊断） =====
  const runDiagnosis = () => {
    if (!hasArticle) return
    setDiagnosing(true)
    setTaskMode('diagnose')
    // 模拟异步以便未来替换为真实 API 调用
    setTimeout(() => {
      setDiagnosis(diagnoseArticle(metrics, content, kbEmpty))
      setDiagnosing(false)
    }, 200)
  }

  // ===== 内容资产类型切换：用户手动修改后标记 touched，避免被 wsType 默认值覆盖 =====
  const toggleAssetType = (assetType: ContentAssetType) => {
    platformsTouchedRef.current = true
    const active = config.platforms.includes(assetType)
    const next = active
      ? config.platforms.filter((x) => x !== assetType)
      : [...config.platforms, assetType]
    // 至少保留 1 个类型，避免空选
    setConfig({ ...config, platforms: next.length > 0 ? next : config.platforms })
  }

  const assetTypeCount = config.platforms.length
  const submitLabel = submitting
    ? '提交中…'
    : assetTypeCount > 1
      ? `优化 ${assetTypeCount} 类内容`
      : '开始优化'

  const readOnlyMetrics = metrics

  return (
    <AppShell
      projectId={projectId}
      topBar={
        <TopBar
          breadcrumb={
            <Link
              to={`/projects/${projectId}`}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {project?.name ?? '工作区'}
            </Link>
          }
          title={
            <div className="flex flex-col gap-0.5">
              <h1 className="truncate text-[var(--tier-title)] font-semibold tracking-tight">
                文章工作台
              </h1>
              <p className="text-[11px] font-normal text-muted-foreground">
                导入一篇母稿，优化为适用于官网、媒体、问答、案例和企业自媒体的内容。
              </p>
            </div>
          }
        />
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ===== 左侧：文章编辑区 ===== */}
        <div className="workspace-stack-sm">
          {/* 草稿恢复提示 */}
          {draftBanner && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 leading-relaxed">
                检测到未完成草稿（最近更新：{formatDraftTime(draftBanner.updatedAt)}）。
                <button
                  type="button"
                  onClick={() => restoreDraft(draftBanner)}
                  className="ml-1 text-primary hover:underline"
                >
                  恢复
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="ml-2 text-muted-foreground hover:underline"
                >
                  丢弃
                </button>
              </div>
            </div>
          )}

          {/* 导入方式 + 文章编辑区 */}
          <Card className="flex flex-col gap-4 p-5">
            {/* 导入方式切换 */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-secondary/50 p-1">
              <ImportTabButton
                active={importTab === 'paste'}
                onClick={() => setImportTab('paste')}
                icon={<ClipboardPaste className="h-3.5 w-3.5" />}
                label="粘贴正文"
              />
              <ImportTabButton
                active={importTab === 'upload'}
                onClick={() => setImportTab('upload')}
                icon={<Upload className="h-3.5 w-3.5" />}
                label="上传文件"
              />
              <ImportTabButton
                active={importTab === 'link'}
                onClick={() => setImportTab('link')}
                icon={<Link2 className="h-3.5 w-3.5" />}
                label="粘贴链接"
              />
            </div>

            {/* 链接入口占位 */}
            {importTab === 'link' && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
                <Link2 className="mx-auto h-6 w-6 text-muted-foreground" />
                <div className="text-sm text-foreground">
                  网页链接和公众号链接解析将在后续版本支持。
                </div>
                <div className="text-xs text-muted-foreground">
                  当前请复制正文后粘贴，或上传 Word / TXT / HTML 文件。
                </div>
                <Button
                  variant="ghost"
                  className="mx-auto mt-1 w-fit"
                  size="sm"
                  onClick={() => setImportTab('paste')}
                >
                  切回粘贴正文
                </Button>
              </div>
            )}

            {/* 上传文件区 */}
            {importTab === 'upload' && (
              <div className="flex flex-col gap-3">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f) handleFileUpload(f)
                  }}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                  <div className="text-sm font-medium">
                    {uploading ? '正在解析文件…' : '点击选择文件或拖拽到此处'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    支持 .docx / .txt / .md / .html
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileUpload(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                {fileMsg && (
                  <div className="text-xs text-muted-foreground">{fileMsg}</div>
                )}
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  暂不支持 .doc / PDF / 扫描件。PDF 内容请先复制正文后粘贴，或转为 Word / TXT / HTML 后上传。
                </div>
              </div>
            )}

            {/* 文章标题 */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title">文章标题</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：智能客服平台产品介绍改写"
              />
              {titleAutoFilled && (
                <p className="text-[11px] text-muted-foreground">
                  已自动识别标题，可手动修改。
                </p>
              )}
            </div>

            {/* 文章正文 + 编辑/预览切换 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="original-content">文章正文</Label>
                <div className="flex items-center gap-1 rounded-md bg-secondary/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] transition-colors',
                      viewMode === 'edit'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] transition-colors',
                      viewMode === 'preview'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    预览
                  </button>
                </div>
              </div>
              {viewMode === 'edit' ? (
                <Textarea
                  id="original-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    '在此粘贴文章正文。\n\n建议结构：\n# 标题\n## 摘要\n## 核心内容\n## 行业背景\n## 结论\n\n可先诊断内容质量，再优化为多类内容。'
                  }
                  className="min-h-[360px] resize-y font-mono text-[13px] leading-relaxed"
                />
              ) : (
                <div className="min-h-[360px] overflow-y-auto rounded-lg border border-border bg-background px-4 py-3">
                  {content.trim() ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <div className="text-sm text-muted-foreground">正文为空，无法预览。</div>
                  )}
                </div>
              )}
              {/* 实时内容规模统计（常驻） */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {content.trim()
                  ? formatMetricsLine(readOnlyMetrics)
                  : '输入正文后将显示字数、段落、标题数与预计阅读时长'}
              </div>
              {fileMsg && importTab === 'paste' && (
                <div className="text-xs text-muted-foreground">{fileMsg}</div>
              )}
            </div>
          </Card>
        </div>

        {/* ===== 右侧：生成操作卡（sticky） ===== */}
        <div className="self-start lg:sticky lg:top-6">
          <Card className="flex flex-col gap-4 p-5">
            {/* 内容资产类型选择 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-eyebrow">内容资产类型</Label>
                {assetTypeCount > 1 && (
                  <span className="text-[11px] text-muted-foreground">
                    已选 {assetTypeCount} 类
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {ALL_ASSET_TYPES.map((t) => {
                  const active = config.platforms.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleAssetType(t)}
                      title={ASSET_TYPE_SHORT_DESC[t]}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-xs transition-all duration-200 ease-apple',
                        active
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-secondary/60',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded text-[9px]',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-background',
                        )}
                      >
                        {active ? '✓' : ''}
                      </span>
                      <span className="flex-1">{t}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {ASSET_TYPE_SHORT_DESC[t]}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {assetTypeCount > 1
                  ? `将为每类资产分别生成独立优化内容（${assetTypeCount} 次）。`
                  : '选择多个类型可一次性优化多类内容。'}
              </p>
            </section>

            {/* 模型选择 */}
            <div className="space-y-1.5">
              <Label className="text-eyebrow">模型</Label>
              {enabledModels.length > 0 ? (
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.display_name || m.model_id || '未命名模型'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed border-warning/40 bg-warning/5 p-3 text-xs">
                  <div className="text-warning">未配置模型</div>
                  <p className="mt-1 text-muted-foreground">请先在账户中心配置模型 API Key。</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => openSettings('models')}>
                    去配置模型
                  </Button>
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {errorMsg && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {/* 诊断结果（按钮上方） */}
            {diagnosis && (
              <DiagnosisPanel
                diagnosis={diagnosis}
                metrics={readOnlyMetrics}
                kbEmpty={kbEmpty}
              />
            )}

            {/* 操作按钮：开始优化（主） + 先诊断（次） */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={enabledModels.length === 0 || !hasArticle || submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {submitLabel}
              </Button>
              <Button
                variant="outline"
                onClick={runDiagnosis}
                disabled={!hasArticle || diagnosing}
                className="w-full"
              >
                {diagnosing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Stethoscope className="h-4 w-4" />
                )}
                先诊断
              </Button>
            </div>

            {/* 高级设置（折叠） */}
            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary/40"
              >
                <span>高级设置</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    showAdvanced && 'rotate-180',
                  )}
                />
              </button>
              {showAdvanced && (
                <div className="border-t border-border p-3">
                  <RewriteConfigPanel
                    value={config}
                    onChange={setConfig}
                    facts={facts}
                    hidePlatforms
                  />
                </div>
              )}
            </div>

            {/* 知识库提示 */}
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <div className="leading-relaxed">
                {hint}
                {kbEmpty && (
                  <div className="mt-1 text-muted-foreground">{EMPTY_KB_HINT}</div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

// ===== 子组件 =====

function ImportTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function DiagnosisPanel({
  diagnosis,
  metrics,
  kbEmpty,
}: {
  diagnosis: DiagnosisResult
  metrics: ContentMetrics
  kbEmpty: boolean
}) {
  const readinessMeta: Record<
    DiagnosisResult['readiness'],
    { label: string; color: string; icon: ReactNode }
  > = {
    ready: {
      label: '可发布',
      color: 'text-success',
      icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    },
    review: {
      label: '建议检查',
      color: 'text-warning',
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    },
    needs_material: {
      label: '需补充材料',
      color: 'text-destructive',
      icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    },
  }
  const meta = readinessMeta[diagnosis.readiness]

  return (
    <div className="flex flex-col gap-3">
      {/* 综合评分 / 发布就绪度 */}
      <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2.5">
        {meta.icon}
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">发布就绪度</div>
          <div className={cn('text-sm font-medium', meta.color)}>{meta.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">内容规模</div>
          <div className="text-xs text-foreground">
            {metrics.charCount.toLocaleString()} 字 · {metrics.paragraphCount} 段
          </div>
        </div>
      </div>

      {/* 主要问题 */}
      {diagnosis.issues.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-eyebrow">主要问题</div>
          <ul className="flex flex-col gap-1.5">
            {diagnosis.issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-medium',
                    issue.severity === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : issue.severity === 'medium'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                </span>
                <span className="leading-relaxed text-foreground/80">{issue.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 来源缺口 */}
      {diagnosis.sourceGaps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-eyebrow">来源缺口</div>
          <ul className="flex flex-col gap-1.5">
            {diagnosis.sourceGaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="leading-relaxed text-foreground/80">{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 建议动作 */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
        <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1">
          <span className="text-muted-foreground">建议动作：</span>
          <span className="font-medium text-primary">{diagnosis.suggestedAction}</span>
        </div>
        {kbEmpty && (
          <span className="text-[11px] text-muted-foreground">
            知识库为空，建议先补充后再生成
          </span>
        )}
      </div>
    </div>
  )
}

function formatDraftTime(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return '未知时间'
  }
}
