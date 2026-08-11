/**
 * TanStack Query key 工厂
 * 集中管理 query key，避免各 hook 拼接字符串导致 invalidate 时漏匹配
 */
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  brandFacts: {
    all: ['brand-facts'] as const,
    list: (projectId: string) => [...queryKeys.brandFacts.all, 'list', projectId] as const,
    detail: (id: string) => [...queryKeys.brandFacts.all, 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (projectId: string, params?: Record<string, unknown>) =>
      [...queryKeys.tasks.all, 'list', projectId, params ?? {}] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
    status: (id: string) => [...queryKeys.tasks.all, 'status', id] as const,
  },
  outputs: {
    all: ['outputs'] as const,
    listByTask: (taskId: string) => [...queryKeys.outputs.all, 'task', taskId] as const,
    detail: (id: string) => [...queryKeys.outputs.all, 'detail', id] as const,
    scores: (id: string) => [...queryKeys.outputs.all, 'scores', id] as const,
  },
  modelConfigs: {
    all: ['model-configs'] as const,
    list: () => [...queryKeys.modelConfigs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.modelConfigs.all, 'detail', id] as const,
  },
} as const
