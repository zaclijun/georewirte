import type { SchemaSuggestion } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * PlatformPublishGuideView - 渲染平台发布建议（PlatformPublishGuide）
 *
 * 不直接显示黑底 JSON，按 platform 分支以卡片方式展示：
 * - 公众号（企业自媒体稿旧值）：推荐主标题 / 副标题 / 封面摘要 / 开头钩子 / 正文小标题 / 封面建议 / 金句卡片 / 评论区引导 / 风险提示 / 可复用摘要
 * - 小红书（已下线，仅历史任务展示）：小红书标题 / 封面主文案 / 封面副文案 / 封面建议 / 视觉风格 / 图文卡片脚本 / 图片文字稿合集 / Caption / 标签 / 话题 / 评论区引导 / 风险提示 / 建议关联官网原文
 * - 知乎问答（问答型内容旧值）：问题式标题 / 一句话结论 / 回答结构 / 事实依据 / 常见误区 / 相关问题 / 发布建议 / 风险提示 / 可复用摘要
 *
 * 仅做展示，不改业务逻辑。新任务使用新的内容资产类型，发布建议结构由后端 Prompt 契约决定。
 */
interface PlatformPublishGuideViewProps {
  suggestion: SchemaSuggestion
}

type Guide = Record<string, unknown>

export function PlatformPublishGuideView({ suggestion }: PlatformPublishGuideViewProps) {
  const guide = (suggestion.json_ld ?? {}) as Guide
  const platform = String(guide.platform ?? '')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="default">发布建议</Badge>
        {platform && <span className="text-sm text-muted-foreground">{platform}</span>}
        {typeof guide.package_type === 'string' && (
          <span className="text-[11px] text-muted-foreground">{guide.package_type}</span>
        )}
      </div>

      {platform === '公众号' && <WeChatGuide guide={guide} />}
      {platform === '小红书' && <XHSGuide guide={guide} />}
      {platform === '知乎问答' && <ZhihuGuide guide={guide} />}
      {!platform && <FallbackGuide guide={guide} />}
    </div>
  )
}

// ---------- 通用字段卡片（交付清单风格） ----------
function FieldCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-primary/60" />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="text-[14px] leading-[1.7] text-foreground">{children}</div>
    </Card>
  )
}

function StringList({ items }: { items: unknown[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge key={i} variant="outline" className="text-[11px] font-normal">
          {String(it)}
        </Badge>
      ))}
    </div>
  )
}

function getText(guide: Guide, key: string): string {
  const v = guide[key]
  return typeof v === 'string' ? v : v ? String(v) : ''
}

function getList(guide: Guide, key: string): unknown[] {
  const v = guide[key]
  return Array.isArray(v) ? v : []
}

