import { createContext, useContext, useState, type ReactNode } from 'react'

export type SettingsTab = 'appearance' | 'models' | 'about'

interface SettingsDialogContextValue {
  open: boolean
  initialTab: SettingsTab
  openDialog: (tab?: SettingsTab) => void
  closeDialog: () => void
}

const SettingsDialogContext = createContext<SettingsDialogContextValue | undefined>(undefined)

export function SettingsDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<SettingsTab>('appearance')

  const openDialog = (tab: SettingsTab = 'appearance') => {
    setInitialTab(tab)
    setOpen(true)
  }
  const closeDialog = () => setOpen(false)

  return (
    <SettingsDialogContext.Provider value={{ open, initialTab, openDialog, closeDialog }}>
      {children}
    </SettingsDialogContext.Provider>
  )
}

export function useSettingsDialog() {
  const ctx = useContext(SettingsDialogContext)
  if (!ctx) throw new Error('useSettingsDialog must be used within SettingsDialogProvider')
  return ctx
}
