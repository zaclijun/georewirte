import { ExternalLink, Pencil, Tag } from 'lucide-react'
import type { BrandFact } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { FACT_TYPES, EVIDENCE_LEVELS, SOURCE_TYPES } from '@/common/constants'
import { cn } from '@/lib/utils'

interface BrandFactCardProps {
  fact: BrandFact
  onEdit?: (fact: BrandFact) => void
  onToggleActive?: (fact: BrandFact, next: boolean) => void
  className?: string
}

/**
 * BrandFactCard - 品牌事实卡片
 * 真源: ui-reference/apple-style-components/preview/component-card.html Card 改造
 * header（title + type tag + evidence badge）+ body（摘要）+ footer（tags + toggle + edit）
 */
export function BrandFactCard({ fact, onEdit, onToggleActive, className }: BrandFactCardProps) {
  const factTypeMeta = FACT_TYPES.find((t) => t.value === fact.fact_type)
  const evidenceMeta = EVIDENCE_LEVELS.find((e) => e.value === fact.evidence_level)
  const sourceMeta = SOURCE_TYPES.find((s) => s.value === fact.source_type)

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-5 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft-md',
        !fact.is_active && 'opacity-60',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug tracking-tight">{fact.title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {factTypeMeta && (
            <Badge variant={factTypeMeta.color as never} className="text-[10px]">
              {factTypeMeta.label}
            </Badge>
          )}
          {evidenceMeta && (
            <Badge variant={evidenceMeta.color} className="text-[10px]">
              {evidenceMeta.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{fact.content}</p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{sourceMeta?.label}</span>
        {fact.source_url && (
          <a
            href={fact.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            来源链接
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Tags */}
      {fact.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fact.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={fact.is_active}
            onCheckedChange={(next) => onToggleActive?.(fact, next)}
          />
          {fact.is_active ? '启用' : '停用'}
        </label>
        <button
          type="button"
          onClick={() => onEdit?.(fact)}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Pencil className="h-3 w-3" />
          编辑
        </button>
      </div>
    </Card>
  )
}