// ---------- 公众号 ----------
function WeChatGuide({ guide }: { guide: Guide }) {
  const quoteCards = getList(guide, 'quote_cards')
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {getText(guide, 'recommended_title') && (
        <FieldCard label="推荐主标题">{getText(guide, 'recommended_title')}</FieldCard>
      )}
      {getText(guide, 'subtitle') && (
        <FieldCard label="副标题 / 导语">{getText(guide, 'subtitle')}</FieldCard>
      )}
      {getText(guide, 'cover_summary') && (
        <FieldCard label="封面摘要">{getText(guide, 'cover_summary')}</FieldCard>
      )}
      {getText(guide, 'opening_hook') && (
        <FieldCard label="开头钩子">{getText(guide, 'opening_hook')}</FieldCard>
      )}
      {getList(guide, 'section_titles').length > 0 && (
        <FieldCard label="正文小标题">
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            {getList(guide, 'section_titles').map((t, i) => (
              <li key={i}>{String(t)}</li>
            ))}
          </ol>
        </FieldCard>
      )}
      {getText(guide, 'paragraph_style') && (
        <FieldCard label="段落排版建议">{getText(guide, 'paragraph_style')}</FieldCard>
      )}
      {getText(guide, 'cover_suggestion') && (
        <FieldCard label="封面建议">{getText(guide, 'cover_suggestion')}</FieldCard>
      )}
      {quoteCards.length > 0 && (
        <FieldCard label="金句卡片建议">
          <ul className="space-y-1.5">
            {quoteCards.map((q, i) => (
              <li key={i} className="border-l-2 border-primary/40 pl-2 italic">
                {String(q)}
              </li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getText(guide, 'comment_prompt') && (
        <FieldCard label="评论区引导">{getText(guide, 'comment_prompt')}</FieldCard>
      )}
      {getList(guide, 'risk_notes').length > 0 && (
        <FieldCard label="风险提示">
          <ul className="ml-4 list-disc space-y-1">
            {getList(guide, 'risk_notes').map((r, i) => (
              <li key={i}>{String(r)}</li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getText(guide, 'reusable_summary') && (
        <FieldCard label="可复用摘要">{getText(guide, 'reusable_summary')}</FieldCard>
      )}
    </div>
  )
}

// ---------- 小红书 ----------
function XHSGuide({ guide }: { guide: Guide }) {
  const cards = getList(guide, 'image_card_script')
  const transcripts = getList(guide, 'image_text_transcript')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {getText(guide, 'recommended_title') && (
          <FieldCard label="小红书标题">{getText(guide, 'recommended_title')}</FieldCard>
        )}
        {getText(guide, 'cover_copy') && (
          <FieldCard label="封面主文案">{getText(guide, 'cover_copy')}</FieldCard>
        )}
        {getText(guide, 'cover_subcopy') && (
          <FieldCard label="封面副文案">{getText(guide, 'cover_subcopy')}</FieldCard>
        )}
        {getText(guide, 'cover_suggestion') && (
          <FieldCard label="封面画面建议">{getText(guide, 'cover_suggestion')}</FieldCard>
        )}
        {getText(guide, 'visual_style') && (
          <FieldCard label="视觉风格">{getText(guide, 'visual_style')}</FieldCard>
        )}
      </div>

      {cards.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary/60" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              图文卡片脚本（{cards.length} 张）
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {cards.map((c, i) => {
              const card = (c ?? {}) as Guide
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Badge variant="muted" className="text-[10px]">
                      第 {String(card.card_no ?? i + 1)} 张
                    </Badge>
                    <span className="text-[13px] font-semibold text-foreground">
                      {getText(card, 'card_title')}
                    </span>
                  </div>
                  <p className="text-[13px] leading-[1.7] text-foreground/90">
                    {getText(card, 'card_text')}
                  </p>
                  {getText(card, 'layout_hint') && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      排版：{getText(card, 'layout_hint')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {transcripts.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary/60" />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              图片文字稿合集
            </div>
          </div>
          <div className="space-y-2">
            {transcripts.map((t, i) => (
              <div
                key={i}
                className="rounded border-l-2 border-primary/30 bg-secondary/20 px-3 py-2 text-[13px] leading-[1.7] text-foreground/90"
              >
                {String(t)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {getText(guide, 'caption') && (
        <FieldCard label="Caption 正文">{getText(guide, 'caption')}</FieldCard>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {getList(guide, 'tags').length > 0 && (
          <FieldCard label="标签">
            <StringList items={getList(guide, 'tags')} />
          </FieldCard>
        )}
        {getList(guide, 'topics').length > 0 && (
          <FieldCard label="话题">
            <StringList items={getList(guide, 'topics')} />
          </FieldCard>
        )}
        {getText(guide, 'comment_prompt') && (
          <FieldCard label="评论区引导">{getText(guide, 'comment_prompt')}</FieldCard>
        )}
        {getList(guide, 'risk_notes').length > 0 && (
          <FieldCard label="风险提示">
            <ul className="ml-4 list-disc space-y-1">
              {getList(guide, 'risk_notes').map((r, i) => (
                <li key={i}>{String(r)}</li>
              ))}
            </ul>
          </FieldCard>
        )}
        {getText(guide, 'reusable_summary') && (
          <FieldCard label="可复用摘要">{getText(guide, 'reusable_summary')}</FieldCard>
        )}
        {getText(guide, 'canonical_content_suggestion') && (
          <FieldCard label="建议关联官网原文">
            {getText(guide, 'canonical_content_suggestion')}
          </FieldCard>
        )}
      </div>
    </div>
  )
}

// ---------- 知乎 ----------
function ZhihuGuide({ guide }: { guide: Guide }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {getText(guide, 'question_title') && (
        <FieldCard label="问题式标题">{getText(guide, 'question_title')}</FieldCard>
      )}
      {getText(guide, 'one_sentence_answer') && (
        <FieldCard label="一句话结论">{getText(guide, 'one_sentence_answer')}</FieldCard>
      )}
      {getList(guide, 'answer_outline').length > 0 && (
        <FieldCard label="回答结构">
          <ol className="ml-4 list-decimal space-y-1">
            {getList(guide, 'answer_outline').map((p, i) => (
              <li key={i}>{String(p)}</li>
            ))}
          </ol>
        </FieldCard>
      )}
      {getList(guide, 'evidence_points').length > 0 && (
        <FieldCard label="事实依据">
          <ul className="ml-4 list-disc space-y-1">
            {getList(guide, 'evidence_points').map((p, i) => (
              <li key={i}>{String(p)}</li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getList(guide, 'misconceptions').length > 0 && (
        <FieldCard label="常见误区">
          <ul className="ml-4 list-disc space-y-1">
            {getList(guide, 'misconceptions').map((p, i) => (
              <li key={i}>{String(p)}</li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getList(guide, 'related_questions').length > 0 && (
        <FieldCard label="相关问题">
          <ul className="ml-4 list-disc space-y-1">
            {getList(guide, 'related_questions').map((p, i) => (
              <li key={i}>{String(p)}</li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getText(guide, 'publishing_notes') && (
        <FieldCard label="发布建议">{getText(guide, 'publishing_notes')}</FieldCard>
      )}
      {getList(guide, 'risk_notes').length > 0 && (
        <FieldCard label="风险提示">
          <ul className="ml-4 list-disc space-y-1">
            {getList(guide, 'risk_notes').map((r, i) => (
              <li key={i}>{String(r)}</li>
            ))}
          </ul>
        </FieldCard>
      )}
      {getText(guide, 'reusable_summary') && (
        <FieldCard label="可复用摘要">{getText(guide, 'reusable_summary')}</FieldCard>
      )}
    </div>
  )
}

// ---------- 兜底（未知平台 / 结构异常） ----------
function FallbackGuide({ guide }: { guide: Guide }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        平台发布建议（原始结构）
      </div>
      <pre className="overflow-auto rounded bg-secondary/40 p-3 text-xs leading-relaxed">
        {JSON.stringify(guide, null, 2)}
      </pre>
    </Card>
  )
}
