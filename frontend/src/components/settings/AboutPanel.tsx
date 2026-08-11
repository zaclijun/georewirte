/**
 * AboutPanel - 关于面板
 *
 * 展示项目信息、API Key 安全提示与技术栈。
 * 不包含商业 SaaS / 付费 / 企业版文案。
 */
import { Sparkles, ShieldAlert, Github, Code2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

const STACK = [
  'FastAPI',
  'SQLAlchemy',
  'React 18',
  'TypeScript',
  'TanStack Query',
  'shadcn/ui',
  'Tailwind CSS',
  'OpenAI-Compatible LLM',
]

export function AboutPanel() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">GEO 内容优化工作台</div>
            <div className="text-[11px] text-muted-foreground">
              Open-source GEO Content Optimization Workbench
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          基于 DSS+E 黄金模型的生成式引擎优化内容改写工具，支持多平台多视角内容生成、品牌知识库管理与质量评分。
        </p>
      </Card>

      <Card className="border-warning/40 bg-warning/5 p-4">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-sm">
            <div className="font-medium text-warning">API Key 安全提示</div>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              本项目支持使用自有模型 API Key。请勿将 API Key 提交到公开仓库（包括 .env、代码、截图）。
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-eyebrow mb-2">技术栈</div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {STACK.map((t) => (
            <span key={t} className="rounded-md border border-border bg-secondary px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Code2 className="h-3 w-3" /> 开源项目
        </span>
        <span className="inline-flex items-center gap-1">
          <Github className="h-3 w-3" /> GitHub（待发布）
        </span>
      </div>
    </div>
  )
}
