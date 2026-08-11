import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { rewriteTaskApi, type TaskStatusResponse } from '@/services/api'
import { queryKeys } from './queryKeys'
import type { RewriteTask, TaskStatus, UUID } from '@/types'

/** 进行中的状态集合 - 处于这些状态时启用轮询 */
const ACTIVE_STATUSES: TaskStatus[] = ['pending', 'running']

/**
 * useTaskStatus - 任务状态轮询
 *
 * 轮询策略（对齐 Phase 3 契约）：
 * - 当 status 为 pending / running 时，每 3 秒请求 /tasks/:id/status
 * - 当 status 为 completed / failed 时停止轮询
 * - 任务进入终态时 invalidate detail 与 list 与 outputs，触发上游刷新
 *
 * TanStack Query v5 已移除 useQuery 的 onSuccess，故用 useEffect 监听 data.status 变化
 *
 * @param taskId 任务 id
 * @param currentStatus 当前已知状态（从 task detail 获取），用于决定是否启用轮询
 */
export function useTaskStatus(taskId: UUID | undefined, currentStatus?: TaskStatus) {
  const qc = useQueryClient()
  const isActive = !!taskId && !!currentStatus && ACTIVE_STATUSES.includes(currentStatus)

  const query = useQuery<TaskStatusResponse, Error>({
    queryKey: taskId ? queryKeys.tasks.status(taskId) : ['tasks', 'status', 'idle'],
    queryFn: () => rewriteTaskApi.getStatus(taskId!),
    enabled: isActive,
    refetchInterval: isActive ? 3000 : false,
    refetchOnWindowFocus: false,
  })

  // 状态进入终态时刷新上游 query（v5 替代 onSuccess 的标准做法）
  const polledStatus = query.data?.status
  useEffect(() => {
    if (!taskId || !polledStatus) return
    if (!ACTIVE_STATUSES.includes(polledStatus)) {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all })
      qc.invalidateQueries({ queryKey: queryKeys.outputs.listByTask(taskId) })
    }
  }, [polledStatus, taskId, qc])

  return query
}

/** 工具：根据 task 判断是否处于轮询态 */
export function isTaskActive(task?: RewriteTask | null): boolean {
  return !!task && ACTIVE_STATUSES.includes(task.status)
}
