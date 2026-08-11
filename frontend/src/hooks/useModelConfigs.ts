import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  modelConfigApi,
  type ModelConfigCreateInput,
  type ModelConfigUpdateInput,
} from '@/services/api'
import { queryKeys } from './queryKeys'
import type { UUID } from '@/types'

/** 模型配置列表 */
export function useModelConfigs() {
  return useQuery({
    queryKey: queryKeys.modelConfigs.list(),
    queryFn: () => modelConfigApi.list(),
  })
}

/** 新建模型配置 */
export function useCreateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ModelConfigCreateInput) => modelConfigApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() }),
  })
}

/** 更新模型配置 */
export function useUpdateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: UUID; input: ModelConfigUpdateInput }) =>
      modelConfigApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() }),
  })
}

/** 删除模型配置 */
export function useDeleteModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => modelConfigApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() }),
  })
}

/** 测试模型连接（不 invalidate 列表） */
export function useTestModelConfig() {
  return useMutation({
    mutationFn: (id: UUID) => modelConfigApi.test(id),
  })
}

/** 设为默认模型 */
export function useSetDefaultModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => modelConfigApi.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() }),
  })
}
