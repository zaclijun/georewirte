/**
 * Platform-aware Scorecard 内容资产评分卡配置
 *
 * 核心原则：Schema 只属于官网 / 自有网页场景。
 * 其它资产类型不展示 Schema 就绪度，也不因缺 Schema 扣分。
 *
 * P0 内容资产类型重构后，6 类资产使用不同的评分维度集合：
 *   自有官网内容           → GEO 信源就绪度（6 维雷达，含 Schema 就绪度）
 *   新闻通稿 / 权威背书稿   → 权威传播就绪度（6 维条形）
 *   行业垂媒稿             → 行业语境适配度（6 维条形）
 *   问答型内容             → 问答覆盖度（6 维条形）
 *   案例 / 客户故事         → 案例可信度（6 维条形）
 *   企业自媒体稿           → 自媒体发布就绪度（6 维条形）
 *
 * 旧平台值（官网文章/公众号/知乎问答/小红书）仍保留配置，用于历史任务展示。
 * 小红书已下线，仅历史任务可查看，不允许重新生成。
 *
 * 数据兼容策略：
 *   - 后端目前仍返回旧的 6 维分数（事实密度 / 结构清晰度 / 实体一致性 / 来源权威性 / AI 触发覆盖 / Schema 就绪度）
 *   - 自有官网内容可直接使用后端维度
 *   - 其它资产类型做维度映射 + 兜底，部分类型用 PlatformPublishGuide 字段完整度做 checklist
 *   - 字段完整度估算时，文案必须显示「基于发布建议完整度估算」，不得声称是完整 GEO Score
 */

import type { ContentScore, RewriteOutput, SchemaSuggestion } from '@/types'

// ===== 平台评分卡类型 =====
export type PlatformScorecardType =
  | 'web_geo'
  | 'wechat_publish'
  | 'xhs_visual'
  | 'zhihu_answer'
  | 'press_authority'
  | 'industry_media'
  | 'case_story'

// ===== 评分卡展示方式 =====
export type ScorecardRenderType = 'radar' | 'bars' | 'checklist'

// ===== 维度定义 =====
export interface ScoreDimension {
  key: string
  label: string
  description: string
}

// ===== 平台评分卡配置 =====
export interface PlatformScorecardConfig {
  type: PlatformScorecardType
  /** 卡片标题，如「GEO Web Scorecard」「公众号发布就绪度」 */
  title: string
  /** 副标题，说明评分目标 */
  subtitle: string
  /** 改前/改后分数的统一文案 */
  beforeLabel: string
  afterLabel: string
  /** Quality Gate 下降时的文案 */
  declineTitle: string
  /** 渲染方式 */
  renderType: ScorecardRenderType
  /** 维度集合 */
  dimensions: ScoreDimension[]
  /** 是否允许展示 Schema 就绪度维度 */
  allowSchemaDimension: boolean
  /** 是否基于发布建议完整度估算（非真实评分） */
  estimatedFromGuide: boolean
}

