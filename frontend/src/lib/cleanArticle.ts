/**
 * cleanArticle - 纯净正文清洗
 *
 * 定位：「复制正文」= 纯净发布正文
 *   - 去掉 Markdown 标题符号 # / ## / ###（保留标题文本）
 *   - 去掉代码围栏 ```markdown / ```html / ```
 *   - 去掉 HTML 标签（保留标签内文本）
 *   - 去掉报告型独立标题行（内容摘要 / 开头钩子 / 正文 / 收藏评论引导 等）
 *   - 去掉普通话题 # 号（#智能客服 → 智能客服），避免误伤 C# / F#
 *   - 列表符号 - / * → • ，数字列表保留
 *   - 清理多余空行（连续 3+ 空行压缩为 2）
 *
 * 不处理为 HTML，不额外添加系统说明。
 * 清洗后可直接粘贴到公众号 / 官网编辑器 / 飞书文档 / Word。
 */

/** 报告型独立标题行黑名单（去除 Markdown 符号后做相等匹配） */
const REPORT_TITLE_BLACKLIST = new Set<string>([
  '内容摘要',
  '开头钩子',
  '正文',
  '收藏 / 评论引导',
  '收藏/评论引导',
  '优化建议',
  '评分',
  '来源缺口',
  '待补充事实',
  '交付摘要',
  '可发布正文',
])

/**
 * 清洗 final_article 为纯净发布正文。
 *
 * @param article 原始 final_article（Markdown 字符串）
 * @param _assetType 内容资产类型（预留，P0 全资产类型通用清洗规则一致）
 * @returns 清洗后的纯文本，可直接粘贴发布
 */
export function cleanFinalArticle(article: string, _assetType?: string): string {
  if (!article || typeof article !== 'string') return ''

  const lines = article.split(/\r?\n/)
  const out: string[] = []
  let inCodeFence = false

  for (const raw of lines) {
    // 1. 代码围栏检测：```markdown / ```html / ```（开始/结束）
    const fenceMatch = raw.match(/^\s*```+/)
    if (fenceMatch) {
      inCodeFence = !inCodeFence
      // 代码围栏行本身丢弃，不输出
      continue
    }
    // 围栏内的内容全部丢弃（正文不应含代码块）
    if (inCodeFence) continue

    let line = raw

    // 2. 去掉 HTML 标签（保留标签内文本）
    line = line.replace(/<[^>]+>/g, '')

    // 3. 去掉 Markdown 标题符号 # / ## / ###（保留标题文本）
    //    仅匹配行首 # 后跟空白的情况
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const titleText = headingMatch[2].trim()
      // 4. 报告型独立标题行：直接移除该标题行
      if (REPORT_TITLE_BLACKLIST.has(titleText)) {
        continue
      }
      // 保留标题文本（去掉 #）
      line = titleText
    }

    // 5. 去掉普通话题 # 号（#智能客服 → 智能客服），避免误伤 C# / F#
    //    仅处理 # 后紧跟中文/英文/数字/下划线的话题格式
    line = line.replace(/#([\u4e00-\u9fa5A-Za-z0-9_]+)(?=\s|$)/g, '$1')

    // 6. 列表符号清洗：- 内容 / * 内容 → • 内容（数字列表保留）
    line = line.replace(/^\s{0,3}[-*]\s+/, '• ')

    out.push(line)
  }

  // 7. 清理多余空行：连续 3+ 空行压缩为 2
  const joined = out.join('\n')
  const collapsed = joined.replace(/\n{3,}/g, '\n\n')

  // 去掉开头和结尾空白
  return collapsed.trim()
}
