import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  brandFactApi,
  type BrandFactCreateInput,
  type BrandFactUpdateInput,
} from '@/services/api'
import { queryKeys } from './queryKeys'
import type { BrandFact, Paginated, UUID } from '@/types'

/** 品牌事实列表（按项目） */
export function useBrandFacts(projectId: UUID | undefined) {
  return useQuery<BrandFact[], Error>({
    queryKey: projectId
      ? queryKeys.brandFacts.list(projectId)
      : ['brand-facts', 'list', 'idle'],
    queryFn: async () => {
      const res = await brandFactApi.list(projectId!)
      return normalizeFactList(res)
    },
    enabled: !!projectId,
  })
}

function normalizeFactList(res: BrandFact[] | Paginated<BrandFact>): BrandFact[] {
  if (Array.isArray(res)) return res
  return res.items ?? []
}

/** 新建事实 */
export function useCreateBrandFact(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BrandFactCreateInput) =>
      brandFactApi.create(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.brandFacts.list(projectId) }),
  })
}

/** 更新事实 */
export function useUpdateBrandFact(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: BrandFactUpdateInput }) =>
      brandFactApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brandFacts.list(projectId) })
    },
  })
}

/** 切换事实启用状态（走 PATCH/PUT update） */
export function useToggleBrandFact(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fact, next }: { fact: BrandFact; next: boolean }) =>
      brandFactApi.update(fact.id, { is_active: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.brandFacts.list(projectId) }),
  })
}

/** 删除事实 */
export function useDeleteBrandFact(projectId: UUID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => brandFactApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.brandFacts.list(projectId) }),
  })
}
