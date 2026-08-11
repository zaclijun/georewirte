import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outputApi } from '@/services/api'
import { queryKeys } from './queryKeys'
import type { ContentScore, RewriteOutput, UUID } from '@/types'

/**
 * useRewriteOutput - 改写结果页主数据 hook
 *
 * 流程：
 * 1. 先通过 useTaskDetail 拿到 task（在页面层调用）
 * 2. 用 task.id 请求 /tasks/:taskId/outputs，取最新版本作为默认展示
 * 3. 如果 task.status 处于 pending/running，由 useTaskStatus 轮询刷新 outputs
 *
 * @param taskId 任务 id
 * @param enabled 当 task 已完成或有 outputs 时启用
 */
export function useRewriteOutputs(taskId: UUID | undefined, enabled = true) {
  return useQuery<RewriteOutput[], Error>({
    queryKey: taskId ? queryKeys.outputs.listByTask(taskId) : ['outputs', 'task', 'idle'],
    queryFn: () => outputApi.listByTask(taskId!),
    enabled: !!taskId && enabled,
  })
}

/** 取最新版本 output（按 version 降序） */
export function pickLatestOutput(outputs: RewriteOutput[] | undefined): RewriteOutput | undefined {
  if (!outputs || outputs.length === 0) return undefined
  return [...outputs].sort((a, b) => b.version - a.version)[0]
}

/** 单个 output 详情 */
export function useOutputDetail(outputId: UUID | undefined) {
  return useQuery<RewriteOutput, Error>({
    queryKey: outputId ? queryKeys.outputs.detail(outputId) : ['outputs', 'detail', 'idle'],
    queryFn: () => outputApi.get(outputId!),
    enabled: !!outputId,
  })
}

/** output 评分明细（如需独立刷新评分时使用） */
export function useOutputScores(outputId: UUID | undefined) {
  return useQuery<ContentScore[], Error>({
    queryKey: outputId ? queryKeys.outputs.scores(outputId) : ['outputs', 'scores', 'idle'],
    queryFn: () => outputApi.getScores(outputId!),
    enabled: !!outputId,
  })
}

/** 重新生成（基于现有 output 生成下一版本） */
export function useRegenerateOutput(taskId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (outputId: UUID) => outputApi.regenerate(outputId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outputs.listByTask(taskId) })
      qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
    },
  })
}
