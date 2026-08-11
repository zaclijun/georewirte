import axios, { AxiosError } from 'axios'
import type {
  ApiResponse,
  BrandFact,
  ContentScore,
  ModelConfig,
  ModelConfigCreateInput,
  ModelConfigTestResult,
  ModelConfigUpdateInput,
  Paginated,
  Project,
  RewriteOutput,
  RewriteTask,
  TaskStatus,
  UUID,
} from '@/types'

/**
 * API service - 与后端接口契约对齐
 *
 * baseURL 通过 VITE_API_BASE_URL 配置，默认 http://localhost:8000/api
 * service 内路径不再额外写 /api 前缀
 *
 * 后端统一响应：{ code: 0, message: "success", data: T }
 * 前端 service 自动解包返回 data，页面组件不处理外壳
 */

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ===== 统一响应解包 =====
http.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiResponse<unknown> | unknown
    // 兼容后端标准外壳 { code, message, data }
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      const envelope = body as ApiResponse<unknown>
      if (envelope.code === 0 || envelope.code === 200) {
        return { ...resp, data: envelope.data }
      }
      return Promise.reject(new ApiError(envelope.message || `API error: ${envelope.code}`, envelope.code, resp.status))
    }
    return resp
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const body = error.response?.data
    // 后端可达但有业务错误响应时，优先使用后端 message
    if (body && typeof body === 'object' && 'message' in body && body.message) {
      return Promise.reject(new ApiError(String(body.message), body && typeof body === 'object' && 'code' in body ? (body as ApiResponse<unknown>).code : -1, status ?? 0))
    }
    // 无响应（连接被拒 / CORS preflight 失败 / 后端未启动）→ 给出可操作提示
    if (!error.response) {
      const hint = '无法连接后端服务，请确认后端已启动且 /api 接口可访问（http://localhost:8000）。'
      return Promise.reject(new ApiError(hint, -1, 0))
    }
    const message = error.message || '网络错误'
    return Promise.reject(new ApiError(String(message), -1, status ?? 0))
  },
)

