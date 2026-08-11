import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Check, X, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  buildPlatformScorecardData,
  type AdaptedDimension,
} from '@/lib/platformScorecard'
import type { RewriteOutput } from '@/types'

interface PlatformScorecardProps {
  output: RewriteOutput
  platform: string | undefined | null
  className?: string
}

/**
 * PlatformScorecard - 内容资产评分卡
 *
 * 根据 publish_platform 选择渲染方式（通过 platformScorecard 配置）：
 *   - radar      自有官网内容 / 官网文章（GEO 信源就绪度，6 维雷达图，含 Schema 就绪度）
 *   - bars       新闻通稿 / 行业垂媒稿 / 问答型内容 / 案例 / 企业自媒体稿 / 公众号 / 知乎（条形卡）
 *   - checklist  小红书（已下线，仅历史任务；图文脚本完整度 checklist + 条形）
 *
 * 非自有官网内容不展示 Schema 就绪度，也不因缺 Schema 扣分。
 * 问答型内容 / 小红书 / 知乎若后端无真实平台维度，则基于 PlatformPublishGuide 字段完整度估算，
 * 此时卡片顶部显示「基于发布建议完整度估算」徽标。
 */
export function PlatformScorecard({ output, platform, className }: PlatformScorecardProps) {
  const data = buildPlatformScorecardData(output, platform)
  const { config } = data

  return (
    <Card className={cn('p-4', className)}>
      {/* 标题区 */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-eyebrow">{config.title}</span>
          {data.estimated && (
            <Badge variant="muted" className="text-[10px]" title={config.subtitle}>
              基于发布建议完整度估算
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{config.subtitle}</p>
      </div>

      {/* 内容区：按 renderType 分支 */}
      {config.renderType === 'radar' && (
        <RadarView beforeDims={data.beforeDimensions} afterDims={data.afterDimensions} />
      )}

      {config.renderType === 'bars' && (
        <BarsView beforeDims={data.beforeDimensions} afterDims={data.afterDimensions} />
      )}

      {config.renderType === 'checklist' && (
        <ChecklistView
          checklist={data.checklist ?? []}
          beforeDims={data.beforeDimensions}
          afterDims={data.afterDimensions}
        />
      )}

      {/* 无数据兜底 */}
      {data.beforeDimensions.length === 0 &&
        data.afterDimensions.length === 0 &&
        (data.checklist?.length ?? 0) === 0 && (
          <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            评分数据暂未生成
          </div>
        )}
    </Card>
  )
}

// ===== 雷达图（官网文章）=====
function RadarView({
  beforeDims,
  afterDims,
}: {
  beforeDims: AdaptedDimension[]
  afterDims: AdaptedDimension[]
}) {
  if (afterDims.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        评分数据暂未生成
      </div>
    )
  }

  // 按改后维度顺序对齐改前
  const chartData = afterDims.map((after) => {
    const before = beforeDims.find((b) => b.key === after.key)
    return {
      dimension: after.label,
      改前: before?.score ?? 0,
      改后: after.score,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tickCount={5}
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
        />
        <Radar
          name="改前"
          dataKey="改前"
          stroke="hsl(var(--chart-1))"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.12}
          strokeWidth={1.5}
        />
        <Radar
          name="改后"
          dataKey="改后"
          stroke="hsl(var(--chart-2))"
          fill="hsl(var(--chart-2))"
          fillOpacity={0.22}
          strokeWidth={2}
        />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ===== 条形评分卡（公众号 / 知乎）=====
function BarsView({
  beforeDims,
  afterDims,
}: {
  beforeDims: AdaptedDimension[]
  afterDims: AdaptedDimension[]
}) {
  if (afterDims.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        评分数据暂未生成
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {afterDims.map((after) => {
        const before = beforeDims.find((b) => b.key === after.key)
        const beforeScore = before?.score ?? 0
        const delta = after.score - beforeScore
        return (
          <div key={after.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{after.label}</span>
              <span className="nums text-muted-foreground">
                <span className="text-muted-foreground/70">{beforeScore}</span>
                <span className="mx-1">→</span>
                <span className="font-medium text-foreground">{after.score}</span>
                {delta !== 0 && (
                  <span
                    className={cn(
                      'ml-1.5 text-[10px]',
                      delta > 0 ? 'text-success' : 'text-warning',
                    )}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-muted-foreground/40"
                  style={{ width: `${beforeScore}%` }}
                />
              </div>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${after.score}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ===== Checklist 评分卡（小红书）=====
function ChecklistView({
  checklist,
  beforeDims,
  afterDims,
}: {
  checklist: { label: string; value: string; ok: boolean }[]
  beforeDims: AdaptedDimension[]
  afterDims: AdaptedDimension[]
}) {
  return (
    <div className="space-y-3">
      {/* checklist：图文脚本完整度 */}
      {checklist.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-eyebrow">图文脚本完整度</div>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs">
                {item.ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-foreground">{item.label}</span>
                <span className="ml-auto nums text-muted-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 条形评分：维度概览（基于完整度估算） */}
      {afterDims.length > 0 && (
        <div className="space-y-2 border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5 text-eyebrow">
            <AlertCircle className="h-3 w-3" />
            维度概览
          </div>
          <BarsView beforeDims={beforeDims} afterDims={afterDims} />
        </div>
      )}

      {checklist.length === 0 && afterDims.length === 0 && (
        <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
          暂无图文脚本数据
        </div>
      )}
    </div>
  )
}
