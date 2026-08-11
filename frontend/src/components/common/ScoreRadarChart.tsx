import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ContentScore } from '@/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ScoreRadarChartProps {
  before?: ContentScore | null
  after?: ContentScore | null
  className?: string
  /** 是否显示外层 Card 包装 */
  withCard?: boolean
}

/**
 * ScoreRadarChart - 6 维 GEO Scorecard 雷达图
 * 真源: chart token --chart-1（改前） / --chart-2（改后）
 */
export function ScoreRadarChart({
  before,
  after,
  className,
  withCard = true,
}: ScoreRadarChartProps) {
  if (!before || !after) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-eyebrow mb-2">6 维评分雷达</div>
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
          评分数据暂未生成
        </div>
      </Card>
    )
  }

  // 按改后维度顺序对齐改前
  const data = after.dimensions.map((dim) => {
    const beforeDim = before.dimensions.find((d) => d.name === dim.name)
    return {
      dimension: dim.name,
      改前: beforeDim?.score ?? 0,
      改后: dim.score,
    }
  })

  const chart = (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
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

  if (!withCard) return <div className={className}>{chart}</div>

  return (
    <Card className={cn('p-4', className)}>
      <div className="text-eyebrow mb-2">6 维评分雷达</div>
      {chart}
    </Card>
  )
}
