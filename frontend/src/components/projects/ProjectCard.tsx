import { Link } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import type { Project } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { relativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getWorkspaceMeta } from '@/common/workspace'

interface ProjectCardProps {
  project: Project
  className?: string
}

/**
 * ProjectCard - 工作台卡片
 *
 * 设计目标：让用户像"进入工作空间"一样点击，而不是看 KPI。
 * - 顶部：类型徽标 + brand_name（如有）
 * - 中部：工作区名称 + 一句描述
 * - 底部：任务数 + 最近更新时间
 * - 整张卡片可点击进入 /projects/:projectId
 *
 * 类型徽标动态：
 *   brand        → 品牌
 *   professional → 专业服务
 *   media        → 自媒体
 *   agency       → 服务商
 *   unknown      → 通用
 */
export function ProjectCard({ project, className }: ProjectCardProps) {
  // 直接使用后端返回的 project.workspace_type，避免 N+1 查询
  const meta = getWorkspaceMeta(project.workspace_type)

  return (
    <Card
      className={cn(
        'group flex flex-col gap-3 p-5 transition-all duration-200 ease-apple hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-md',
        className,
      )}
    >
      <Link
        to={`/projects/${project.id}`}
        className="flex flex-1 flex-col gap-3"
        aria-label={`进入 ${project.name}`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="text-[10px]">
              {meta.shortLabel}
            </Badge>
            {project.brand_name && meta.value !== project.brand_name && (
              <span className="text-eyebrow">{project.brand_name}</span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{project.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.description || '暂无描述'}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="nums">{project.task_count ?? 0}</span> 任务
          </span>
          <span className="ml-auto">
            {project.last_task_at ? relativeTime(project.last_task_at) : '暂无任务'}
          </span>
        </div>
      </Link>

      <div className="flex items-center justify-end">
        <Link
          to={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-90 transition-opacity group-hover:opacity-100"
        >
          进入
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  )
}
