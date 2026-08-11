/**
 * useWorkspaceType - 读取工作区类型
 *
 * 优先级：
 *   1. 后端 project.workspace_type（唯一权威来源）
 *   2. localStorage（兼容缓存，后端未返回时 fallback）
 *
 * 用法：
 *   const { type, meta } = useWorkspaceType(projectId)
 *
 * - projectId 变化时重新读取
 * - 旧 localStorage 数据作为 fallback，后端返回时以后端为准
 * - 未读取到时返回 null + 兜底 meta（"知识库"）
 */
import { useEffect, useState } from 'react'
import {
  getWorkspaceType,
  getWorkspaceMeta,
  type WorkspaceType,
  type WorkspaceTypeMeta,
} from '@/common/workspace'
import { useProject } from '@/hooks/useProjects'

export interface UseWorkspaceTypeResult {
  type: WorkspaceType | null
  meta: WorkspaceTypeMeta
  /** 强制刷新（创建/更新 workspace_type 后调用） */
  refresh: () => void
}

const VALID_TYPES: WorkspaceType[] = ['brand', 'professional', 'media', 'agency']

function isValidType(v: unknown): v is WorkspaceType {
  return typeof v === 'string' && (VALID_TYPES as string[]).includes(v)
}

export function useWorkspaceType(projectId: string | undefined): UseWorkspaceTypeResult {
  const [type, setType] = useState<WorkspaceType | null>(null)
  // 以后端 project.workspace_type 为准
  const { data: project } = useProject(projectId)

  const refresh = () => {
    if (!projectId) {
      setType(null)
      return
    }
    // 优先：后端 project.workspace_type
    if (project?.workspace_type && isValidType(project.workspace_type)) {
      setType(project.workspace_type)
      return
    }
    // Fallback：localStorage（旧数据兼容）
    setType(getWorkspaceType(projectId))
  }

  useEffect(() => {
    refresh()
    // 监听跨组件 localStorage 变更（同窗口不同组件 setWorkspaceType 会触发 storage 事件）
    const onStorage = (e: StorageEvent) => {
      if (e.key === `workspace_type:${projectId}`) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project?.workspace_type])

  return { type, meta: getWorkspaceMeta(type), refresh }
}
