import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
  /**
   * 排版变体：
   * - 'article'（默认）：正文阅读，16px / 行距 1.85，适合改写正文
   * - 'compact'：紧凑场景，14.5px / 行距 1.75，适合原文对比
   * - 'faq'：问答模块，问题加粗 + 分隔线，适合 FAQ
   */
  variant?: 'article' | 'compact' | 'faq'
}

/**
 * MarkdownRenderer - 改写正文 / FAQ / 原文 渲染容器
 * 真源: ui-reference/apple-style-components/preview/component-card.html Card 容器 + .prose-apple 排版
 * react-markdown + remark-gfm，支持 GFM 表格/任务列表/删除线
 *
 * 排版规范（见 index.css .prose-apple）：
 * - 正文 16px / 行距 1.85 / 段落间距 16px
 * - H2 22px 700 / H3 18px 650，层级突出
 * - 列表 padding-left 22px / li 间距 8px
 * - blockquote 左边框 + 浅底 + 圆角
 * - table 横向滚动容器，避免撑破页面
 * - strong 650 / 主文本色
 */
export function MarkdownRenderer({
  content,
  className,
  variant = 'article',
}: MarkdownRendererProps) {
  const variantClass =
    variant === 'compact'
      ? 'prose-apple prose-apple-compact'
      : variant === 'faq'
        ? 'prose-apple prose-apple-faq'
        : 'prose-apple'

  return (
    <div className={cn(variantClass, 'max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
          // blockquote 作为核心结论卡片：左边框 + 浅底 + 圆角
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-4 rounded-r-md border-l-2 border-primary/60 bg-primary/5 px-4 py-2 text-foreground/90 [&_p]:my-0 [&_p:last-child]:mb-0"
              {...props}
            />
          ),
          // table 美化：外层横向滚动容器
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-secondary/60" {...props} />,
          th: ({ node, ...props }) => (
            <th className="border-b border-border px-3 py-2 text-left font-medium" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-border/60 px-3 py-2 odd:bg-secondary/20" {...props} />
          ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