// ===== 4 个平台的配置 =====
export const PLATFORM_SCORECARDS: Record<string, PlatformScorecardConfig> = {
  官网文章: {
    type: 'web_geo',
    title: 'GEO Web Scorecard',
    subtitle: '评估官网文章的 AI 可理解、可引用和结构化就绪度。',
    beforeLabel: '原文评分',
    afterLabel: '内容包评分',
    declineTitle: 'GEO 评分下降，需检查',
    renderType: 'radar',
    allowSchemaDimension: true,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'fact_density', label: '事实密度', description: '具体事实、数据、案例、定义、参数的含量' },
      { key: 'structural_clarity', label: '结构清晰度', description: '层级结构、逻辑连贯性、标题语义化程度' },
      { key: 'entity_consistency', label: '实体一致性', description: '品牌名、产品名、术语、概念的统一性' },
      { key: 'source_authority', label: '来源可信度', description: '引用来源的可信度和多源验证程度' },
      { key: 'ai_trigger_coverage', label: 'AI 触发覆盖', description: 'AI Trigger Pattern 的使用频率和质量' },
      { key: 'schema_readiness', label: 'Schema 就绪度', description: '结构化解析为 JSON-LD 的难易程度' },
    ],
  },

  公众号: {
    type: 'wechat_publish',
    title: '公众号发布就绪度',
    subtitle: '评估公众号文章的标题、首屏、移动端阅读和传播适配。',
    beforeLabel: '原文评分',
    afterLabel: '内容包评分',
    declineTitle: '发布就绪度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'title_attraction', label: '标题吸引力', description: '打开率、关键词、情绪与好奇心的平衡' },
      { key: 'opening_hook', label: '首屏导语', description: '前 3 行是否抓住读者、是否结论先行' },
      { key: 'mobile_readability', label: '移动端可读性', description: '段落短、节奏感、视觉留白' },
      { key: 'structure_rhythm', label: '结构节奏', description: '小标题、列表、金句的分布' },
      { key: 'share_value', label: '转发收藏价值', description: '信息增量、可复用性、社交货币' },
      { key: 'risk_control', label: '表达风险控制', description: '合规边界、广告法、敏感表达' },
    ],
  },

  小红书: {
    type: 'xhs_visual',
    title: '小红书图文就绪度',
    subtitle: '评估小红书图文包的封面、卡片、Caption、标签和合规风险。',
    beforeLabel: '原文评分',
    afterLabel: '内容包评分',
    declineTitle: '发布就绪度下降，需检查',
    renderType: 'checklist',
    allowSchemaDimension: false,
    estimatedFromGuide: true,
    dimensions: [
      { key: 'cover_clickability', label: '封面点击力', description: '封面主文案、副文案、画面方向' },
      { key: 'card_completeness', label: '图文卡片完整度', description: '6-8 张卡片脚本是否齐全' },
      { key: 'scene_resonance', label: '场景共鸣', description: '是否切入具体场景与读者痛点' },
      { key: 'caption_readability', label: 'Caption 可读性', description: '正文口语化、段落短、信息密度' },
      { key: 'tag_match', label: '标签话题匹配', description: '标签与话题覆盖搜索流量' },
      { key: 'risk_control', label: '合规风险控制', description: '风险提示、敏感词、广告法边界' },
    ],
  },

  知乎问答: {
    type: 'zhihu_answer',
    title: '知乎回答就绪度',
    subtitle: '评估知乎回答的问题契合、论证深度和搜索长尾价值。',
    beforeLabel: '原文评分',
    afterLabel: '内容包评分',
    declineTitle: '发布就绪度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: true,
    dimensions: [
      { key: 'question_fit', label: '问题契合度', description: '是否直击问题、不跑题' },
      { key: 'conclusion_first', label: '结论先行', description: '首句/首段是否给出明确答案' },
      { key: 'argument_depth', label: '论证深度', description: '推理链条、原理解释、机制分析' },
      { key: 'evidence_support', label: '事实依据', description: '数据、案例、来源支撑' },
      { key: 'long_tail_coverage', label: '搜索长尾覆盖', description: '相关问法、长尾关键词覆盖' },
      { key: 'risk_handling', label: '争议与风险处理', description: '常见误区、争议点、风险提示' },
    ],
  },

  // ===== P0 内容资产类型（6 类，新值） =====

  自有官网内容: {
    type: 'web_geo',
    title: 'GEO 信源就绪度',
    subtitle: '评估自有官网内容的 AI 可理解、可引用和结构化就绪度。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: 'GEO 信源就绪度下降，需检查',
    renderType: 'radar',
    allowSchemaDimension: true,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'fact_density', label: '事实密度', description: '具体事实、数据、案例、定义、参数的含量' },
      { key: 'structural_clarity', label: '结构清晰度', description: '层级结构、逻辑连贯性、标题语义化程度' },
      { key: 'entity_consistency', label: '实体一致性', description: '品牌名、产品名、术语、概念的统一性' },
      { key: 'source_authority', label: '来源可信度', description: '引用来源的可信度和多源验证程度' },
      { key: 'ai_trigger_coverage', label: 'AI 触发覆盖', description: 'AI Trigger Pattern 的使用频率和质量' },
      { key: 'schema_readiness', label: 'Schema 就绪度', description: '结构化解析为 JSON-LD 的难易程度' },
    ],
  },

  '新闻通稿 / 权威背书稿': {
    type: 'press_authority',
    title: '权威传播就绪度',
    subtitle: '评估新闻通稿的导语、关键事实、引用建议和媒体发布合规性。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: '权威传播就绪度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'headline_clarity', label: '标题与导语', description: '新闻标题是否清晰、导语是否概括核心事实' },
      { key: 'fact_precision', label: '关键事实精度', description: '时间、人物、数据、机构等事实的准确与可验证' },
      { key: 'official_voice', label: '官方语气适配', description: '正式、克制、少营销感、符合公关发布规范' },
      { key: 'citation_support', label: '引用建议', description: '可引用的关键事实、数据来源标注' },
      { key: 'media_compliance', label: '媒体合规', description: '不冒充媒体报道、不伪造权威背书、风险提示' },
      { key: 'background_completeness', label: '背景完整性', description: '品牌/项目背景、上下文是否充分' },
    ],
  },

  行业垂媒稿: {
    type: 'industry_media',
    title: '行业语境适配度',
    subtitle: '评估行业垂媒稿的行业视角、痛点切入和场景化表达。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: '行业语境适配度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'industry_angle', label: '行业视角', description: '是否进入行业语境、关联行业趋势' },
      { key: 'pain_point_fit', label: '痛点切入', description: '是否触及用户真实痛点与场景' },
      { key: 'brand_integration', label: '品牌切入', description: '品牌/产品/服务是否自然带入、非硬广' },
      { key: 'scene_expression', label: '场景化表达', description: '具体场景、案例、数据的场景化呈现' },
      { key: 'professionalism', label: '专业度', description: '行业术语、逻辑深度、专业但不晦涩' },
      { key: 'risk_control', label: '合规风险', description: '不编造行业数据、不虚构第三方评价' },
    ],
  },

  问答型内容: {
    type: 'zhihu_answer',
    title: '问答覆盖度',
    subtitle: '评估问答型内容的问题契合、论证深度和搜索长尾价值。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: '问答覆盖度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: true,
    dimensions: [
      { key: 'question_fit', label: '问题契合度', description: '是否直击问题、不跑题' },
      { key: 'conclusion_first', label: '结论先行', description: '首句/首段是否给出明确答案' },
      { key: 'argument_depth', label: '论证深度', description: '推理链条、原理解释、机制分析' },
      { key: 'evidence_support', label: '事实依据', description: '数据、案例、来源支撑' },
      { key: 'long_tail_coverage', label: '搜索长尾覆盖', description: '相关问法、长尾关键词覆盖' },
      { key: 'risk_handling', label: '争议与风险处理', description: '常见误区、争议点、风险提示' },
    ],
  },

  '案例 / 客户故事': {
    type: 'case_story',
    title: '案例可信度',
    subtitle: '评估案例/客户故事的真实性、问题-解决方案-结果结构和可复用经验。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: '案例可信度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'background_clarity', label: '背景清晰度', description: '客户/项目背景是否具体、可识别' },
      { key: 'problem_definition', label: '问题界定', description: '问题是否真实、具体、可量化' },
      { key: 'solution_specificity', label: '方案具体性', description: '解决方案、执行动作是否具体' },
      { key: 'result_evidence', label: '结果证据', description: '结果数据是否真实、可验证、非虚构' },
      { key: 'reusability', label: '可复用经验', description: '可复用经验、方法论提炼' },
      { key: 'fact_completeness', label: '事实完整度', description: '缺失事实是否标注待补充' },
    ],
  },

  企业自媒体稿: {
    type: 'wechat_publish',
    title: '自媒体发布就绪度',
    subtitle: '评估企业自媒体稿的标题、首屏、移动端阅读和传播适配。',
    beforeLabel: '原文评分',
    afterLabel: '内容资产评分',
    declineTitle: '自媒体发布就绪度下降，需检查',
    renderType: 'bars',
    allowSchemaDimension: false,
    estimatedFromGuide: false,
    dimensions: [
      { key: 'title_attraction', label: '标题吸引力', description: '打开率、关键词、情绪与好奇心的平衡' },
      { key: 'opening_hook', label: '首屏导语', description: '前 3 行是否抓住读者、是否结论先行' },
      { key: 'mobile_readability', label: '移动端可读性', description: '段落短、节奏感、视觉留白' },
      { key: 'structure_rhythm', label: '结构节奏', description: '小标题、列表、金句的分布' },
      { key: 'share_value', label: '转发收藏价值', description: '信息增量、可复用性、社交货币' },
      { key: 'risk_control', label: '表达风险控制', description: '合规边界、广告法、敏感表达' },
    ],
  },
}

