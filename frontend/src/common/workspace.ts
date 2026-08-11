/**
 * Workspace 类型与知识库配置
 *
 * 目标：把 Project + BrandFacts 的底层概念包装为用户友好的
 *   Workspace 工作区 + Knowledge Base 知识库。
 *
 * 底层 API/数据库继续叫 project / brand_facts，本轮不重构。
 * workspace_type 仅前端 localStorage 存储（P0.1 兼容做法）。
 */

import type {
  ContentAssetType,
  FactType,
  Perspective,
  Platform,
  SourceType,
  WorkspaceType,
} from '@/types'

export type { WorkspaceType }

/** 工作区类型元信息：用于卡片选择、Sidebar 文案、概览页 eyebrow 等 */
export interface WorkspaceTypeMeta {
  value: WorkspaceType
  /** 卡片标题 */
  label: string
  /** 卡片副标题 */
  shortLabel: string
  /** 卡片说明 */
  description: string
  /** 知识库中文名（动态替换"品牌事实库"） */
  knowledgeBaseName: string
  /** 概览页 eyebrow */
  eyebrow: string
  /** 工作区主语（用于"为谁生成内容"） */
  subject: string
  /** 该类型下默认视角 */
  defaultPerspective: Perspective
  /** 该类型下默认平台 */
  defaultPlatform: Platform
}

export const WORKSPACE_TYPES: WorkspaceTypeMeta[] = [
  {
    value: 'brand',
    label: '品牌 / 企业',
    shortLabel: '品牌',
    description: '适合企业官网、服务页、案例文章、品牌内容治理。',
    knowledgeBaseName: '品牌知识库',
    eyebrow: '品牌工作区',
    subject: '企业市场部、品牌方、B2B 公司、消费品牌',
    defaultPerspective: '品牌方',
    defaultPlatform: '官网文章',
  },
  {
    value: 'professional',
    label: '专业服务 / 专家机构',
    shortLabel: '专业服务',
    description: '适合律所、咨询、教育、医疗、专家 IP，沉淀专业能力、案例和合规边界。',
    knowledgeBaseName: '专业知识库',
    eyebrow: '专业服务工作区',
    subject: '律所、咨询公司、会计、医生、教育机构、专家 IP',
    defaultPerspective: '品牌方',
    defaultPlatform: '官网文章',
  },
  {
    value: 'media',
    label: '自媒体 / 公众号账号',
    shortLabel: '自媒体',
    description: '适合公众号、小红书、知乎等账号，沉淀账号定位、读者画像、内容风格和选题方向。',
    knowledgeBaseName: '账号知识库',
    eyebrow: '自媒体工作区',
    subject: '公众号、科技自媒体、财经号、法律科普号、KOL',
    defaultPerspective: '媒体/新闻',
    defaultPlatform: '公众号',
  },
  {
    value: 'agency',
    label: '服务商 / 代运营客户',
    shortLabel: '服务商',
    description: '适合为多个客户分别维护资料，并生成多平台内容包。',
    knowledgeBaseName: '客户知识库',
    eyebrow: '客户工作区',
    subject: '内容代运营、营销服务商、咨询服务商',
    defaultPerspective: '品牌方',
    defaultPlatform: '官网文章',
  },
]

/** 类型 → 元信息映射，便于 O(1) 查询 */
export const WORKSPACE_TYPE_MAP: Record<WorkspaceType, WorkspaceTypeMeta> =
  Object.fromEntries(WORKSPACE_TYPES.map((t) => [t.value, t])) as Record<
    WorkspaceType,
    WorkspaceTypeMeta
  >

/** 获取工作区元信息，未知类型降级为通用 */
export function getWorkspaceMeta(type: WorkspaceType | undefined | null): WorkspaceTypeMeta {
  if (type && WORKSPACE_TYPE_MAP[type]) return WORKSPACE_TYPE_MAP[type]
  // 兜底：通用知识库
  return {
    value: 'brand',
    label: '通用',
    shortLabel: '通用',
    description: '',
    knowledgeBaseName: '知识库',
    eyebrow: '通用',
    subject: '',
    defaultPerspective: '第三方',
    defaultPlatform: '官网文章',
  }
}

