import { useState } from 'react'
import type {
  BrandFact,
  ContentAssetType,
  OutputLength,
  Perspective,
  SourcePolicy,
  UUID,
} from '@/types'
import {
  CONTENT_ASSET_TYPES,
  OUTPUT_LENGTHS,
  PERSPECTIVES_MORE,
  PERSPECTIVES_PRIMARY,
  SOURCE_POLICIES,
} from '@/common/constants'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FactSelector } from './FactSelector'
import { cn } from '@/lib/utils'

export interface RewriteConfig {
  /**
   * 内容资产类型选择（多选）：至少 1 个。单类型时数组长度为 1。
   *
   * 字段名保留 platforms 不变（底层契约兼容），值已改为内容资产类型。
   */
  platforms: ContentAssetType[]
  perspective: Perspective
  sourcePolicy: SourcePolicy
  outputLength: OutputLength
  needSchema: boolean
  brandFactIds: UUID[]
}

interface RewriteConfigPanelProps {
  value: RewriteConfig
  onChange: (next: RewriteConfig) => void
  facts: BrandFact[]
  className?: string
  /**
   * 是否隐藏内容资产类型多选区块。
   * 文章工作台中资产类型选择已上移到主流程，配置面板作为「高级设置」折叠时不再重复渲染。
   */
  hidePlatforms?: boolean
}

/**
 * RewriteConfigPanel - 新建改写任务右侧配置 Inspector
 * 真源: ui-reference/apple-style-components/preview/component-card.html Card 作容器
 * sticky + 内部分段
 */
export function RewriteConfigPanel({
  value,
  onChange,
  facts,
  className,
  hidePlatforms = false,
}: RewriteConfigPanelProps) {
  const [showMorePerspective, setShowMorePerspective] = useState(false)

  // Schema 仅对「自有官网内容」生效；其它资产类型自动隐藏开关（按类型自动处理，无需用户干预）
  const showSchemaSwitch = value.platforms.includes('自有官网内容')

  const update = <K extends keyof RewriteConfig>(key: K, v: RewriteConfig[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <Card className={cn('flex flex-col gap-5 p-5', className)}>
      {/* 内容资产类型（多选） - 文章工作台主流程已上移资产类型选择，此处可隐藏 */}
      {!hidePlatforms && (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-eyebrow">内容资产类型（可多选）</Label>
          {value.platforms.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              已选 {value.platforms.length} 类
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {CONTENT_ASSET_TYPES.map((t) => {
            const active = value.platforms.includes(t.value)
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  const next = active
                    ? value.platforms.filter((x) => x !== t.value)
                    : [...value.platforms, t.value]
                  // 至少保留 1 个类型，避免空选
                  update('platforms', next.length > 0 ? next : value.platforms)
                }}
                title={t.description}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-xs transition-all duration-200 ease-apple',
                  active
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-secondary/60',
                )}
              >
                <div className="font-medium">{t.value}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{t.shortDesc}</div>
              </button>
            )
          })}
        </div>
        {value.platforms.length > 1 && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            将为每类资产分别生成独立内容资产，预计消耗 {value.platforms.length} 次生成额度。
          </p>
        )}
      </section>
      )}

      {/* 视角 */}
      <section className="space-y-2">
        <Label className="text-eyebrow">写作视角</Label>
        <Select
          value={value.perspective}
          onValueChange={(v) => update('perspective', v as Perspective)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSPECTIVES_PRIMARY.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
            {showMorePerspective &&
              PERSPECTIVES_MORE.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {!showMorePerspective && (
          <button
            type="button"
            onClick={() => setShowMorePerspective(true)}
            className="text-[11px] text-primary hover:underline"
          >
            展开更多视角（{PERSPECTIVES_MORE.length}）
          </button>
        )}
      </section>

      {/* 来源策略 */}
      <section className="space-y-2">
        <Label className="text-eyebrow">来源策略</Label>
        <Select
          value={value.sourcePolicy}
          onValueChange={(v) => update('sourcePolicy', v as SourcePolicy)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_POLICIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {SOURCE_POLICIES.find((s) => s.value === value.sourcePolicy)?.description}
        </p>
      </section>

      {/* 输出长度 */}
      <section className="space-y-2">
        <Label className="text-eyebrow">输出长度</Label>
        <Select
          value={value.outputLength}
          onValueChange={(v) => update('outputLength', v as OutputLength)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_LENGTHS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label} · {l.hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Schema 开关：仅「自有官网内容」生效时展示，其它资产类型按类型自动处理 */}
      {showSchemaSwitch && (
        <section className="flex items-center justify-between">
          <div>
            <Label className="text-sm">生成 Schema</Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              仅自有官网内容生效；其它资产类型始终输出对应发布建议
            </p>
          </div>
          <Switch
            checked={value.needSchema}
            onCheckedChange={(v) => update('needSchema', v)}
          />
        </section>
      )}

      {/* 品牌事实选择器 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-eyebrow">品牌事实选择器</Label>
          <span className="text-[11px] text-muted-foreground">可选</span>
        </div>
        <FactSelector
          facts={facts}
          selectedIds={value.brandFactIds}
          onChange={(ids) => update('brandFactIds', ids)}
        />
      </section>
    </Card>
  )
}