// ===== 官网文章默认维度 key（与后端 score-and-diagnose.md 对齐）=====
const WEB_DIMENSION_KEYS = [
  'fact_density',
  'structural_clarity',
  'entity_consistency',
  'source_authority',
  'ai_trigger_coverage',
  'schema_readiness',
]

// ===== 自媒体平台：旧 6 维 → 平台化维度的映射 =====
// 当后端只返回旧 6 维时，前端做近似映射（不伪造精确分数，仅展示）
const WECHAT_DIMENSION_MAP: Record<string, string> = {
  事实密度: 'title_attraction',
  结构清晰度: 'structure_rhythm',
  实体一致性: 'mobile_readability',
  来源权威性: 'risk_control',
  'AI 触发覆盖': 'opening_hook',
  'Schema 就绪度': 'share_value',
}

const ZHIHU_DIMENSION_MAP: Record<string, string> = {
  事实密度: 'evidence_support',
  结构清晰度: 'conclusion_first',
  实体一致性: 'argument_depth',
  来源权威性: 'evidence_support',
  'AI 触发覆盖': 'long_tail_coverage',
  'Schema 就绪度': 'risk_handling',
}

// 新闻通稿 / 权威背书稿：旧 6 维 → 权威传播就绪度维度映射
const PRESS_DIMENSION_MAP: Record<string, string> = {
  事实密度: 'fact_precision',
  结构清晰度: 'headline_clarity',
  实体一致性: 'official_voice',
  来源权威性: 'citation_support',
  'AI 触发覆盖': 'background_completeness',
  'Schema 就绪度': 'media_compliance',
}

