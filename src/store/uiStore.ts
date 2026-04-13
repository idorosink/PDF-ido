import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, Language, ModalType, Toast } from '@/types'

interface UIState {
  theme: Theme
  language: Language
  sidebarOpen: boolean
  sidebarWidth: number
  activeModal: ModalType
  toasts: Toast[]
  activeTool: string | null
  isLoading: boolean
  loadingMessage: string
}

interface UIActions {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLanguage: (lang: Language) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  openModal: (modal: Exclude<ModalType, null>) => void
  closeModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setActiveTool: (tool: string | null) => void
  setLoading: (loading: boolean, message?: string) => void
}

let toastId = 0

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'he',
      sidebarOpen: true,
      sidebarWidth: 200,
      activeModal: null,
      toasts: [],
      activeTool: null,
      isLoading: false,
      loadingMessage: '',

      setTheme: (theme) => {
        set({ theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark'
          if (next === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { theme: next }
        }),

      setLanguage: (language) => {
        set({ language })
        document.documentElement.lang = language
        document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

      openModal: (modal) => set({ activeModal: modal }),

      closeModal: () => set({ activeModal: null }),

      addToast: (toast) =>
        set((state) => {
          const id = String(++toastId)
          const newToast: Toast = { ...toast, id, duration: toast.duration ?? 3500 }
          return { toasts: [...state.toasts, newToast] }
        }),

      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      setActiveTool: (tool) => set({ activeTool: tool }),

      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
    }),
    {
      name: 'pdf-ido-ui',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)
