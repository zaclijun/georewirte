/**
 * exportHtml - 前端生成 A4 风格正式交付报告（GEO 内容优化报告 / 内容质检报告）v3
 *
 * 定位：「导出 HTML」= 客户可交付的正式 A4 报告
 *   - 报告头（kicker + 标题 + 元信息含模型 + Logo）替代旧版渐变 Hero
 *   - 发布检查摘要（5 卡片 + 双栏说明）作为首屏概览
 *   - 评分诊断（Score Hero：大分数 + 等级 + 维度条）
 *   - 主要优化建议 / 待补证据与风险 / 终稿正文（含复制按钮）
 *   - 内容优化说明（保留项 / 增强项 / 删减项 / 风险处理，独立 section）
 *   - FAQ（独立问答卡片 + 前后说明，空则隐藏）
 *   - 发布建议（独立 section，PlatformPublishGuide 卡片化或附属信息）
 *   - Schema 建议（独立 section，摘要 + details 折叠完整 JSON）
 *   - 原始素材 / 初稿（后移至末尾，弱化样式）
 *   - 轻量 Markdown 渲染（标题 / 引用 / 加粗 / 列表 / 段落），先 escape 再转换
 *   - 内联 CSS，不依赖外部资源，离线可看，打印为 A4
 *   - 复制终稿正文按钮支持 file:// 离线复制（clipboard API + execCommand 兜底）
 *   - 所有用户输入内容做 HTML escape，避免注入
 *   - 旧任务 / 已下线平台兼容：历史内容资产不在首屏强调
 *
 * 不走后端 API，纯前端生成，复用结果页已加载的数据。
 */

import type { Project, RewriteOutput, RewriteTask, ContentScore } from '@/types'
import type { ContentMetrics } from '@/lib/contentMetrics'
import { cleanFinalArticle } from '@/lib/cleanArticle'
import {
  getQualityGateFromOutput,
  getQualityGateMetaForPlatform,
} from '@/lib/qualityGate'
import { getPlatformScorecardConfig } from '@/lib/platformScorecard'
import { mapPlatformToAssetType, DEPRECATED_PLATFORM_LABEL, isDeprecatedPlatform } from '@/common/workspace'

/** HTML 报告生成参数 */
export interface BuildHtmlReportArgs {
  task: RewriteTask
  output: RewriteOutput
  project?: Project | null
  beforeMetrics?: ContentMetrics
  afterMetrics?: ContentMetrics
  /** 内容资产类型（用于展示，不传则从 task.publish_platform 推断） */
  assetType?: string
}

/** HTML 报告生成结果 */
export interface BuildHtmlReportResult {
  /** 下载文件名（含 .html 扩展名） */
  filename: string
  /** 完整 HTML 字符串 */
  html: string
}

/** HTML escape：处理 & < > " ' */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 轻量 Markdown 转 HTML 渲染（不引入 markdown 库）
 *
 * 支持：标题 (#, ##, ###)、引用 (>)、加粗（双星号包裹）、无序列表 (-, *, •)、有序列表 (1.)、段落
 * 所有原始文本先 escapeHtml，再做安全转换（仅插入受控标签）
 *
 * 用于 HTML 报告的正文 / FAQ / 改写摘要展示，避免直接暴露 Markdown 符号。
 */
function renderMarkdownLikeHtml(text: string): string {
  if (!text || !text.trim()) return '<p class="empty">暂无内容</p>'

  // 1. 先 escape 全部文本
  const escaped = escapeHtml(text)

  // 2. 按行拆分处理
  const lines = escaped.split(/\r?\n/)
  const out: string[] = []
  let inUl = false
  let inOl = false
  let inBlockquote = false

  const closeUl = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
  }
  const closeOl = () => {
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }
  const closeBq = () => {
    if (inBlockquote) {
      out.push('</blockquote>')
      inBlockquote = false
    }
  }
  const closeAll = () => {
    closeUl()
    closeOl()
    closeBq()
  }

  // 行内加粗：双星号包裹 → <strong>
  const inline = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  for (const raw of lines) {
    const line = raw
    const trimmed = line.trim()

    // 空行：关闭所有打开的块
    if (trimmed === '') {
      closeAll()
      continue
    }

    // 标题 # / ## / ### / ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (headingMatch) {
      closeAll()
      const level = headingMatch[1].length
      const text = inline(headingMatch[2].trim())
      out.push(`<h${level}>${text}</h${level}>`)
      continue
    }

    // 引用 >
    const quoteMatch = trimmed.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      closeUl()
      closeOl()
      if (!inBlockquote) {
        out.push('<blockquote>')
        inBlockquote = true
      }
      out.push(`<p>${inline(quoteMatch[1])}</p>`)
      continue
    }

    // 无序列表 - / * / •
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/)
    if (ulMatch) {
      closeOl()
      closeBq()
      if (!inUl) {
        out.push('<ul>')
        inUl = true
      }
      out.push(`<li>${inline(ulMatch[1])}</li>`)
      continue
    }

    // 有序列表 1. / 2.
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (olMatch) {
      closeUl()
      closeBq()
      if (!inOl) {
        out.push('<ol>')
        inOl = true
      }
      out.push(`<li>${inline(olMatch[1])}</li>`)
      continue
    }

    // 普通段落
    closeAll()
    out.push(`<p>${inline(trimmed)}</p>`)
  }

  closeAll()
  return out.join('\n')
}

