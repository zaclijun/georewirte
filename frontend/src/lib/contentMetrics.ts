/**
 * 内容规模统计 - 纯前端实现，不依赖后端新增字段
 *
 * 用于结果页展示原文 / 改写后的字数、段落数、标题数、预计阅读时长。
 */

export interface ContentMetrics {
  /** 去掉多余空白后的总字符数 */
  charCount: number
  /** CJK 字符数量（中文 + 日文 + 韩文） */
  chineseCharCount: number
  /** 英文单词数量 */
  englishWordCount: number
  /** 段落数（按空行或 markdown 段落统计） */
  paragraphCount: number
  /** markdown 标题数（# / ## / ### 等） */
  headingCount: number
  /** 预计阅读时长（分钟，最少 1） */
  estimatedReadingMinutes: number
}

const CJK_REGEX = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g
const HEADING_REGEX = /^\s{0,3}#{1,6}\s+\S/m

/**
 * 统计 markdown 文本的内容规模。
 *
 * 规则：
 *   - charCount：去掉首尾及连续空白后的总字符数（含中文、英文、标点）
 *   - chineseCharCount：匹配 CJK 字符
 *   - englishWordCount：英文单词数（按空白与标点切分）
 *   - paragraphCount：按一个或多个空行分割；非空块计 1 段
 *   - headingCount：行首匹配 # ~ ######
 *   - estimatedReadingMinutes：
 *       中文按 400 字/分钟
 *       英文按 200 words/min
 *       最少 1 分钟
 */
export function computeContentMetrics(content: string | null | undefined): ContentMetrics {
  const empty: ContentMetrics = {
    charCount: 0,
    chineseCharCount: 0,
    englishWordCount: 0,
    paragraphCount: 0,
    headingCount: 0,
    estimatedReadingMinutes: 0,
  }
  if (!content || typeof content !== 'string') return empty

  // 1. 总字符数：压缩多空白
  const collapsed = content.replace(/\s+/g, ' ').trim()
  const charCount = collapsed.length

  // 2. CJK 字符数
  const cjkMatches = content.match(CJK_REGEX)
  const chineseCharCount = cjkMatches ? cjkMatches.length : 0

  // 3. 英文单词数：去掉 CJK 后按非单词字符切分
  const nonCjk = content.replace(CJK_REGEX, ' ')
  const englishWordCount = (nonCjk.match(/[A-Za-z][A-Za-z'-]*/g) || []).length

  // 4. 段落数：按空行分割
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  const paragraphCount = paragraphs.length

  // 5. 标题数
  const headingCount = paragraphs.filter((p) => HEADING_REGEX.test(p)).length

  // 6. 预计阅读时长
  const cnMinutes = chineseCharCount / 400
  const enMinutes = englishWordCount / 200
  const totalMinutes = cnMinutes + enMinutes
  const estimatedReadingMinutes = totalMinutes < 1 ? 1 : Math.round(totalMinutes)

  return {
    charCount,
    chineseCharCount,
    englishWordCount,
    paragraphCount,
    headingCount,
    estimatedReadingMinutes,
  }
}

/** 字数变化百分比，返回如 25.7（表示 +25.7%），无原文时返回 null */
export function computeCharDeltaPercent(
  before: ContentMetrics,
  after: ContentMetrics,
): number | null {
  if (before.charCount === 0) return null
  return Math.round(((after.charCount - before.charCount) / before.charCount) * 1000) / 10
}

/**
 * 字数变化摘要文案，如 "+474 字 · +25.7%"
 */
export function formatCharDelta(before: ContentMetrics, after: ContentMetrics): string {
  const delta = after.charCount - before.charCount
  const percent = computeCharDeltaPercent(before, after)
  const sign = delta > 0 ? '+' : ''
  const percentStr = percent !== null ? ` · ${sign}${percent}%` : ''
  return `${sign}${delta.toLocaleString()} 字${percentStr}`
}

/**
 * 内容规模摘要文案，如 "1,842 字 · 12 段 · 4 个标题 · 预计 5 分钟"
 */
export function formatMetricsLine(m: ContentMetrics): string {
  return `${m.charCount.toLocaleString()} 字 · ${m.paragraphCount} 段 · ${m.headingCount} 个标题 · 预计 ${m.estimatedReadingMinutes} 分钟`
}

/**
 * 内容规模摘要（短），用于对比 Tab 顶部，如 "1,842 字 · 12 段"
 */
export function formatMetricsShort(m: ContentMetrics): string {
  return `${m.charCount.toLocaleString()} 字 · ${m.paragraphCount} 段`
}
