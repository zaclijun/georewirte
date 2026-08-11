/**
 * 质量闸门 Quality Gate - 根据改写前后分数、review_status、来源缺口、正文污染判断交付就绪度
 *
 * 注意：task.status === 'completed' 仅代表任务执行完成，不代表内容 ready。
 * ready/review/degraded/not_recommended/blocked 是交付质量状态，两个概念要区分。
 */

import type { RewriteOutput } from '@/types'

export type QualityGateStatus =
  | 'ready'
  | 'review'
  | 'degraded'
  | 'not_recommended'
  | 'blocked'

export interface QualityGateMeta {
  /** 短标签，如「可使用」「建议复核」 */
  label: string
  /** 标题，如「分数下降，需检查」 */
  title: string
  /** 解释说明 */
  description: string
  /** 颜色 variant，对应 Badge 的 variant */
  color: 'success' | 'warning' | 'destructive' | 'muted'
}

export const QUALITY_GATE_META: Record<QualityGateStatus, QualityGateMeta> = {
  ready: {
    label: '可使用',
    title: '可使用',
    description: '改写后质量评分提升，结构与平台适配度较好。',
    color: 'success',
  },
  review: {
    label: '建议复核',
    title: '建议复核',
    description: '改写结果基本可用，但建议人工检查事实、来源和表达边界。',
    color: 'warning',
  },
  degraded: {
    label: '分数下降',
    title: '分数下降，需检查',
    description:
      '改写后评分低于原文，建议重点检查事实密度、来源可信度和关键实体是否被删减。',
    color: 'warning',
  },
  not_recommended: {
    label: '不建议发布',
    title: '不建议直接发布',
    description: '改写后评分明显低于原文，请重新优化或保留原文，仅使用发布建议。',
    color: 'destructive',
  },
  blocked: {
    label: '需修复',
    title: '正文异常，需修复',
    description:
      '检测到正文中混入 FAQ、Schema、免责声明或其他非正文模块，请重新生成或人工修复。',
    color: 'destructive',
  },
}

/**
 * 平台化 Quality Gate Meta：
 *   - 官网文章 → 「GEO 评分下降，需检查」
 *   - 公众号 / 小红书 / 知乎 → 「发布就绪度下降，需检查」
 *
 * 自媒体平台不出现「Schema 就绪度下降」字样。
 */
export function getQualityGateMetaForPlatform(
  status: QualityGateStatus,
  platform: string | undefined | null,
): QualityGateMeta {
  const base = QUALITY_GATE_META[status]
  // 自媒体平台（公众号 / 小红书 / 知乎）的下降文案改为「发布就绪度」
  const isSelfMedia =
    platform === '公众号' || platform === '小红书' || platform === '知乎问答'
  if (!isSelfMedia) return base

  if (status === 'degraded') {
    return {
      ...base,
      title: '发布就绪度下降，需检查',
      description:
        '改写后发布就绪度低于原文，建议重点检查标题、首屏、移动端可读性和表达边界。',
    }
  }
  if (status === 'not_recommended') {
    return {
      ...base,
      title: '不建议直接发布',
      description: '改写后发布就绪度明显低于原文，请重新优化或保留原文，仅使用发布建议。',
    }
  }
  return base
}

/**
 * 文章污染检测模式 - 与 RewriteResultPage 内部保持一致
 */
const POLLUTION_PATTERNS = [
  '## FAQ',
  '## 常见问题',
  '## 律师简介',
  '## 律所简介',
  '## 品牌简介',
  '## 免责声明',
  '## Schema',
  'Q1',
  'Q2',
  'Q3',
]

export function detectArticlePollution(article: string): boolean {
  if (!article) return false
  return POLLUTION_PATTERNS.some((p) => article.includes(p))
}

/**
 * 质量闸门判断（平台化阈值）
 *
 * 官网文章与自媒体平台使用不同阈值：
 *   官网文章：GEO 评分下降含义更重
 *     delta <= -8 → not_recommended
 *     delta <= -3 → degraded
 *   公众号 / 小红书 / 知乎：发布就绪度下降含义较轻
 *     delta <= -6 → not_recommended
 *     delta <= -2 → degraded
 *   两者：
 *     delta <= +2 → review
 *     其余 → ready（有来源缺口且 < 85 时仍 review）
 *
 * 规则（按优先级）：
 *   1. pollutionDetected → blocked
 *   2. delta <= notRecommendedThreshold → not_recommended
 *   3. delta <= degradedThreshold → degraded
 *   4. delta <= +2 → review
 *   5. missingSources.length > 0 && scoreAfter < 85 → review
 *   6. 其余 → ready
 */
export function getQualityGate(
  scoreBefore: number | null | undefined,
  scoreAfter: number | null | undefined,
  _reviewStatus: RewriteOutput['review_status'],
  missingSources: string[] | null | undefined,
  pollutionDetected: boolean,
  platform?: string | null,
): QualityGateStatus {
  if (pollutionDetected) return 'blocked'

  const before = typeof scoreBefore === 'number' ? scoreBefore : 0
  const after = typeof scoreAfter === 'number' ? scoreAfter : 0
  const delta = after - before

  // 平台化阈值：官网 GEO 评分下降与自媒体发布就绪度下降含义不同
  const isSelfMedia =
    platform === '公众号' || platform === '小红书' || platform === '知乎问答'
  const notRecommendedThreshold = isSelfMedia ? -6 : -8
  const degradedThreshold = isSelfMedia ? -2 : -3

  if (before > 0 && delta <= notRecommendedThreshold) return 'not_recommended'
  if (before > 0 && delta <= degradedThreshold) return 'degraded'
  if (delta <= 2) return 'review'
  if ((missingSources?.length ?? 0) > 0 && after < 85) return 'review'
  return 'ready'
}

/**
 * 从 RewriteOutput 提取判断所需参数并计算 Quality Gate
 */
export function getQualityGateFromOutput(
  output: RewriteOutput,
  platform?: string | null,
): QualityGateStatus {
  const before = output.score_before?.overall
  const after = output.score_after?.overall
  const polluted = detectArticlePollution(output.final_article ?? '')
  return getQualityGate(before, after, output.review_status, output.missing_sources, polluted, platform)
}

/** 评分差值，正数表示提升，负数表示下降 */
export function getScoreDelta(output: RewriteOutput): number | null {
  const before = output.score_before?.overall
  const after = output.score_after?.overall
  if (typeof before !== 'number' || typeof after !== 'number') return null
  return after - before
}

/**
 * 维度下降排行：返回下降最大的 3 个维度
 * 形如 [{ name, before, after, delta }]
 */
export interface DimensionDelta {
  name: string
  before: number
  after: number
  delta: number
}

export function getTopDeclinedDimensions(output: RewriteOutput): DimensionDelta[] {
  const beforeDims = output.score_before?.dimensions ?? []
  const afterDims = output.score_after?.dimensions ?? []
  if (beforeDims.length === 0 || afterDims.length === 0) return []

  const afterMap = new Map(afterDims.map((d) => [d.name, d.score]))
  const deltas: DimensionDelta[] = []
  for (const b of beforeDims) {
    const aScore = afterMap.get(b.name)
    if (typeof aScore === 'number' && typeof b.score === 'number') {
      deltas.push({ name: b.name, before: b.score, after: aScore, delta: aScore - b.score })
    }
  }
  // 只取下降的，按 delta 升序（下降最多在前），取前 3
  return deltas
    .filter((d) => d.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3)
}
