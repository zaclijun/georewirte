import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Project Workspace 上下文工具
 *
 * 目标：让 Sidebar / 顶层导航能感知「当前项目」，并提供 lastActiveProjectId 记忆能力，
 * 避免用户每次都需要重新选择项目。
 *
 * 仅前端 localStorage，不涉及后端 API。
 */

const STORAGE_KEY = 'lastActiveProjectId'

/** 从当前 URL 路径中解析 projectId（仅匹配 /projects/:projectId 段） */
export function parseProjectIdFromPath(pathname: string): string | null {
  // 命中 /projects/:projectId（不含 /projects/:projectId/...）或 /projects/:projectId/...
  const m = pathname.match(/^\/projects\/([^/]+)(?:\/.*)?$/)
  if (!m) return null
  const id = decodeURIComponent(m[1])
  // 排除新建项目表单之类路径占位
  if (!id || id === 'new') return null
  return id
}

/** 读取 lastActiveProjectId */
export function getLastActiveProjectId(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

/** 写入 lastActiveProjectId */
export function setLastActiveProjectId(id: string): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/** 清除 lastActiveProjectId */
export function clearLastActiveProjectId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * useCurrentProjectId - 从当前 URL 中读取 projectId，并同步到 localStorage。
 *
 * 行为：
 *   - URL 含 projectId 时：返回 projectId，并写入 localStorage
 *   - URL 不含 projectId 时：返回 null，不修改 localStorage
 *
 * 这样能保证用户最后一次进入的项目被记住，下次进 /projects 时可在卡片或 Sidebar 引导。
 */
export function useCurrentProjectId(): string | null {
  const location = useLocation()
  const projectId = parseProjectIdFromPath(location.pathname)
  const [stored, setStored] = useState<string | null>(() => getLastActiveProjectId())

  useEffect(() => {
    if (projectId && projectId !== stored) {
      setLastActiveProjectId(projectId)
      setStored(projectId)
    }
  }, [projectId, stored])

  return projectId
}
