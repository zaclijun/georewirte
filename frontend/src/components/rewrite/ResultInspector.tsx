import type { RewriteOutput } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PlatformScorecard,
  SourceGapList,
  StrategyList,
} from '@/components/common'
import { Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultInspectorProps {
  output: RewriteOutput
  /** 任务发布平台，用于平台化评分卡渲染 */
  platform?: string | null
  className?: string
  /** 跳转到事实库新建 */
  onAddFact?: (suggestion: RewriteOutput['missing_facts'][number]) => void
}

/**
 * ResultInspector - 改写结果页右侧信息面板 ⭐
 *
 * 信息层级（Apple 风格）：
 *   - 质量状态、评分对比已上移至正文顶部的 ResultHeroBand，此处不重复
 *   - 本面板聚焦"诊断细节"：内容资产评分卡 / 优化策略 / 来源缺口 / 待补充事实
 *   - sticky 偏移统一用 .workspace-sticky（--workspace-sticky-top）
 *
 * 内容资产评分卡 PlatformScorecard（按 publish_platform 选择配置）：
 *   - 自有官网内容           → GEO 信源就绪度（雷达图，含 Schema 就绪度）
 *   - 新闻通稿 / 权威背书稿   → 权威传播就绪度（条形卡）
 *   - 行业垂媒稿             → 行业语境适配度（条形卡）
 *   - 问答型内容             → 问答覆盖度（条形卡）
 *   - 案例 / 客户故事         → 案例可信度（条形卡）
 *   - 企业自媒体稿           → 自媒体发布就绪度（条形卡）
 *   - 旧平台值（官网文章/公众号/知乎问答/小红书）通过 mapPlatformToAssetType 映射展示
 *
 * 真源: ui-reference/apple-style-components/preview/component-card.html Card 多子段容器
 */
export function ResultInspector({ output, platform, className, onAddFact }: ResultInspectorProps) {
  return (
    <aside
      className={cn(
        'workspace-sticky flex flex-col gap-3 pr-1',
        '[&_.text-eyebrow]:text-[12px]',
        className,
      )}
      aria-label="改写结果 Inspector"
    >
      {/* 平台化评分卡 */}
      <PlatformScorecard output={output} platform={platform} />

      {/* 优化策略 */}
      <StrategyList strategies={output.optimization_strategy} />

      {/* 待补充来源 */}
      <SourceGapList missingSources={output.missing_sources} />

      {/* 待补充事实 */}
      <Card className="border-border/60 bg-card p-4 shadow-none">
        <div className="text-eyebrow mb-3">待补充事实</div>
        {!output.missing_facts?.length ? (
          <div className="py-2 text-sm text-muted-foreground">暂无待补充事实</div>
        ) : (
          <ul className="space-y-3">
            {output.missing_facts.map((fact, idx) => (
              <li key={idx} className="rounded-lg border border-border/50 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{fact.title}</span>
                  </div>
                  <Badge variant="muted" className="text-[10px]">
                    {fact.fact_type}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {fact.content}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                  <span className="text-eyebrow mr-1">理由</span>
                  {fact.reason}
                </p>
                {onAddFact && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 px-2 text-[11px] text-primary"
                    onClick={() => onAddFact(fact)}
                  >
                    <Plus className="h-3 w-3" />
                    加入事实库
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </aside>
  )
}