// 行业垂媒稿：旧 6 维 → 行业语境适配度维度映射
const INDUSTRY_DIMENSION_MAP: Record<string, string> = {
  事实密度: 'scene_expression',
  结构清晰度: 'industry_angle',
  实体一致性: 'brand_integration',
  来源权威性: 'pain_point_fit',
  'AI 触发覆盖': 'professionalism',
  'Schema 就绪度': 'risk_control',
}

// 案例 / 客户故事：旧 6 维 → 案例可信度维度映射
const CASE_DIMENSION_MAP: Record<string, string> = {
  事实密度: 'result_evidence',
  结构清晰度: 'background_clarity',
  实体一致性: 'solution_specificity',
  来源权威性: 'result_evidence',
  'AI 触发覆盖': 'reusability',
  'Schema 就绪度': 'fact_completeness',
}

// 根据 scorecard type 选择对应的维度映射表
function getDimensionMap(type: PlatformScorecardType): Record<string, string> {
  switch (type) {
    case 'wechat_publish':
      return WECHAT_DIMENSION_MAP
    case 'zhihu_answer':
      return ZHIHU_DIMENSION_MAP
    case 'press_authority':
      return PRESS_DIMENSION_MAP
    case 'industry_media':
      return INDUSTRY_DIMENSION_MAP
    case 'case_story':
      return CASE_DIMENSION_MAP
    default:
      return WECHAT_DIMENSION_MAP
  }
}

// ===== 工具函数 =====

/** 根据平台名获取评分卡配置，未知平台降级为官网配置 */
export function getPlatformScorecardConfig(platform: string | undefined | null): PlatformScorecardConfig {
  if (platform && PLATFORM_SCORECARDS[platform]) return PLATFORM_SCORECARDS[platform]
  return PLATFORM_SCORECARDS['官网文章']
}

/** 判断某平台是否允许展示 Schema 就绪度 */
export function shouldShowSchemaDimension(platform: string | undefined | null): boolean {
  return getPlatformScorecardConfig(platform).allowSchemaDimension
}

/** 判断 schema_suggestions 是否为 PlatformPublishGuide（自媒体平台） */
export function isPlatformGuide(suggestion: SchemaSuggestion | null | undefined): boolean {
  return !!suggestion && suggestion.type === 'PlatformPublishGuide'
}

// ===== 评分维度数据适配 =====

