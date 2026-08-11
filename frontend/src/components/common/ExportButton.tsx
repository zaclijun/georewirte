import { useState } from 'react'
import { Download, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadText } from '@/lib/utils'
import { useExport } from '@/hooks'
import { buildHtmlReport, type BuildHtmlReportArgs } from '@/lib/exportHtml'
import type { UUID } from '@/types'

interface ExportButtonProps {
  /** 后端 output id；提供时优先调用 GET /outputs/:id/export?format=markdown */
  outputId?: UUID
  /** 导出文件名（不含扩展名），同时作为 fallback 文件名 */
  filename: string
  /** fallback Markdown 内容：后端导出失败时使用 */
  fallbackContent?: string
  /** 导出格式，默认 markdown */
  format?: 'markdown' | 'json' | 'html'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  className?: string
  /** 按钮原生 title（tooltip） */
  title?: string
  /**
   * 自定义按钮文案。
   * - 不传：根据 format 显示默认文案（markdown→「导出 Markdown」/ html→「导出 HTML」/ json→「导出」）
   * - 传值：显示该值
   */
  label?: string
  /**
   * 紧凑模式：仅显示 icon，不显示文字。
   * 适合空间受限的表格操作列。默认 false。
   * 与 label 互斥（compact 优先）。
   */
  compact?: boolean
  /**
   * HTML 报告生成参数（format='html' 时必传）。
   * 提供后走纯前端生成，不调用后端 API。
   */
  htmlReportArgs?: BuildHtmlReportArgs
}

/**
 * ExportButton - 导出 Markdown / JSON / HTML 按钮
 *
 * 优先级：
 * 1. format='html'：纯前端生成（buildHtmlReport + downloadText），不走后端 API
 * 2. 若提供 outputId，则调用后端 GET /outputs/:id/export?format=markdown 下载
 * 3. 后端失败时 fallback 到前端本地下载（使用 fallbackContent）
 * 4. 若未提供 outputId，直接走前端本地下载
 */
export function ExportButton({
  outputId,
  filename,
  fallbackContent,
  format = 'markdown',
  size = 'sm',
  variant = 'secondary',
  className,
  title,
  label,
  compact = false,
  htmlReportArgs,
}: ExportButtonProps) {
  const [done, setDone] = useState(false)

  const exportMut = useExport({
    fallbackContent,
    fallbackFilename: filename,
  })

  const handleExport = () => {
    // HTML 分支：纯前端生成，不走后端
    if (format === 'html') {
      if (!htmlReportArgs) {
        // 无报告参数，无法生成
        return
      }
      const { filename: htmlFilename, html } = buildHtmlReport(htmlReportArgs)
      downloadText(htmlFilename, html, 'text/html;charset=utf-8')
      setDone(true)
      setTimeout(() => setDone(false), 1800)
      return
    }

    if (outputId) {
      // 走后端导出接口，失败时 useExport 内部自动 fallback
      exportMut.mutate(
        { outputId, format },
        {
          onSuccess: () => {
            setDone(true)
            setTimeout(() => setDone(false), 1800)
          },
        },
      )
      return
    }
    // 无 outputId：直接前端本地下载
    const ext = format === 'json' ? 'json' : 'md'
    const mime =
      format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'
    downloadText(`${filename}.${ext}`, fallbackContent ?? '', mime)
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }

  const loading = exportMut.isPending
  const defaultLabel = format === 'html' ? '导出 HTML' : format === 'json' ? '导出' : '导出 Markdown'
  const text = done ? '已导出' : loading ? '导出中…' : label ?? defaultLabel
  const defaultTitle = format === 'html' ? '导出 HTML' : format === 'json' ? '导出' : '导出 Markdown'

  return (
    <Button size={size} variant={variant} onClick={handleExport} className={className} disabled={loading || (format === 'html' && !htmlReportArgs)} title={title ?? (compact ? defaultTitle : undefined)}>
      {done ? (
        <Check className="h-3.5 w-3.5" />
      ) : loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {!compact && text}
    </Button>
  )
}
