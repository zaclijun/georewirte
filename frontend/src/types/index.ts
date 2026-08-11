/**
 * P0 数据模型 - 对齐 backend/app/schemas/ 与接口契约草案
 * 仅前端类型，不参与运行时校验
 */

export type UUID = string
export type ISODateTime = string

// ===== Project =====
export type WorkspaceType = 'brand' | 'professional' | 'media' | 'agency'

export interface Project {
  id: UUID
  name: string
  description: string
  brand_name: string
  default_perspective: Perspective
  default_platform: Platform
  workspace_type: WorkspaceType
  // 前端扩展字段（mock 用）
  task_count?: number
  avg_geo_score?: number
  last_task_at?: ISODateTime
  created_at: ISODateTime
  updated_at: ISODateTime
}

// ===== BrandFact =====
export type FactType = 'brand' | 'product' | 'case' | 'certification' | 'data' | 'other'
export type SourceType =
  | 'official'
  | 'third_party_report'
  | 'user_review'
  | 'internal_data'
  | 'public_data'
  | 'unspecified'
export type EvidenceLevel = 'conclusive' | 'strong' | 'moderate' | 'weak' | 'anecdotal'

export interface BrandFact {
  id: UUID
  project_id: UUID
  fact_type: FactType
  title: string
  content: string
  source_type: SourceType
  source_url: string
  evidence_level: EvidenceLevel
  tags: string[]
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

// ===== RewriteTask =====
export type Perspective =
  | '品牌方'
  | '第三方'
  | '用户/客户'
  | '媒体/新闻'
  | '内部/员工'
  | '合作商'
  | '投资者'
  | '政府/监管'
  | '学术/科研'

export type Platform = '官网文章' | '公众号' | '知乎问答' | '小红书'

/**
 * 内容资产类型（Content Asset Type）
 *
 * 取代旧的 Platform 作为用户可见的一级生成目标。
 * P0 启用 6 类：
 *   - owned_website   自有官网内容（对应旧 官网文章）
 *   - press_authority 新闻通稿 / 权威背书稿
 *   - industry_media  行业垂媒稿
 *   - qa_content      问答型内容（对应旧 知乎问答）
 *   - case_story      案例 / 客户故事
 *   - owned_media     企业自媒体稿（对应旧 公众号）
 *
 * 注意：底层仍复用 publish_platform 字段传递新值（后端无枚举限制，max_length=20）。
 * 旧任务里的 官网文章/公众号/知乎问答/小红书 在前端通过 mapPlatformToAssetType 映射展示。
 * 小红书已下线，仅历史任务可查看，不允许重新生成。
 */
export type ContentAssetType =
  | '自有官网内容'
  | '新闻通稿 / 权威背书稿'
  | '行业垂媒稿'
  | '问答型内容'
  | '案例 / 客户故事'
  | '企业自媒体稿'

/** publish_platform 字段当前可接收的值：新资产类型 + 旧平台值（历史任务兼容） */
export type PublishTarget = ContentAssetType | Platform

export type SourcePolicy = 'use_provided_only' | 'allow_external_sources' | 'mark_missing_sources'
export type OutputLength = 'short' | 'standard' | 'long'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface RewriteTask {
  id: UUID
  project_id: UUID
  title: string
  original_content: string
  article_type?: string
  perspective: Perspective
  publish_platform: PublishTarget
  target_audience?: string
  source_policy: SourcePolicy
  output_length: OutputLength
  need_schema: boolean
  brand_fact_ids: UUID[]
  status: TaskStatus
  error_message?: string | null
  score_before?: number | null
  score_after?: number | null
  output_id?: UUID | null
  model_config_id?: string | null
  model_provider?: string | null
  model_name?: string | null
  model_display_name?: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

// ===== Score =====
export interface ScoreDimension {
  name: string
  score: number
  comment?: string
}

export interface ContentScore {
  id: UUID
  output_id: UUID
  score_type: 'before' | 'after'
  overall: number
  dimensions: ScoreDimension[]
  created_at: ISODateTime
}

// ===== Output =====
export type ReviewStatus = 'ready' | 'review' | 'needs_material' | 'exported'

export interface OptimizationStrategyItem {
  issue: string
  action: string
  priority: 'high' | 'medium' | 'low'
  evidence?: string
}

export interface MissingFactSuggestion {
  title: string
  fact_type: FactType
  content: string
  reason: string
}

export interface SchemaSuggestion {
  type: string
  json_ld: Record<string, unknown>
}

export interface RewriteOutput {
  id: UUID
  task_id: UUID
  version: number
  parent_version_id?: UUID | null
  title: string
  final_article: string
  faq_content: string
  schema_suggestions?: SchemaSuggestion | null
  optimization_strategy: OptimizationStrategyItem[]
  comparison_summary: string
  missing_sources: string[]
  missing_facts: MissingFactSuggestion[]
  review_status: ReviewStatus
  score_before?: ContentScore | null
  score_after?: ContentScore | null
  created_at: ISODateTime
}

// ===== 通用响应（接口契约草案 11.1） =====
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ===== ModelConfig（模型供应商配置） =====
export interface ModelConfig {
  id: string
  provider: string
  provider_label: string
  display_name: string
  base_url: string
  model_id: string
  enabled: boolean
  is_default: boolean
  temperature: number | null
  max_tokens: number | null
  supports_streaming: boolean
  masked_api_key: string
  created_at: string
  updated_at: string
}

export interface ModelConfigCreateInput {
  provider: string
  provider_label: string
  display_name: string
  api_key: string
  base_url: string
  model_id: string
  temperature?: number | null
  max_tokens?: number | null
  supports_streaming?: boolean
}

export interface ModelConfigUpdateInput {
  provider?: string
  provider_label?: string
  display_name?: string
  api_key?: string
  base_url?: string
  model_id?: string
  enabled?: boolean
  is_default?: boolean
  temperature?: number | null
  max_tokens?: number | null
  supports_streaming?: boolean
}

export interface ModelConfigTestResult {
  success: boolean
  message: string
}

export interface ModelDiscoverRequest {
  provider: string
  api_key: string
  base_url: string
}

export interface ModelDiscoverItem {
  id: string
  owned_by: string
}

export interface ModelDiscoverResponse {
  success: boolean
  message: string
  models: ModelDiscoverItem[]
}
