import type {
  ContentAssetType,
  EvidenceLevel,
  FactType,
  OutputLength,
  Perspective,
  Platform,
  ReviewStatus,
  SourcePolicy,
  SourceType,
  TaskStatus,
} from '@/types'

/** P0 严格 4 个平台，不出现其他平台（旧值，仅用于历史任务兼容展示） */
export const PLATFORMS: { value: Platform; description: string }[] = [
  { value: '官网文章', description: '默认。长文，强调结构化与 Schema' },
  { value: '公众号', description: '中等长度，段落短，弱化 Markdown' },
  { value: '知乎问答', description: '问答结构，定义句/对比句优先' },
  { value: '小红书', description: '短文，标签化，口语化但不编造' },
]

/**
 * P0 启用的 6 类内容资产类型（用户可见的一级生成目标）。
 * 取代旧 PLATFORMS 作为新建任务的选项来源。
 */
export const CONTENT_ASSET_TYPES: {
  value: ContentAssetType
  /** 一句话短说明（chip tooltip / 副文案） */
  shortDesc: string
  /** 较长说明（高级设置 / 帮助文案） */
  description: string
}[] = [
  {
    value: '自有官网内容',
    shortDesc: '用于官网发布和 AI 抓取引用。',
    description: '用于官网、帮助中心、知识库页面，强化 AI 可抓取、可理解、可引用的品牌事实。',
  },
  {
    value: '新闻通稿 / 权威背书稿',
    shortDesc: '用于正式对外传播和媒体转载。',
    description: '用于品牌发布、产品发布、合作动态和对外传播，语气正式克制，适合媒体转载或公关发布。',
  },
  {
    value: '行业垂媒稿',
    shortDesc: '用于行业媒体和垂直内容场景。',
    description: '用于行业媒体、垂直媒体或产业内容场景，让品牌进入行业语境。',
  },
  {
    value: '问答型内容',
    shortDesc: '用于 FAQ、知乎和 AI 问答素材。',
    description: '用于知乎、FAQ、搜索问答和 AI 问答素材，覆盖用户真实决策问题。',
  },
  {
    value: '案例 / 客户故事',
    shortDesc: '用于证明项目价值和服务结果。',
    description: '用于客户案例、服务案例、项目复盘和成功故事，证明品牌真实解决过问题。',
  },
  {
    value: '企业自媒体稿',
    shortDesc: '用于公众号、企业号和品牌动态。',
    description: '用于公众号、企业号、品牌动态等自媒体渠道，提升可读性和传播表达。',
  },
]

/** P0 UI 展示前 5 个视角，其余 4 个折叠 */
export const PERSPECTIVES_PRIMARY: Perspective[] = [
  '品牌方',
  '第三方',
  '用户/客户',
  '媒体/新闻',
  '内部/员工',
]

export const PERSPECTIVES_MORE: Perspective[] = [
  '合作商',
  '投资者',
  '政府/监管',
  '学术/科研',
]

export const SOURCE_POLICIES: { value: SourcePolicy; label: string; description: string }[] = [
  {
    value: 'use_provided_only',
    label: '仅使用提供的',
    description: '只基于品牌事实库的内容生成，不引入任何外部信息',
  },
  {
    value: 'allow_external_sources',
    label: '允许外部',
    description: '允许引用公开权威来源，但仍以品牌事实为准',
  },
  {
    value: 'mark_missing_sources',
    label: '标记缺失来源',
    description: '识别缺失证据并在结果中标注，不编造',
  },
]

export const OUTPUT_LENGTHS: { value: OutputLength; label: string; hint: string }[] = [
  { value: 'short', label: '短', hint: '约 800-1200 字' },
  { value: 'standard', label: '标准', hint: '约 1500-2500 字' },
  { value: 'long', label: '长', hint: '约 3000-5000 字' },
]

export const FACT_TYPES: { value: FactType; label: string; color: string }[] = [
  { value: 'brand', label: '品牌', color: 'primary' },
  { value: 'product', label: '产品', color: 'info' },
  { value: 'case', label: '案例', color: 'success' },
  { value: 'data', label: '数据', color: 'warning' },
  { value: 'certification', label: '认证', color: 'info' },
  { value: 'other', label: '其他', color: 'muted' },
]

export const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'official', label: '官方' },
  { value: 'third_party_report', label: '第三方报告' },
  { value: 'user_review', label: '用户评价' },
  { value: 'internal_data', label: '内部数据' },
  { value: 'public_data', label: '公开数据' },
  { value: 'unspecified', label: '未指定' },
]

export const EVIDENCE_LEVELS: {
  value: EvidenceLevel
  label: string
  color: 'success' | 'warning' | 'muted' | 'destructive'
  weight: number
}[] = [
  { value: 'conclusive', label: '确凿', color: 'success', weight: 5 },
  { value: 'strong', label: '强', color: 'success', weight: 4 },
  { value: 'moderate', label: '中', color: 'warning', weight: 3 },
  { value: 'weak', label: '弱', color: 'muted', weight: 2 },
  { value: 'anecdotal', label: '传闻', color: 'muted', weight: 1 },
]

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: 'muted' | 'warning' | 'success' | 'destructive'; dot: string }
> = {
  pending: { label: '待处理', color: 'muted', dot: 'bg-muted-foreground' },
  running: { label: '进行中', color: 'warning', dot: 'bg-warning animate-pulse' },
  completed: { label: '已完成', color: 'success', dot: 'bg-success' },
  failed: { label: '失败', color: 'destructive', dot: 'bg-destructive' },
}

export const REVIEW_STATUS_META: Record<
  ReviewStatus,
  {
    label: string
    color: 'success' | 'warning' | 'destructive' | 'info'
    description: string
  }
> = {
  ready: { label: '可发布', color: 'success', description: '事实准确、实体一致、无编造内容' },
  review: {
    label: '建议检查',
    color: 'warning',
    description: '主体可信，但存在部分需要人工确认的内容',
  },
  needs_material: {
    label: '需补充材料',
    color: 'destructive',
    description: '存在硬阻断或缺失关键证据，不可直接发布',
  },
  exported: { label: '已导出', color: 'info', description: '已导出 Rewrite Package' },
}

/** 6 维 GEO Scorecard 维度名称（与后端 score-and-diagnose.md 对齐） */
export const SCORE_DIMENSIONS = [
  '事实密度',
  '结构清晰度',
  '实体一致性',
  '来源权威性',
  'AI 触发覆盖',
  'Schema 就绪度',
] as const

export const PRIORITY_META: Record<
  'high' | 'medium' | 'low',
  { label: string; color: 'destructive' | 'warning' | 'muted' }
> = {
  high: { label: '高', color: 'destructive' },
  medium: { label: '中', color: 'warning' },
  low: { label: '低', color: 'muted' },
}