/**
 * 把后端返回的 ContentScore.dimensions 适配为内容资产维度。
 *
 * - 自有官网内容 / 官网文章：直接使用后端维度（含 Schema 就绪度）
 * - 其它资产类型（新闻通稿 / 行业垂媒稿 / 问答型 / 案例 / 企业自媒体）：
 *   按映射表把旧 6 维名映射到资产维度 key，分数沿用
 *   - 旧「Schema 就绪度」维度会被映射到资产特定维度，避免因缺 Schema 扣分
 * - 小红书：不用后端维度，改用 PlatformPublishGuide 字段完整度计算 checklist
 */
export interface AdaptedDimension {
  key: string
  label: string
  description: string
  score: number
  comment?: string
}

export function adaptDimensionsForPlatform(
  score: ContentScore | null | undefined,
  platform: string | undefined | null,
): AdaptedDimension[] {
  if (!score?.dimensions?.length) return []
  const config = getPlatformScorecardConfig(platform)

  // 自有官网内容 / 官网文章：直接使用后端维度
  if (config.allowSchemaDimension) {
    return score.dimensions.map((d) => {
      const dimMeta = config.dimensions.find((m) => m.label === d.name)
      return {
        key: dimMeta?.key ?? d.name,
        label: d.name,
        description: dimMeta?.description ?? '',
        score: d.score,
        comment: d.comment,
      }
    })
  }

  // 其它资产类型：按映射表归类（press/industry/case/qa/wechat 各自一张表）
  const dimMap = getDimensionMap(config.type)
  const aggregated = new Map<string, { scores: number[]; comments: string[] }>()

  for (const d of score.dimensions) {
    const targetKey = dimMap[d.name]
    if (!targetKey) continue
    if (!aggregated.has(targetKey)) aggregated.set(targetKey, { scores: [], comments: [] })
    aggregated.get(targetKey)!.scores.push(d.score)
    if (d.comment) aggregated.get(targetKey)!.comments.push(d.comment)
  }

  return config.dimensions
    .map((dim) => {
      const agg = aggregated.get(dim.key)
      const score = agg && agg.scores.length > 0
        ? Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length)
        : 0
      return {
        key: dim.key,
        label: dim.label,
        description: dim.description,
        score,
        comment: agg?.comments.join('；'),
      }
    })
    .filter((d) => d.score > 0)
}

// ===== 小红书 checklist：基于 PlatformPublishGuide 字段完整度 =====

export interface XHSChecklistItem {
  label: string
  value: string
  ok: boolean
}

/**
 * 从 PlatformPublishGuide 计算小红书图文完整度 checklist。
 * 不伪造精确分数，仅展示字段是否存在 + 数量。
 */
export function buildXHSChecklist(guide: Record<string, unknown> | null | undefined): XHSChecklistItem[] {
  if (!guide) return []
  const items: XHSChecklistItem[] = []

  const coverCopy = typeof guide.cover_copy === 'string' ? guide.cover_copy : ''
  items.push({
    label: '封面文案',
    value: coverCopy ? '已生成' : '缺失',
    ok: !!coverCopy,
  })

  const cards = Array.isArray(guide.image_card_script) ? guide.image_card_script : []
  const cardCount = cards.length
  items.push({
    label: '图文卡片',
    value: `${cardCount} 张`,
    ok: cardCount >= 6 && cardCount <= 8,
  })

  const caption = typeof guide.caption === 'string' ? guide.caption : ''
  items.push({
    label: 'Caption',
    value: caption ? `${caption.length} 字` : '缺失',
    ok: caption.length >= 100,
  })

  const tags = Array.isArray(guide.tags) ? guide.tags : []
  items.push({
    label: '标签',
    value: `${tags.length} 个`,
    ok: tags.length >= 3,
  })

  const topics = Array.isArray(guide.topics) ? guide.topics : []
  items.push({
    label: '话题',
    value: `${topics.length} 个`,
    ok: topics.length >= 1,
  })

  const riskNotes = Array.isArray(guide.risk_notes) ? guide.risk_notes : []
  items.push({
    label: '风险提示',
    value: `${riskNotes.length} 条`,
    ok: riskNotes.length >= 1,
  })

  return items
}

// ===== 知乎 checklist：基于 PlatformPublishGuide 字段完整度 =====

export interface ZhihuChecklistItem {
  label: string
  value: string
  ok: boolean
}

/**
 * 从 PlatformPublishGuide 计算知乎回答完整度 checklist。
 */
