import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'appearance_mode'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
    return stored === 'system' ? getSystemTheme() : stored
  })

  useEffect(() => {
    const theme = mode === 'system' ? getSystemTheme() : mode
    setResolvedTheme(theme)
    applyTheme(theme)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(newTheme)
      applyTheme(newTheme)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [mode])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
