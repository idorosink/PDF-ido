import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { i18n } from '@/i18n'

export default function App() {
  const ui = useUIStore()

  // Apply persisted theme + language on mount
  useEffect(() => {
    if (ui.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    document.documentElement.lang = ui.language
    document.documentElement.dir = ui.language === 'he' ? 'rtl' : 'ltr'
    i18n.changeLanguage(ui.language)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <AppLayout />
}
