import { useMutation } from '@tanstack/react-query'
import { exportApi, type ExportFormat } from '@/services/api'
import { downloadText } from '@/lib/utils'
import type { UUID } from '@/types'

interface UseExportArgs {
  /** 后端返回的 markdown 内容，用于 fallback */
  fallbackContent?: string
  /** fallback 文件名（不含扩展名） */
  fallbackFilename?: string
}

/**
 * useExport - Markdown / JSON 导出
 *
 * 流程：
 * 1. 调用 GET /outputs/:id/export?format=markdown
 * 2. 下载后端返回的文件
 * 3. 失败时 fallback 到前端本地下载（用 fallbackContent）
 *
 * 页面通过 mutate(outputId) 触发，fallback 在 hook 内自动处理
 */
export function useExport({ fallbackContent, fallbackFilename = 'rewrite-result' }: UseExportArgs = {}) {
  return useMutation({
    mutationFn: async ({
      outputId,
      format = 'markdown' as ExportFormat,
    }: {
      outputId: UUID
      format?: ExportFormat
    }) => {
      const result = await exportApi.export(outputId, format)
      const ext = format === 'json' ? 'json' : 'md'
      const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'
      const filename = result.filename?.trim() || `${fallbackFilename}.${ext}`
      downloadText(filename, result.content ?? '', mime)
      return { filename, source: 'api' as const }
    },
    onError: (_err, variables) => {
      // fallback: 用本地 fallbackContent 下载
      if (fallbackContent) {
        const format = variables.format ?? 'markdown'
        const ext = format === 'json' ? 'json' : 'md'
        const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8'
        downloadText(`${fallbackFilename}.${ext}`, fallbackContent, mime)
      }
    },
  })
}
