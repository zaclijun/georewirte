/**
 * AppearancePanel - 外观主题设置面板
 *
 * 提供三种主题模式选择：跟随系统 / 浅色 / 深色。
 * 通过 ThemeProvider 的 useTheme() 读取与切换 mode。
 */
import { Monitor, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeProvider'

const OPTIONS = [
  { value: 'system', label: '跟随系统', desc: '跟随操作系统主题自动切换', icon: Monitor },
  { value: 'light', label: '浅色模式', desc: '始终使用浅色主题', icon: Sun },
  { value: 'dark', label: '深色模式', desc: '始终使用深色主题', icon: Moon },
] as const

export function AppearancePanel() {
  const { mode, setMode } = useTheme()

  return (
    <div className="space-y-3">
      <div className="text-eyebrow">外观主题</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = mode === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[11px] leading-snug opacity-80">{opt.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