/**
 * 按工作区类型返回默认生成平台（多平台）。
 * - brand → 官网文章 + 公众号
 * - media → 公众号 + 小红书
 * - professional → 公众号 + 知乎问答
 * - agency → 官网文章（不默认全选，由用户决定客户场景）
 * - 未知 → 官网文章
 *
 * 注意：仅用于初始化默认值；用户手动修改平台后不应被重新覆盖。
 *
 * @deprecated P0 内容资产类型重构后，新建任务请使用 getDefaultAssetTypesByWorkspaceType。
 * 本函数保留仅为历史任务展示与 mock 数据兼容。
 */
export function getDefaultPlatformsByWorkspaceType(
  type: WorkspaceType | undefined | null,
): Platform[] {
  switch (type) {
    case 'brand':
      return ['官网文章', '公众号']
    case 'media':
      return ['公众号', '小红书']
    case 'professional':
      return ['公众号', '知乎问答']
    case 'agency':
      return ['官网文章']
    default:
      return ['官网文章']
  }
}

/**
 * 按工作区类型返回默认内容资产类型（多类型，P0 启用 6 类）。
 *
 * - brand       → 自有官网内容 + 企业自媒体稿
 * - media       → 企业自媒体稿
 * - professional → 问答型内容 + 案例 / 客户故事 + 企业自媒体稿
 * - agency      → 自有官网内容 + 新闻通稿 / 权威背书稿
 * - 未知        → 自有官网内容
 *
 * 注意：仅用于初始化默认值；用户手动修改后不应被重新覆盖（由调用方使用 touched ref 守卫）。
 */
export function getDefaultAssetTypesByWorkspaceType(
  type: WorkspaceType | undefined | null,
): ContentAssetType[] {
  switch (type) {
    case 'brand':
      return ['自有官网内容', '企业自媒体稿']
    case 'media':
      return ['企业自媒体稿']
    case 'professional':
      return ['问答型内容', '案例 / 客户故事', '企业自媒体稿']
    case 'agency':
      return ['自有官网内容', '新闻通稿 / 权威背书稿']
    default:
      return ['自有官网内容']
  }
}

/**
 * 旧平台值 → 新内容资产类型 的映射（用于历史任务展示）。
 *
 * - 官网文章 → 自有官网内容
 * - 公众号   → 企业自媒体稿
 * - 知乎问答 → 问答型内容
 * - 小红书   → '已下线平台历史内容'（特殊标记，非 ContentAssetType）
 *
 * 新资产类型值原样返回。
 */
export const DEPRECATED_PLATFORM_LABEL = '已下线平台历史内容'

export function mapPlatformToAssetType(
  platform: string | undefined | null,
): ContentAssetType | typeof DEPRECATED_PLATFORM_LABEL {
  if (!platform) return '自有官网内容'
  // 新值原样返回
  const assetTypes: ContentAssetType[] = [
    '自有官网内容',
    '新闻通稿 / 权威背书稿',
    '行业垂媒稿',
    '问答型内容',
    '案例 / 客户故事',
    '企业自媒体稿',
  ]
  if (assetTypes.includes(platform as ContentAssetType)) {
    return platform as ContentAssetType
  }
  // 旧值映射
  switch (platform) {
    case '官网文章':
      return '自有官网内容'
    case '公众号':
      return '企业自媒体稿'
    case '知乎问答':
      return '问答型内容'
    case '小红书':
      return DEPRECATED_PLATFORM_LABEL
    default:
      return '自有官网内容'
  }
}

/**
 * 判断某个 publish_platform 值是否为已下线平台（小红书）。
 * 已下线平台仅历史任务可查看，不允许重新生成。
 */
export function isDeprecatedPlatform(platform: string | undefined | null): boolean {
  return platform === '小红书'
}

