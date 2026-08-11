/**
 * SettingsDialog - 设置中心弹窗（居中 + 左侧导航）
 *
 * 结构：
 *   ┌──────────────────────────────────────────────────┐
 *   │ 设置                                         ×  │
 *   │ 管理外观、模型配置与关于本项目                   │
 *   ├────────────┬────────────────────────────────────┤
 *   │ 左侧菜单    │ 右侧内容区（内部滚动）              │
 *   │ 外观        │                                   │
 *   │ 模型配置    │                                   │
 *   │ 关于        │                                   │
 *   └────────────┴────────────────────────────────────┘
 *
 * 桌面端尺寸：宽 960px~1040px，高 720px~780px。
 * 左侧导航 180px 固定，右侧内容区 flex:1 内部滚动。
 *
 * 开关状态由 SettingsDialogContext 控制，支持指定初始 Tab。
 * 账户中心与内容优化页共用同一个弹窗实例。
 */
import { useEffect, useState } from 'react'
import { Palette, Bot, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useSettingsDialog, type SettingsTab } from '@/context/SettingsDialogContext'
import { AppearancePanel } from './AppearancePanel'
import { ModelConfigPanel } from './ModelConfigPanel'
import { AboutPanel } from './AboutPanel'
import { cn } from '@/lib/utils'

interface NavItem {
  value: SettingsTab
  label: string
  icon: typeof Palette
}

const NAV_ITEMS: NavItem[] = [
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'models', label: '模型配置', icon: Bot },
  { value: 'about', label: '关于', icon: Info },
]

export function SettingsDialog() {
  const { open, initialTab, closeDialog } = useSettingsDialog()
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  // 弹窗每次打开时，将本地 activeTab 同步为 context 的 initialTab。
  // 这样从「去配置模型」入口打开时能正确定位到 models，从「关于项目」入口打开时定位到 about。
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent
        side="center"
        className="flex h-[calc(100vh-64px)] max-h-[780px] w-[calc(100vw-64px)] max-w-[1040px] min-w-0 flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理外观、模型配置与关于本项目</DialogDescription>
        </DialogHeader>

        {/* Body: 左侧菜单 + 右侧内容 */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* 左侧导航：固定宽度，不滚动 */}
          <aside className="flex w-[192px] shrink-0 flex-col gap-1 border-r border-border bg-secondary/30 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveTab(item.value)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-200 ease-apple',
                    active
                      ? 'bg-background font-medium text-foreground shadow-soft-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </aside>

          {/* 右侧内容区：flex:1，仅此处滚动 */}
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            {activeTab === 'appearance' && <AppearancePanel />}
            {activeTab === 'models' && <ModelConfigPanel />}
            {activeTab === 'about' && <AboutPanel />}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