/** 统一错误类型 */
export class ApiError extends Error {
  code: number
  httpStatus: number
  constructor(message: string, code: number, httpStatus: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

// 提取已解包的 data（interceptor 已将 resp.data 替换为 envelope.data）
// 单泛型版本：http.get<T>() 默认返回 Promise<AxiosResponse<T>>，.then(r => r.data) 拿到 T
function unwrap<T>(resp: { data: T }): T {
  return resp.data
}

// ===== Project API =====
export interface ProjectCreateInput {
  name: string
  description?: string
  brand_name?: string
  default_perspective?: Project['default_perspective']
  default_platform?: Project['default_platform']
  workspace_type?: Project['workspace_type']
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {}

export const projectApi = {
  list: () =>
    http.get<Project[] | Paginated<Project>>('/projects').then(unwrap),
  create: (payload: ProjectCreateInput) =>
    http.post<Project>('/projects', payload).then(unwrap),
  get: (id: UUID) => http.get<Project>(`/projects/${id}`).then(unwrap),
  update: (id: UUID, payload: ProjectUpdateInput) =>
    http.put<Project>(`/projects/${id}`, payload).then(unwrap),
  remove: (id: UUID) => http.delete<void>(`/projects/${id}`).then(unwrap),
}

// ===== BrandFact API =====
// 注意：使用 /brand-facts/:id，不使用 /facts/:factId
export interface BrandFactCreateInput {
  fact_type: BrandFact['fact_type']
  title: string
  content: string
  source_type: BrandFact['source_type']
  source_url?: string
  evidence_level: BrandFact['evidence_level']
  tags?: string[]
  is_active?: boolean
}

export interface BrandFactUpdateInput extends Partial<BrandFactCreateInput> {}

export const brandFactApi = {
  list: (projectId: UUID) =>
    http
      .get<BrandFact[] | Paginated<BrandFact>>(`/projects/${projectId}/brand-facts`)
      .then(unwrap),
  create: (projectId: UUID, payload: BrandFactCreateInput) =>
    http.post<BrandFact>(`/projects/${projectId}/brand-facts`, payload).then(unwrap),
  get: (id: UUID) => http.get<BrandFact>(`/brand-facts/${id}`).then(unwrap),
  update: (id: UUID, payload: BrandFactUpdateInput) =>
    http.put<BrandFact>(`/brand-facts/${id}`, payload).then(unwrap),
  remove: (id: UUID) => http.delete<void>(`/brand-facts/${id}`).then(unwrap),
}

// ===== RewriteTask API =====
// 注意：任务列表挂在 project 下，不使用全局 /tasks 列表
export interface TaskCreateInput {
  title: string
  original_content: string
  article_type?: string
  perspective: RewriteTask['perspective']
  publish_platform: RewriteTask['publish_platform']
  target_audience?: string
  source_policy: RewriteTask['source_policy']
  output_length: RewriteTask['output_length']
  need_schema: boolean
  brand_fact_ids?: UUID[]
  model_config_id?: string
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {}

export interface TaskListParams {
  status?: TaskStatus
  platform?: RewriteTask['publish_platform']
  page?: number
  page_size?: number
}

export interface TaskStatusResponse {
  id: UUID
  status: TaskStatus
  error_message?: string | null
}

export const rewriteTaskApi = {
  list: (projectId: UUID, params?: TaskListParams) =>
    http
      .get<Paginated<RewriteTask> | RewriteTask[]>(`/projects/${projectId}/tasks`, {
        params,
      })
      .then(unwrap),
  create: (projectId: UUID, payload: TaskCreateInput) =>
    http.post<RewriteTask>(`/projects/${projectId}/tasks`, payload).then(unwrap),
  get: (id: UUID) => http.get<RewriteTask>(`/tasks/${id}`).then(unwrap),
  update: (id: UUID, payload: TaskUpdateInput) =>
    http.put<RewriteTask>(`/tasks/${id}`, payload).then(unwrap),
  remove: (id: UUID) => http.delete<void>(`/tasks/${id}`).then(unwrap),
  retry: (id: UUID) => http.post<RewriteTask>(`/tasks/${id}/retry`).then(unwrap),
  getStatus: (id: UUID) =>
    http.get<TaskStatusResponse>(`/tasks/${id}/status`).then(unwrap),
}

// ===== Output API =====
// 注意：使用 /tasks/:taskId/outputs 复数，不使用 /tasks/:taskId/output 单数
export const outputApi = {
  listByTask: (taskId: UUID) =>
    http.get<RewriteOutput[]>(`/tasks/${taskId}/outputs`).then(unwrap),
  get: (outputId: UUID) =>
    http.get<RewriteOutput>(`/outputs/${outputId}`).then(unwrap),
  getScores: (outputId: UUID) =>
    http.get<ContentScore[]>(`/outputs/${outputId}/scores`).then(unwrap),
  regenerate: (outputId: UUID) =>
    http.post<RewriteOutput>(`/outputs/${outputId}/regenerate`).then(unwrap),
}

// ===== Export API =====
// 注意：GET /outputs/:id/export?format=markdown|json，不使用 POST /tasks/:taskId/export
export type ExportFormat = 'markdown' | 'json'

export interface ExportResult {
  /** 后端返回的文件内容（文本） */
  content: string
  /** 建议的文件名 */
  filename: string
  /** content-type */
  mime: string
}

export const exportApi = {
  export: (outputId: UUID, format: ExportFormat = 'markdown') =>
    http
      .get<ExportResult>(`/outputs/${outputId}/export`, {
        params: { format },
      })
      .then(unwrap),
}

// ===== ModelConfig API =====
// 模型供应商配置：增删改查 + 测试连接 + 设为默认
export type { ModelConfigCreateInput, ModelConfigUpdateInput } from '@/types'
import type { ModelDiscoverRequest, ModelDiscoverResponse } from '@/types'

export const modelConfigApi = {
  list: () => http.get<ModelConfig[]>('/settings/models').then(unwrap),
  create: (input: ModelConfigCreateInput) =>
    http.post<ModelConfig>('/settings/models', input).then(unwrap),
  update: (id: UUID, input: ModelConfigUpdateInput) =>
    http.patch<ModelConfig>(`/settings/models/${id}`, input).then(unwrap),
  remove: (id: UUID) => http.delete<void>(`/settings/models/${id}`).then(unwrap),
  test: (id: UUID) =>
    http.post<ModelConfigTestResult>(`/settings/models/${id}/test`, {}).then(unwrap),
  setDefault: (id: UUID) =>
    http.post<ModelConfig>(`/settings/models/${id}/default`, {}).then(unwrap),
  discover: (payload: ModelDiscoverRequest) =>
    http.post<ModelDiscoverResponse>('/settings/models/discover', payload).then(unwrap),
}

// 兼容旧引用（已迁移到各 xxxApi 命名空间，保留 api 别名过渡）
export const api = {
  ...projectApi,
  ...brandFactApi,
  ...rewriteTaskApi,
  ...outputApi,
  ...exportApi,
}