// ===== localStorage 存取 =====
const storageKey = (projectId: string) => `workspace_type:${projectId}`

/** 读取某个工作区的类型 */
export function getWorkspaceType(projectId: string): WorkspaceType | null {
  try {
    const v = localStorage.getItem(storageKey(projectId))
    if (v && WORKSPACE_TYPE_MAP[v as WorkspaceType]) return v as WorkspaceType
    return null
  } catch {
    return null
  }
}

/** 写入工作区类型 */
export function setWorkspaceType(projectId: string, type: WorkspaceType): void {
  try {
    localStorage.setItem(storageKey(projectId), type)
  } catch {
    /* ignore */
  }
}

// ===== 知识条目初始化模板 =====
/**
 * 知识条目初始化模板：根据表单值生成 BrandFact 创建 payload。
 *
 * 由于 BrandFact.fact_type 仅支持 6 个固定枚举（brand/product/case/data/certification/other），
 * 本轮不重构枚举，而是在 title 中加 `[分类]` 前缀，并写入 tags。
 */
export interface KnowledgeSeedItem {
  /** 显示分类（如"账号定位"），用于 title 前缀 */
  category: string
  /** 条目标题（不含前缀） */
  title: string
  /** 条目内容 */
  content: string
  /** BrandFact.fact_type 映射 */
  fact_type: FactType
  /** 默认 source_type */
  source_type: SourceType
  /** 默认 evidence_level */
  evidence_level: 'moderate' | 'strong'
  /** tags */
  tags: string[]
}

/** 表单字段值（key → string） */
export type WorkspaceFormData = Record<string, string>

/**
 * 根据工作区类型 + 表单数据生成初始知识条目列表。
 * 空字段会被跳过。
 */
export function buildKnowledgeSeeds(
  type: WorkspaceType,
  form: WorkspaceFormData,
): KnowledgeSeedItem[] {
  const builders: Record<WorkspaceType, (f: WorkspaceFormData) => KnowledgeSeedItem[]> = {
    brand: buildBrandSeeds,
    professional: buildProfessionalSeeds,
    media: buildMediaSeeds,
    agency: buildAgencySeeds,
  }
  return builders[type](form).filter((s) => s.content && s.content.trim().length > 0)
}

// ===== brand =====
function buildBrandSeeds(f: WorkspaceFormData): KnowledgeSeedItem[] {
  return [
    {
      category: '品牌简介',
      title: '品牌简介',
      content: f.brand_intro ?? '',
      fact_type: 'brand',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['品牌事实', '品牌简介'],
    },
    {
      category: '目标客户',
      title: '目标客户画像',
      content: f.target_customer ?? '',
      fact_type: 'brand',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['品牌事实', '目标客户'],
    },
    {
      category: '产品服务',
      title: '核心产品 / 服务',
      content: f.product_service ?? '',
      fact_type: 'product',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['产品服务'],
    },
    {
      category: '内容目标',
      title: '内容目标',
      content: f.content_goal ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['品牌事实', '内容目标'],
    },
    {
      category: '可信来源',
      title: '可信来源 / 参考链接',
      content: f.trusted_sources ?? '',
      fact_type: 'other',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['来源链接'],
    },
  ]
}

// ===== professional =====
function buildProfessionalSeeds(f: WorkspaceFormData): KnowledgeSeedItem[] {
  return [
    {
      category: '机构介绍',
      title: '机构介绍',
      content: f.org_intro ?? '',
      fact_type: 'brand',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['机构介绍'],
    },
    {
      category: '服务领域',
      title: '服务领域',
      content: f.service_fields ?? '',
      fact_type: 'product',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['服务领域'],
    },
    {
      category: '专家团队',
      title: '专家 / 团队介绍',
      content: f.experts ?? '',
      fact_type: 'brand',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['专家团队'],
    },
    {
      category: '典型案例',
      title: '典型案例',
      content: f.cases ?? '',
      fact_type: 'case',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['典型案例'],
    },
    {
      category: '合规边界',
      title: '合规边界',
      content: f.compliance ?? '',
      fact_type: 'other',
      source_type: 'official',
      evidence_level: 'strong',
      tags: ['合规边界'],
    },
    {
      category: '常见问题',
      title: '常见问题 FAQ',
      content: f.faq ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['常见问题', 'FAQ'],
    },
    {
      category: '可引用依据',
      title: '可引用法律 / 政策 / 行业依据',
      content: f.legal_refs ?? '',
      fact_type: 'certification',
      source_type: 'public_data',
      evidence_level: 'strong',
      tags: ['专业依据'],
    },
  ]
}

