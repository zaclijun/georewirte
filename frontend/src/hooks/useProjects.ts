import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  projectApi,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from '@/services/api'
import { queryKeys } from './queryKeys'
import type { Paginated, Project, UUID } from '@/types'

/** 项目列表 - 后端可能返回数组或分页对象，统一归一化 */
export function useProjects() {
  return useQuery<Project[], Error>({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const res = await projectApi.list()
      return normalizeProjectList(res)
    },
  })
}

function normalizeProjectList(res: Project[] | Paginated<Project>): Project[] {
  if (Array.isArray(res)) return res
  return res.items ?? []
}

/** 项目详情 */
export function useProject(projectId: UUID | undefined) {
  return useQuery<Project, Error>({
    queryKey: projectId ? queryKeys.projects.detail(projectId) : ['projects', 'detail', 'idle'],
    queryFn: () => projectApi.get(projectId!),
    enabled: !!projectId,
  })
}

/** 新建项目 */
export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProjectCreateInput) => projectApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.list() }),
  })
}

/** 更新项目 */
export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: ProjectUpdateInput }) =>
      projectApi.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.list() })
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(data.id) })
    },
  })
}

/** 删除项目 */
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: UUID) => projectApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.list() }),
  })
}