/** 格式化日期时间为 YYYY-MM-DD HH:mm */
function fmtDateTime(iso: string | undefined | null): string {
  if (!iso) return '未指定'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return escapeHtml(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 字数简写（如 1,234） */
function fmtCount(n: number | undefined): string {
  if (typeof n !== 'number') return '—'
  return n.toLocaleString()
}

/** 优先级文案映射 */
const PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

/** 优先级 CSS class */
const PRIORITY_CLASS: Record<string, string> = {
  high: 'badge-high',
  medium: 'badge-mid',
  low: 'badge-low',
}

/** 质量门禁 CSS class（用于发布状态文字着色） */
function gateClass(gate: string): string {
  const map: Record<string, string> = {
    ready: 'gate-ready',
    review: 'gate-review',
    degraded: 'gate-degraded',
    not_recommended: 'gate-blocked',
    blocked: 'gate-blocked',
  }
  return map[gate] ?? 'gate-review'
}

/** 分数 → 字母等级（A/B/C/D/E） */
function gradeFor(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'E'
}

/** 等级 → CSS class */
function gradeClass(grade: string): string {
  return `grade-${grade.toLowerCase()}`
}

/**
 * Score Hero：大分数 + 等级徽章 + 维度条。
 * variant 'before' 使用灰色调，'after' 使用蓝色强调色。
 */
function renderScoreHero(score: ContentScore | null | undefined, variant: 'before' | 'after'): string {
  if (!score || typeof score.overall !== 'number' || Number.isNaN(score.overall)) {
    return '<p class="empty">暂无评分数据</p>'
  }
  const overall = score.overall
  const grade = gradeFor(overall)
  const dims = score.dimensions ?? []
  const bigColor = variant === 'before' ? '#475569' : 'var(--report-accent)'
  const fillGradient = variant === 'before'
    ? 'linear-gradient(90deg,#94a3b8,#475569)'
    : 'linear-gradient(90deg,#60a5fa,var(--report-accent))'

  const dimItems = dims.map((d) => {
    const scoreVal = typeof d.score === 'number' ? d.score : 0
    const fillPct = Math.max(0, Math.min(100, scoreVal))
    const dGrade = gradeFor(scoreVal)
    return `<div class="dim-item">
      <div class="dim-head">
        <span class="dim-name">${escapeHtml(d.name)}</span>
        <span class="dim-score">${escapeHtml(String(d.score))}<span class="dim-grade ${gradeClass(dGrade)}">${dGrade}</span></span>
      </div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${fillPct}%;background:${fillGradient};"></div></div>
      ${d.comment ? `<div class="dim-comment">${escapeHtml(d.comment)}</div>` : ''}
    </div>`
  }).join('\n')

  return `<div class="score-hero ${variant}">
    <div class="score-hero-head">
      <span class="score-big" style="color:${bigColor};">${escapeHtml(String(overall))}</span>
      <span class="score-grade ${gradeClass(grade)}">${grade}</span>
    </div>
    <div class="score-bars">${dimItems}</div>
  </div>`
}

// ===== 发布建议（PlatformPublishGuide）可读化渲染 =====
type Guide = Record<string, unknown>

function guideText(guide: Guide, key: string): string {
  const v = guide[key]
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') return ''
  return v ? String(v) : ''
}

function guideList(guide: Guide, key: string): unknown[] {
  const v = guide[key]
  return Array.isArray(v) ? v : []
}

/** 发布建议字段卡片 */
function guideField(label: string, content: string): string {
  if (!content) return ''
  return `<div class="guide-field"><div class="guide-field-label">${escapeHtml(label)}</div><div class="guide-field-value">${renderMarkdownLikeHtml(content)}</div></div>`
}

/** 发布建议标签卡片（数组 → tag pills） */
function guideTagsField(label: string, items: unknown[]): string {
  if (!items.length) return ''
  const pills = items.map((it) => `<span class="tag">${escapeHtml(String(it))}</span>`).join('')
  return `<div class="guide-field"><div class="guide-field-label">${escapeHtml(label)}</div><div class="guide-field-value tags-row">${pills}</div></div>`
}

/** 发布建议列表卡片（数组 → ul） */
function guideListField(label: string, items: unknown[]): string {
  if (!items.length) return ''
  const lis = items.map((it) => `<li>${escapeHtml(String(it))}</li>`).join('')
  return `<div class="guide-field"><div class="guide-field-label">${escapeHtml(label)}</div><div class="guide-field-value"><ul class="clean-list">${lis}</ul></div></div>`
}

/** 图文卡片脚本渲染 */
function guideImageCards(cards: unknown[]): string {
  if (!cards.length) return ''
  const items = cards.map((c, i) => {
    const card = (c ?? {}) as Guide
    const no = guideText(card, 'card_no') || String(i + 1)
    const title = guideText(card, 'card_title')
    const text = guideText(card, 'card_text')
    const hint = guideText(card, 'layout_hint')
    return `<div class="img-card">
      <div class="img-card-head"><span class="img-card-no">第 ${escapeHtml(no)} 张</span><span class="img-card-title">${escapeHtml(title)}</span></div>
      <div class="img-card-body">${renderMarkdownLikeHtml(text)}</div>
      ${hint ? `<div class="img-card-hint">版式：${escapeHtml(hint)}</div>` : ''}
    </div>`
  }).join('')
  return `<div class="guide-field"><div class="guide-field-label">图文卡片脚本（${cards.length} 张）</div><div class="img-card-grid">${items}</div></div>`
}

/**
 * 将 PlatformPublishGuide 的 json_ld 转为可读模块。
 * 不展示原始 JSON，按字段渲染卡片。
 */
function renderPublishGuide(guide: Guide): string {
  const parts: string[] = []

  // 主要字段（P0 展示）
  parts.push(guideField('推荐标题', guideText(guide, 'recommended_title')))
  parts.push(guideField('问题式标题', guideText(guide, 'question_title')))
  parts.push(guideField('一句话结论', guideText(guide, 'one_sentence_answer')))
  parts.push(guideField('封面主文案', guideText(guide, 'cover_copy')))
  parts.push(guideField('封面副文案', guideText(guide, 'cover_subcopy')))
  parts.push(guideField('封面摘要', guideText(guide, 'cover_summary')))
  parts.push(guideField('封面画面建议', guideText(guide, 'cover_suggestion')))
  parts.push(guideField('视觉风格', guideText(guide, 'visual_style')))
  parts.push(guideField('开头钩子', guideText(guide, 'opening_hook')))
  parts.push(guideField('副标题 / 导语', guideText(guide, 'subtitle')))
  parts.push(guideField('段落排版建议', guideText(guide, 'paragraph_style')))
  parts.push(guideField('Caption 正文', guideText(guide, 'caption')))
  parts.push(guideField('评论区引导', guideText(guide, 'comment_prompt')))
  parts.push(guideField('发布建议', guideText(guide, 'publishing_notes')))
  parts.push(guideField('可复用摘要', guideText(guide, 'reusable_summary')))

  // 列表字段
  parts.push(guideListField('正文小标题', guideList(guide, 'section_titles')))
  parts.push(guideListField('回答结构', guideList(guide, 'answer_outline')))
  parts.push(guideListField('事实依据', guideList(guide, 'evidence_points')))
  parts.push(guideListField('常见误区', guideList(guide, 'misconceptions')))
  parts.push(guideListField('相关问题', guideList(guide, 'related_questions')))
  parts.push(guideListField('金句卡片建议', guideList(guide, 'quote_cards')))
  parts.push(guideListField('风险提示', guideList(guide, 'risk_notes')))

  // 标签 / 话题
  parts.push(guideTagsField('标签', guideList(guide, 'tags')))
  parts.push(guideTagsField('话题', guideList(guide, 'topics')))

  // 图文卡片脚本
  parts.push(guideImageCards(guideList(guide, 'image_card_script')))

  // 图片文字稿合集
  const transcripts = guideList(guide, 'image_text_transcript')
  if (transcripts.length) {
    const lis = transcripts.map((t) => `<li>${escapeHtml(String(t))}</li>`).join('')
    parts.push(`<div class="guide-field"><div class="guide-field-label">图片文字稿合集</div><div class="guide-field-value"><ul class="clean-list">${lis}</ul></div></div>`)
  }

  const joined = parts.filter(Boolean).join('')
  return joined || '<p class="empty">暂无发布建议</p>'
}

/** FAQ 问答对 */
interface FaqItem {
  question: string
  answer: string
}

/**
 * 将 FAQ Markdown 文本解析为问答对数组。
 *
 * 支持以下格式：
 *   - ### 问题 / ## 问题（后跟答案段落）
 *   - Q1：问题 / Q：问题（后跟 A：答案 或 普通段落）
 *   - A：答案（作为上一个问题的答案）
 *   - 普通段落紧跟在问题标题后作为答案
 *
 * 无法识别结构的文本会按段落拆分，每段作为一个 Q/A 对。
 */
function parseFaqItems(text: string): FaqItem[] {
  if (!text || !text.trim()) return []
  const lines = text.split(/\r?\n/)
  const items: FaqItem[] = []
  let currentQ = ''
  let currentA: string[] = []

  const flush = () => {
    if (currentQ) {
      items.push({ question: currentQ, answer: currentA.join('\n').trim() })
    }
    currentQ = ''
    currentA = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // ### / ## 标题作为问题
    const headingMatch = line.match(/^#{1,4}\s+(.*)$/)
    if (headingMatch) {
      // 如果已有问题和答案，先保存
      if (currentQ && currentA.length) flush()
      currentQ = headingMatch[1].trim()
      continue
    }

    // Q1：问题 / Q：问题
    const qMatch = line.match(/^Q\d*[：:]\s*(.*)$/i)
    if (qMatch) {
      if (currentQ && currentA.length) flush()
      currentQ = qMatch[1].trim()
      continue
    }

    // A：答案
    const aMatch = line.match(/^A\d*[：:]\s*(.*)$/i)
    if (aMatch) {
      currentA.push(aMatch[1].trim())
      continue
    }

    // 普通段落：如果已有问题，作为答案；否则跳过
    if (currentQ) {
      currentA.push(line)
    }
  }
  flush()
  return items
}

/**
 * 将 comparison_summary 在「附：发布附属信息」处拆分。
 *
 * - mainNotes: 主优化说明（保留项/增强项/删减项/风险处理等）
 * - appendixInfo: 律师简介 / 律所简介 / 免责声明等附属信息
 */
function splitComparisonSummary(summary: string): { mainNotes: string; appendixInfo: string } {
  if (!summary) return { mainNotes: '', appendixInfo: '' }
  // 匹配「附：发布附属信息」或「附:发布附属信息」开头的行
  const match = summary.match(/^附[：:]\s*发布附属信息/m)
  if (!match || match.index === undefined) {
    return { mainNotes: summary.trim(), appendixInfo: '' }
  }
  return {
    mainNotes: summary.slice(0, match.index).trim(),
    appendixInfo: summary.slice(match.index).trim(),
  }
}

/**
 * 生成完整 HTML 报告（A4 风格正式交付报告）。
 *
 * 所有可空字段均做 fallback 显示，旧任务兼容。
 */
export function buildHtmlReport(args: BuildHtmlReportArgs): BuildHtmlReportResult {
  const { task, output, project } = args
  const rawAssetType = args.assetType ?? mapPlatformToAssetType(task.publish_platform)
  const isDeprecated = isDeprecatedPlatform(task.publish_platform)
  // 已下线平台在报告中显示为「历史内容资产」，不在首屏强调
  const assetTypeDisplay = rawAssetType === DEPRECATED_PLATFORM_LABEL ? '历史内容资产' : rawAssetType
  const scoreConfig = getPlatformScorecardConfig(task.publish_platform)
  const gate = getQualityGateFromOutput(output, task.publish_platform)
  const gateMeta = getQualityGateMetaForPlatform(gate, task.publish_platform)

  const beforeScore = output.score_before?.overall ?? null
  const afterScore = output.score_after?.overall ?? null
  const hasScore = typeof beforeScore === 'number' || typeof afterScore === 'number'
  const delta = hasScore && typeof beforeScore === 'number' && typeof afterScore === 'number'
    ? afterScore - beforeScore
    : null

  const optimizationStrategy = output.optimization_strategy ?? []
  const missingSources = output.missing_sources ?? []
  const missingFacts = output.missing_facts ?? []

  const faqContent = output.faq_content?.trim() ?? ''
  // FAQ 开头若重复 ## FAQ 标题，剥离（模块本身已叫 FAQ）
  const faqNormalized = faqContent.replace(/^\s*#{1,6}\s*FAQ\s*\n?/i, '').trim()
  const faqItems = parseFaqItems(faqNormalized)
  const comparisonSummary = output.comparison_summary?.trim() ?? ''
  // 拆分内容优化说明与发布附属信息（律师简介 / 律所简介 / 免责声明）
  const { mainNotes: contentNotes, appendixInfo: appendixPublishInfo } = splitComparisonSummary(comparisonSummary)
  const schemaSuggestion = output.schema_suggestions
  const isPlatformGuide = schemaSuggestion?.type === 'PlatformPublishGuide'

  // 清洗后的正文（用于 HTML 报告展示与复制，保证干净；只计算一次）
  const cleanedArticle = cleanFinalArticle(output.final_article ?? '', rawAssetType)

  // 文件名：标题-日期.html（去除不安全字符）
  const safeTitle = (output.title || task.title || '内容优化报告')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 60)
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${safeTitle}-${dateStr}.html`

  // 复制按钮注入的纯文本（与 cleanedArticle 同源，JSON.stringify 安全转义）
  const FINAL_ARTICLE_JSON = JSON.stringify(cleanedArticle)

  // ===== 发布检查摘要：状态原因 + 主要优化点 =====
  const reasons: string[] = []
  if (gate === 'ready') {
    reasons.push('质量门禁通过，可发布')
  } else if (gate === 'review' || gate === 'degraded') {
    reasons.push('存在待补来源或评分未达标，建议复核')
  } else if (gate === 'blocked' || gate === 'not_recommended') {
    reasons.push('质量门禁未通过，不建议发布')
  }
  if (missingSources.length > 0) reasons.push(`仍有 ${missingSources.length} 项来源缺口`)
  if (!hasScore) reasons.push('暂无评分数据')

  const topIssues = optimizationStrategy.slice(0, 5).map((s) => s.issue)
  const mainPointsHtml = topIssues.length
    ? `<ul class="reason-list">${topIssues.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
    : '<p class="empty">暂无明显优化建议</p>'

  const reasonsHtml = reasons.length
    ? `<ul class="reason-list">${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
    : '<p class="empty">暂无状态说明</p>'

  // 评分变化着色
  const deltaCls = delta === null ? 'delta-flat' : delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-flat'
  const deltaText = delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`

  // 报告头元信息：工作区 · 内容资产类型 · 模型 · 生成日期
  const modelDisplay = task.model_display_name?.trim()
    || (task.model_provider && task.model_name ? `${task.model_provider} · ${task.model_name}` : '')
    || ''
  const headerMeta = [
    escapeHtml(project?.name ?? task.project_id ?? '未知'),
    escapeHtml(assetTypeDisplay),
    `模型：${escapeHtml(modelDisplay || '未记录')}`,
    escapeHtml(fmtDateTime(output.created_at)),
  ].join(' · ')

  // ===== 构建 HTML =====
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(output.title || task.title || 'GEO 内容优化报告')}</title>
  <style>
    :root {
      --report-accent: #2563eb;
      --report-accent-dark: #1d4ed8;
      --report-accent-soft: #eff6ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #1f2937;
      font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
    }

    /* ===== 报告容器 ===== */
    .report {
      max-width: 980px;
      margin: 24px auto;
      padding: 28px 32px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    /* ===== 报告头 ===== */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 18px;
      border-bottom: 3px solid var(--report-accent);
    }
    .report-header-left { min-width: 0; flex: 1; }
    .report-kicker {
      color: var(--report-accent);
      font-size: 12px;
      font-weight: 760;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .report-header h1 {
      font-size: 26px;
      font-weight: 750;
      margin: 0 0 10px;
      letter-spacing: -0.01em;
      color: #0f172a;
      line-height: 1.35;
      word-break: break-word;
    }
    .report-header .meta {
      font-size: 13px;
      color: #64748b;
    }
    .logo-fallback {
      font-size: 18px;
      font-weight: 760;
      color: var(--report-accent);
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    /* ===== Section ===== */
    .section {
      padding-top: 22px;
      margin-top: 22px;
      border-top: 1px solid #e2e8f0;
    }
    .section:first-of-type {
      border-top: none;
      padding-top: 0;
      margin-top: 0;
    }
    .section h2 {
      font-size: 20px;
      font-weight: 720;
      color: var(--report-accent-dark);
      margin: 0 0 12px;
    }
    .section h3 {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin: 14px 0 8px;
    }
    .section-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 14px;
    }
    .mini-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .mini-panel h3 { margin-top: 0; }

    /* ===== 发布检查摘要 ===== */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }
    .summary-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    .summary-value.gate-ready { color: #059669; }
    .summary-value.gate-review { color: #d97706; }
    .summary-value.gate-degraded { color: #d97706; }
    .summary-value.gate-blocked { color: #dc2626; }
    .summary-value.delta-up { color: #059669; }
    .summary-value.delta-down { color: #dc2626; }
    .summary-value.delta-flat { color: #64748b; }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    .reason-list {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .reason-list li { margin: 4px 0; color: #374151; }

    /* ===== Score Hero ===== */
    .score-hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .score-hero-col { min-width: 0; }
    .score-hero-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }
    .score-hero { padding: 4px 0; }
    .score-hero-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .score-big {
      font-size: 44px;
      font-weight: 800;
      line-height: 1;
    }
    .score-grade {
      font-size: 14px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
    }
    .grade-a { color: #059669; background: #ecfdf5; }
    .grade-b { color: var(--report-accent); background: var(--report-accent-soft); }
    .grade-c { color: #d97706; background: #fffbeb; }
    .grade-d { color: #ea580c; background: #fff7ed; }
    .grade-e { color: #dc2626; background: #fef2f2; }

    .score-bars { display: flex; flex-direction: column; gap: 12px; }
    .dim-item { min-width: 0; }
    .dim-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }
    .dim-name { font-size: 13px; font-weight: 600; color: #0f172a; }
    .dim-score {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .dim-grade {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
    }
    .score-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }
    .score-bar-fill {
      height: 100%;
      border-radius: 999px;
    }
    .dim-comment {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.5;
    }

    /* ===== 优化建议 ===== */
    .suggestion-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-top: 10px;
    }
    .suggestion-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .badge-high { background: #fee2e2; color: #b91c1c; }
    .badge-mid { background: #fef3c7; color: #b45309; }
    .badge-low { background: #dcfce7; color: #15803d; }
    .suggestion-issue { font-size: 15px; font-weight: 600; color: #0f172a; }
    .suggestion-action { font-size: 14px; color: #374151; margin-top: 4px; }
    .suggestion-evidence {
      font-size: 13px;
      color: #64748b;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
    }

    /* ===== 待补证据与风险 ===== */
    .risk-list { margin: 0; padding-left: 0; list-style: none; }
    .risk-list li {
      padding: 10px 14px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      margin-bottom: 8px;
      color: #92400e;
      font-size: 14px;
    }
    .risk-list li:last-child { margin-bottom: 0; }
    .fact-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 8px;
    }
    .fact-title { font-weight: 700; color: #0f172a; font-size: 15px; }
    .fact-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
    .fact-content { color: #374151; margin-top: 6px; }
    .fact-reason { font-size: 13px; color: #d97706; margin-top: 4px; }

    /* ===== 终稿正文 / 原始素材 ===== */
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }
    .section-head h2 { margin: 0; }
    .copy-final-btn {
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
      font-family: inherit;
    }
    .copy-final-btn:hover { background: #dbeafe; }
    .copy-final-btn.copied {
      border-color: #bbf7d0;
      background: #ecfdf5;
      color: #047857;
    }
    .article-body {
      font-size: 14.5px;
      line-height: 1.85;
      color: #1f2937;
      word-break: break-word;
    }
    .article-body.muted-article { color: #64748b; }
    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      color: #0f172a; font-weight: 700; margin: 16px 0 8px; line-height: 1.4;
    }
    .article-body h1 { font-size: 19px; }
    .article-body h2 { font-size: 17px; }
    .article-body h3 { font-size: 15.5px; }
    .article-body h4 { font-size: 14.5px; }
    .article-body p { margin: 10px 0; }
    .article-body ul, .article-body ol { margin: 10px 0; padding-left: 22px; }
    .article-body li { margin: 4px 0; }
    .article-body blockquote {
      margin: 12px 0;
      padding: 10px 16px;
      border-left: 3px solid #60a5fa;
      background: #eff6ff;
      border-radius: 0 8px 8px 0;
      color: #1e40af;
    }
    .article-body blockquote p { margin: 4px 0; }
    .article-body strong { font-weight: 700; color: #0f172a; }
    .article-body.empty, p.empty { color: #94a3b8; font-style: italic; }

    /* ===== 发布建议 ===== */
    .guide-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .guide-field {
      background: #f9fafb;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .guide-field-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: #64748b; margin-bottom: 6px;
    }
    .guide-field-value { font-size: 14px; color: #1f2937; line-height: 1.7; }
    .guide-field-value .article-body { font-size: 14px; }
    .guide-field-value.tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      display: inline-block; font-size: 12px; padding: 3px 10px;
      border-radius: 999px; background: #eff6ff; color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .clean-list { margin: 6px 0 0; padding-left: 18px; }
    .clean-list li { margin: 4px 0; }
    .img-card-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;
    }
    .img-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fff;
    }
    .img-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .img-card-no {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      background: #eff6ff; color: #2563eb;
    }
    .img-card-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .img-card-body { font-size: 13px; line-height: 1.7; color: #374151; }
    .img-card-body .article-body { font-size: 13px; }
    .img-card-hint { font-size: 11px; color: #94a3b8; margin-top: 6px; }
    .schema-pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
      max-height: 480px;
      overflow-y: auto;
    }

    /* ===== FAQ 问答卡片 ===== */
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .faq-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      background: #f8fafc;
    }
    .faq-q {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      font-size: 14px;
    }
    .faq-a {
      color: #374151;
      line-height: 1.75;
    }
    .faq-a p { margin: 6px 0; }
    .faq-a p:first-child { margin-top: 0; }
    .faq-a p:last-child { margin-bottom: 0; }

    /* ===== Schema 折叠 ===== */
    .schema-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    .schema-summary-row {
      display: flex;
      gap: 8px;
      margin: 4px 0;
      font-size: 13px;
    }
    .schema-summary-label {
      color: #64748b;
      min-width: 80px;
      flex-shrink: 0;
    }
    .schema-summary-value { color: #1f2937; }
    .schema-details {
      margin-top: 8px;
    }
    .schema-details > summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--report-accent);
      padding: 8px 12px;
      background: var(--report-accent-soft);
      border-radius: 8px;
      list-style: none;
      display: inline-block;
    }
    .schema-details > summary::-webkit-details-marker { display: none; }
    .schema-details[open] > summary { margin-bottom: 10px; }

    /* ===== 轻提示 ===== */
    .inline-note {
      margin-top: 12px;
      padding: 10px 12px;
      background: #eff6ff;
      border-left: 3px solid var(--report-accent);
      border-radius: 8px;
      color: #1e40af;
      font-size: 13px;
      line-height: 1.6;
    }

    /* ===== 内容优化说明 ===== */
    .content-notes-body { font-size: 14px; line-height: 1.75; color: #374151; }
    .content-notes-body p { margin: 6px 0; }
    .content-notes-body h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 14px 0 6px; }
    .content-notes-body ul, .content-notes-body ol { margin: 6px 0; padding-left: 20px; }

    /* ===== 免责声明 / Footer ===== */
    .disclaimer {
      margin-top: 32px;
      padding: 16px 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.7;
    }
    .deprecated-note {
      margin-top: 16px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
    }
    .page-footer {
      margin-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }

    /* ===== 打印 ===== */
    @page { size: A4; margin: 0; }
    @media print {
      body { background: #fff; }
      .report { max-width: none; margin: 0; border: 0; border-radius: 0; padding: 12mm; }
      .section { break-inside: avoid; }
      .copy-final-btn { display: none; }
    }

    /* ===== 移动端 ===== */
    @media (max-width: 860px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      .two-col, .score-hero-grid, .guide-grid, .img-card-grid { grid-template-columns: 1fr; }
      .report { padding: 20px 16px; }
      .report-header { flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="report">

    <!-- ===== 报告头 ===== -->
    <header class="report-header">
      <div class="report-header-left">
        <div class="report-kicker">GEO 内容优化报告</div>
        <h1>${escapeHtml(output.title || task.title || '未命名任务')}</h1>
        <div class="meta">${headerMeta}</div>
      </div>
      <div class="logo-fallback">GEO</div>
    </header>

    <!-- ===== 发布检查摘要 ===== -->
    <section class="section">
      <h2>发布检查摘要</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">发布状态</div>
          <div class="summary-value ${gateClass(gate)}">${escapeHtml(gateMeta.title)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">终稿评分</div>
          <div class="summary-value">${typeof afterScore === 'number' ? escapeHtml(String(afterScore)) : '—'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">评分变化</div>
          <div class="summary-value ${deltaCls}">${escapeHtml(deltaText)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">待补来源</div>
          <div class="summary-value">${escapeHtml(String(missingSources.length))}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">质量状态</div>
          <div class="summary-value ${gateClass(gate)}">${escapeHtml(gateMeta.title)}</div>
        </div>
      </div>
      <div class="two-col">
        <div class="mini-panel">
          <h3>为什么是这个状态</h3>
          ${reasonsHtml}
        </div>
        <div class="mini-panel">
          <h3>主要优化点</h3>
          ${mainPointsHtml}
        </div>
      </div>
    </section>

    <!-- ===== 评分诊断 ===== -->
    <section class="section">
      <h2>评分诊断</h2>
      <p class="section-desc">${escapeHtml(scoreConfig.title)} · ${escapeHtml(scoreConfig.subtitle)}</p>
      ${(!output.score_before && !output.score_after)
        ? '<p class="empty">暂无评分数据</p>'
        : `<div class="score-hero-grid">
          <div class="score-hero-col">
            <div class="score-hero-label">初稿评分</div>
            ${renderScoreHero(output.score_before, 'before')}
          </div>
          <div class="score-hero-col">
            <div class="score-hero-label">终稿评分</div>
            ${renderScoreHero(output.score_after, 'after')}
          </div>
        </div>`}
    </section>

    <!-- ===== 主要优化建议 ===== -->
    <section class="section">
      <h2>主要优化建议</h2>
      <p class="section-desc">按优先级列出已识别问题与建议动作</p>
      ${optimizationStrategy.length > 0
        ? optimizationStrategy.map((s) => `
      <div class="suggestion-item">
        <div class="suggestion-head">
          <span class="badge ${PRIORITY_CLASS[s.priority] ?? 'badge-low'}">${escapeHtml(PRIORITY_LABEL[s.priority] ?? s.priority)}</span>
          <span class="suggestion-issue">${escapeHtml(s.issue)}</span>
        </div>
        <div class="suggestion-action">${escapeHtml(s.action)}</div>
        ${s.evidence ? `<div class="suggestion-evidence">证据：${escapeHtml(s.evidence)}</div>` : ''}
      </div>`).join('\n')
        : '<p class="empty">暂无优化建议</p>'}
    </section>

    <!-- ===== 待补证据与风险 ===== -->
    <section class="section">
      <h2>待补证据与风险</h2>
      <h3>来源缺口</h3>
      ${missingSources.length > 0
        ? `<ul class="risk-list">${missingSources.map((s) => `<li>${escapeHtml(s)}</li>`).join('\n')}</ul>`
        : '<p class="empty">暂无明显来源缺口</p>'}
      <h3>待补充事实</h3>
      ${missingFacts.length > 0
        ? missingFacts.map((f) => `
      <div class="fact-item">
        <div class="fact-title">${escapeHtml(f.title)}</div>
        <div class="fact-meta">类型：${escapeHtml(f.fact_type)}</div>
        <div class="fact-content">${renderMarkdownLikeHtml(f.content)}</div>
        <div class="fact-reason">原因：${escapeHtml(f.reason)}</div>
      </div>`).join('\n')
        : '<p class="empty">暂无待补充事实</p>'}
    </section>

    <!-- ===== 终稿正文 ===== -->
    <section class="section">
      <div class="section-head">
        <h2>终稿正文</h2>
        <button class="copy-final-btn" data-copy-final type="button">复制终稿正文</button>
      </div>
      <div class="article-body">${renderMarkdownLikeHtml(cleanedArticle)}</div>
    </section>

    <!-- ===== 内容优化说明 ===== -->
    ${contentNotes ? `
    <section class="section">
      <h2>内容优化说明</h2>
      <p class="section-desc">终稿相对原始素材的保留项、增强项、删减项与风险处理说明。</p>
      <div class="content-notes-body">${renderMarkdownLikeHtml(contentNotes)}</div>
    </section>` : ''}

    <!-- ===== FAQ ===== -->
    ${faqItems.length > 0 ? `
    <section class="section faq-section">
      <h2>FAQ</h2>
      <p class="section-desc">以下问答可作为官网 FAQ 模块、搜索问答素材或结构化数据基础。</p>
      <div class="faq-list">
        ${faqItems.map((item, i) => `
        <div class="faq-item">
          <div class="faq-q">Q${i + 1}：${escapeHtml(item.question)}</div>
          <div class="faq-a">${renderMarkdownLikeHtml(item.answer)}</div>
        </div>`).join('\n')}
      </div>
      <div class="inline-note">FAQ 可进一步映射为 FAQPage Schema，发布前请确认问答中的事实、法条和案例信息准确无误。</div>
    </section>` : ''}

    <!-- ===== 发布建议 ===== -->
    ${(isPlatformGuide || appendixPublishInfo) ? `
    <section class="section">
      <h2>发布建议</h2>
      ${isPlatformGuide && schemaSuggestion ? `<div class="guide-grid">${renderPublishGuide((schemaSuggestion.json_ld ?? {}) as Guide)}</div>` : ''}
      ${(!isPlatformGuide && appendixPublishInfo) ? `<div class="content-notes-body">${renderMarkdownLikeHtml(appendixPublishInfo)}</div>` : ''}
      ${(isPlatformGuide && appendixPublishInfo) ? `<div class="content-notes-body" style="margin-top:14px;">${renderMarkdownLikeHtml(appendixPublishInfo)}</div>` : ''}
    </section>` : ''}

    <!-- ===== Schema 建议 ===== -->
    ${(schemaSuggestion && !isPlatformGuide) ? `
    <section class="section">
      <h2>Schema 建议</h2>
      <div class="schema-summary">
        <div class="schema-summary-row"><span class="schema-summary-label">推荐类型</span><span class="schema-summary-value">${escapeHtml(String((schemaSuggestion.json_ld as Record<string, unknown> | null)?.['@type'] ?? schemaSuggestion.type ?? 'Schema'))}</span></div>
        <div class="schema-summary-row"><span class="schema-summary-label">用途</span><span class="schema-summary-value">帮助搜索引擎和生成式 AI 理解作者、主题、FAQ 与发布主体，提升内容被引用与采信的概率。</span></div>
      </div>
      <details class="schema-details">
        <summary>查看完整 Schema JSON</summary>
        <pre class="schema-pre">${escapeHtml(JSON.stringify(schemaSuggestion.json_ld, null, 2))}</pre>
      </details>
    </section>` : ''}

    <!-- ===== 原始素材 / 初稿 ===== -->
    <section class="section">
      <h2>原始素材 / 初稿</h2>
      <p class="section-desc">以下为导入时的原始素材，仅用于对照与追溯。</p>
      <div class="article-body muted-article">${renderMarkdownLikeHtml(task.original_content ?? '')}</div>
    </section>

    <!-- ===== 免责声明 ===== -->
    <div class="disclaimer">
      本报告由 AI 辅助生成，仅用于内容优化与人工复核参考。涉及事实、数据、案例、来源和合规表述，请在正式发布前进行人工确认。
    </div>

    ${isDeprecated ? `<div class="deprecated-note">该结果来自旧版本任务，仅用于历史查看。</div>` : ''}

    <div class="page-footer">
      由 GEO Rewrite 工作台生成 · ${escapeHtml(dateStr)}
    </div>

  </div>

  <script>
    (function () {
      var FINAL_ARTICLE_TEXT = ${FINAL_ARTICLE_JSON};
      var btn = document.querySelector('[data-copy-final]');
      if (!btn) return;
      function copyText(value) {
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(value);
        }
        return new Promise(function (resolve) {
          var ta = document.createElement('textarea');
          ta.value = value;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          resolve(ok);
        });
      }
      btn.addEventListener('click', function () {
        var oldText = btn.textContent;
        copyText(FINAL_ARTICLE_TEXT).then(function () {
          btn.textContent = '已复制';
          btn.classList.add('copied');
          setTimeout(function () { btn.textContent = oldText; btn.classList.remove('copied'); }, 1600);
        }, function () {
          btn.textContent = '复制失败，请手动选择正文';
          setTimeout(function () { btn.textContent = oldText; }, 2000);
        });
      });
    })();
  </script>
</body>
</html>`

  return { filename, html }
}
