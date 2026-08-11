import { useMemo, useState } from 'react'
import { Search, X, Check } from 'lucide-react'
import type { BrandFact, UUID } from '@/types'
import { FACT_TYPES } from '@/common/constants'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FactSelectorProps {
  facts: BrandFact[]
  selectedIds: UUID[]
  onChange: (ids: UUID[]) => void
  className?: string
}

/**
 * FactSelector - 品牌事实选择器
 * 顶部搜索框 + 列表（checkbox + 标题 + 类型标签） + 已选区 chip
 */
export function FactSelector({ facts, selectedIds, onChange, className }: FactSelectorProps) {
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return facts
    return facts.filter(
      (f) =>
        f.title.toLowerCase().includes(kw) ||
        f.content.toLowerCase().includes(kw) ||
        f.tags.some((t) => t.toLowerCase().includes(kw)),
    )
  }, [facts, keyword])

  const selectedSet = new Set(selectedIds)

  const toggle = (id: UUID) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const selectedFacts = facts.filter((f) => selectedSet.has(f.id))

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索事实标题、内容、标签"
        className="h-8 text-xs"
      />

      {selectedFacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFacts.map((f) => {
            const typeMeta = FACT_TYPES.find((t) => t.value === f.fact_type)
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
              >
                {typeMeta?.label} · {f.title}
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  className="rounded-full hover:bg-primary/20"
                  aria-label="移除"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {keyword ? '未找到匹配的事实' : '暂无可用事实'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((fact) => {
              const isSelected = selectedSet.has(fact.id)
              const typeMeta = FACT_TYPES.find((t) => t.value === fact.fact_type)
              return (
                <li key={fact.id}>
                  <button
                    type="button"
                    onClick={() => toggle(fact.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground">
                          {fact.title}
                        </span>
                        {typeMeta && (
                          <Badge variant={typeMeta.color as never} className="shrink-0 text-[9px]">
                            {typeMeta.label}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {fact.content}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>已选 {selectedIds.length} 条</span>
        <span>共 {facts.length} 条</span>
      </div>
    </div>
  )
}
