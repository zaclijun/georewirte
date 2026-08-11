import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils'

interface CopyButtonProps {
  /** 要复制的文本 */
  text: string
  /** 按钮文案，默认「复制」 */
  label?: string
  /** 复制成功后的文案，默认「已复制」 */
  doneLabel?: string
  /** 按钮尺寸，默认 sm */
  size?: 'sm' | 'md' | 'lg' | 'icon-sm'
  /** 按钮变体，默认 ghost */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  className?: string
  /** 额外 aria-label / title */
  title?: string
}

/**
 * CopyButton - 通用模块级复制按钮
 *
 * 使用 navigator.clipboard.writeText，失败时 fallback 到 execCommand。
 * 成功后短暂显示「已复制」反馈（1.8s）。
 *
 * 不引入新依赖，复用 lib/utils 的 copyToClipboard。
 */
export function CopyButton({
  text,
  label = '复制',
  doneLabel = '已复制',
  size = 'sm',
  variant = 'ghost',
  className,
  title,
}: CopyButtonProps) {
  const [done, setDone] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    const ok = await copyToClipboard(text)
    if (ok) {
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    }
  }

  return (
    <Button size={size} variant={variant} onClick={handleCopy} className={className} title={title ?? label}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? doneLabel : label}
    </Button>
  )
}