export function buildZhihuChecklist(guide: Record<string, unknown> | null | undefined): ZhihuChecklistItem[] {
  if (!guide) return []
  const items: ZhihuChecklistItem[] = []

  const q = typeof guide.question_title === 'string' ? guide.question_title : ''
  items.push({ label: '问题式标题', value: q ? '已生成' : '缺失', ok: !!q })

  const osa = typeof guide.one_sentence_answer === 'string' ? guide.one_sentence_answer : ''
  items.push({ label: '一句话结论', value: osa ? '已生成' : '缺失', ok: !!osa })

  const outline = Array.isArray(guide.answer_outline) ? guide.answer_outline : []
  items.push({ label: '回答结构', value: `${outline.length} 节`, ok: outline.length >= 2 })

  const evidence = Array.isArray(guide.evidence_points) ? guide.evidence_points : []
  items.push({ label: '事实依据', value: `${evidence.length} 条`, ok: evidence.length >= 1 })

  const misconceptions = Array.isArray(guide.misconceptions) ? guide.misconceptions : []
  items.push({ label: '常见误区', value: `${misconceptions.length} 条`, ok: misconceptions.length >= 1 })

  const related = Array.isArray(guide.related_questions) ? guide.related_questions : []
  items.push({ label: '相关问题', value: `${related.length} 条`, ok: related.length >= 1 })

  const risk = Array.isArray(guide.risk_notes) ? guide.risk_notes : []
  items.push({ label: '风险提示', value: `${risk.length} 条`, ok: risk.length >= 1 })

  return items
}

// ===== 综合适配：根据平台 + output 返回评分卡所需数据 =====

export interface PlatformScorecardData {
  config: PlatformScorecardConfig
  beforeDimensions: AdaptedDimension[]
  afterDimensions: AdaptedDimension[]
  beforeOverall: number | null
  afterOverall: number | null
  /** 小红书 / 知乎 checklist（仅 renderType === 'checklist' 时有值） */
  checklist?: { label: string; value: string; ok: boolean }[]
  /** 是否基于发布建议完整度估算 */
  estimated: boolean
}

/**
 * 从 RewriteOutput 提取平台化评分卡所需数据。
 */
export function buildPlatformScorecardData(
  output: RewriteOutput,
  platform: string | undefined | null,
): PlatformScorecardData {
  const config = getPlatformScorecardConfig(platform)
  const beforeDimensions = adaptDimensionsForPlatform(output.score_before, platform)
  const afterDimensions = adaptDimensionsForPlatform(output.score_after, platform)
  const beforeOverall = output.score_before?.overall ?? null
  const afterOverall = output.score_after?.overall ?? null

  let checklist: { label: string; value: string; ok: boolean }[] | undefined
  if (config.renderType === 'checklist') {
    const guide = isPlatformGuide(output.schema_suggestions)
      ? (output.schema_suggestions!.json_ld as Record<string, unknown>)
      : null
    if (config.type === 'xhs_visual') {
      checklist = buildXHSChecklist(guide)
    } else if (config.type === 'zhihu_answer') {
      checklist = buildZhihuChecklist(guide)
    }
  }

  return {
    config,
    beforeDimensions,
    afterDimensions,
    beforeOverall,
    afterOverall,
    checklist,
    estimated: config.estimatedFromGuide,
  }
}

// ===== 历史 / 列表场景：根据平台返回分数列文案 =====

/**
 * 历史任务列表「改前 / 改后 / 提升」列文案。
 * 官网文章可显示「GEO Web Score」；自媒体显示「发布就绪度」。
 */
export function getScoreColumnLabel(platform: string | undefined | null): {
  before: string
  after: string
  delta: string
} {
  const config = getPlatformScorecardConfig(platform)
  return {
    before: config.beforeLabel,
    after: config.afterLabel,
    delta: '提升',
  }
}

/**
 * 历史 / 结果页右下角元信息文案（原「GEO Scorecard」）。
 */
export function getScorecardBadgeLabel(platform: string | undefined | null): string {
  const config = getPlatformScorecardConfig(platform)
  // 自媒体平台不显示「GEO Scorecard」，改为平台化标题
  if (config.allowSchemaDimension) return 'GEO Web Scorecard'
  return config.title
}

/**
 * 用于审计的常量（避免硬编码维度名）。
 */
export const SCHEMA_DIMENSION_NAME = 'Schema 就绪度'
