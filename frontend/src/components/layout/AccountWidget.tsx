import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Info, Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsDialog } from '@/context/SettingsDialogContext'

interface AccountWidgetProps {
  className?: string
}

/**
 * AccountWidget - 账户中心入口（Sidebar 底部）
 *
 * 设计：
 * - 顶部：Sparkles + "GEO" 标识 + ChevronDown 触发下拉
 * - 下拉菜单：「设置」「关于项目」
 * - 点击「设置」→ openDialog('appearance')
 * - 点击「关于项目」→ openDialog('about')
 *
 * 替代原 EnterpriseCard 的位置；EnterpriseCard 文件保留但不被引用。
 *
 * 实现：因 frontend/src/components/ui 暂无 dropdown-menu.tsx，
 * 这里采用最小自定义下拉（受控状态 + click-outside + Escape 关闭）。
 * 样式与原 EnterpriseCard 一致：rounded-md border，弱化外观。
 */
export function AccountWidget({ className }: AccountWidgetProps) {
  const [open, setOpen] = useState(false)
  const { openDialog } = useSettingsDialog()
  const rootRef = useRef<HTMLDivElement | null>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Escape 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handlePick = (action: 'settings' | 'about') => {
    setOpen(false)
    if (action === 'settings') {
      openDialog('appearance')
    } else {
      openDialog('about')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-sidebar-border/60 bg-background/50 px-3 py-2.5 text-sm text-muted-foreground transition-colors',
          'hover:border-border hover:bg-background hover:text-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'border-border bg-background text-foreground',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
          <span className="truncate text-[12px] font-medium tracking-tight text-foreground">
            GEO 工作台
          </span>
          <span className="truncate text-[10px] opacity-80">账户中心</span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[180px] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-soft-lg animate-fade-in"
        >
          <MenuItem
            icon={<Settings className="h-3.5 w-3.5" />}
            label="设置"
            onClick={() => handlePick('settings')}
          />
          <MenuItem
            icon={<Info className="h-3.5 w-3.5" />}
            label="关于项目"
            onClick={() => handlePick('about')}
          />
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] text-foreground/90 transition-colors',
        'hover:bg-secondary hover:text-foreground',
        'focus:outline-none focus-visible:bg-secondary',
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}