// ===== media =====
function buildMediaSeeds(f: WorkspaceFormData): KnowledgeSeedItem[] {
  return [
    {
      category: '账号定位',
      title: '账号定位',
      content: f.account_positioning ?? '',
      fact_type: 'brand',
      source_type: 'internal_data',
      evidence_level: 'strong',
      tags: ['账号定位'],
    },
    {
      category: '目标读者',
      title: '目标读者画像',
      content: f.target_audience ?? '',
      fact_type: 'brand',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['目标读者'],
    },
    {
      category: '内容领域',
      title: '内容领域',
      content: f.content_fields ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['内容领域'],
    },
    {
      category: '常用栏目',
      title: '常用栏目',
      content: f.columns ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['内容栏目'],
    },
    {
      category: '写作风格',
      title: '写作风格',
      content: f.writing_style ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['写作风格'],
    },
    {
      category: '标题偏好',
      title: '标题偏好',
      content: f.title_preference ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['标题偏好'],
    },
    {
      category: '常用信源',
      title: '常用信源',
      content: f.trusted_sources ?? '',
      fact_type: 'other',
      source_type: 'public_data',
      evidence_level: 'strong',
      tags: ['常用信源'],
    },
    {
      category: '表达禁忌',
      title: '表达禁忌',
      content: f.taboos ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'strong',
      tags: ['表达禁忌'],
    },
    {
      category: '转化目标',
      title: '转化目标',
      content: f.conversion_goal ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['转化目标'],
    },
  ]
}

// ===== agency =====
function buildAgencySeeds(f: WorkspaceFormData): KnowledgeSeedItem[] {
  return [
    {
      category: '客户背景',
      title: '客户背景',
      content: f.client_background ?? '',
      fact_type: 'brand',
      source_type: 'internal_data',
      evidence_level: 'strong',
      tags: ['客户背景'],
    },
    {
      category: '客户行业',
      title: '客户行业',
      content: f.client_industry ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['行业资料'],
    },
    {
      category: '服务目标',
      title: '服务目标',
      content: f.service_goal ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['服务目标'],
    },
    {
      category: '内容平台',
      title: '内容平台',
      content: f.content_platforms ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['交付要求'],
    },
    {
      category: '客户资料摘要',
      title: '客户资料摘要',
      content: f.client_summary ?? '',
      fact_type: 'brand',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['客户资料'],
    },
    {
      category: '审核偏好',
      title: '审核偏好',
      content: f.review_preference ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'strong',
      tags: ['审核偏好'],
    },
    {
      category: '风险边界',
      title: '风险边界',
      content: f.risk_boundary ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'strong',
      tags: ['风险边界'],
    },
    {
      category: '项目备注',
      title: '项目备注',
      content: f.project_notes ?? '',
      fact_type: 'other',
      source_type: 'internal_data',
      evidence_level: 'moderate',
      tags: ['项目备注'],
    },
  ]
}

/** 把 KnowledgeSeedItem 转成 BrandFact 创建 payload */
export function seedToFactPayload(seed: KnowledgeSeedItem) {
  return {
    fact_type: seed.fact_type,
    title: `[${seed.category}] ${seed.title}`,
    content: seed.content.trim(),
    source_type: seed.source_type,
    evidence_level: seed.evidence_level,
    tags: seed.tags,
    is_active: true,
  }
}
