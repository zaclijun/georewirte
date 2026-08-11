import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  rewriteTaskApi,
  type TaskCreateInput,
  type TaskListParams,
  type TaskUpdateInput,
} from '@/services/api'
import { queryKeys } from './queryKeys'
import type { Paginated, RewriteTask, UUID } from '@/types'

/** 任务列表（按项目） - 后端可能返回数组或分页对象，统一归一化 */
export function useRewriteTasks(projectId: UUID | undefined, params?: TaskListParams) {
  return useQuery<RewriteTask[], Error>({
    queryKey: projectId
      ? queryKeys.tasks.list(projectId, params as Record<string, unknown>)
      : ['tasks', 'list', 'idle'],
    queryFn: async () => {
      const res = await rewriteTaskApi.list(projectId!, params)
      return normalizeTaskList(res)
    },
    enabled: !!projectId,
  })
}

function normalizeTaskList(res: RewriteTask[] | Paginated<RewriteTask>): RewriteTask[] {
  if (Array.isArray(res)) return res
  return res.items ?? []
}

/** 任务详情 */
export function useTaskDetail(taskId: UUID | undefined) {
  return useQuery<RewriteTask, Error>({
    queryKey: taskId ? queryKeys.tasks.detail(taskId) : ['tasks', 'detail', 'idle'],
    queryFn: () => rewriteTaskApi.get(taskId!),
    enabled: !!taskId,
  })
}

/** 新建任务 */
export function useCreateTask(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TaskCreateInput) => rewriteTaskApi.create(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) }),
  })
}

/** 更新任务 */
export function useUpdateTask(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: TaskUpdateInput }) =>
      rewriteTaskApi.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.id) })
    },
  })
}

/** 重试任务 */
export function useRetryTask(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => rewriteTaskApi.retry(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.id) })
    },
  })
}

/** 删除任务 */
export function useDeleteTask(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => rewriteTaskApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) }),
  })
}
