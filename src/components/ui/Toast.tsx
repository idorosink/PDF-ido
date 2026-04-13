import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/store/uiStore'
import type { Toast as ToastType } from '@/types'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
}

function ToastItem({ toast }: { toast: ToastType }) {
  const ui = useUIStore()
  const Icon = icons[toast.type]

  useEffect(() => {
    const t = setTimeout(() => ui.removeToast(toast.id), toast.duration)
    return () => clearTimeout(t)
  }, [toast.id, toast.duration, ui])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={clsx(
        'flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-tool',
        'bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-700',
        'min-w-[240px] max-w-[380px]'
      )}
    >
      <Icon className={clsx('h-4 w-4 flex-shrink-0', colors[toast.type])} />
      <span className="text-sm text-gray-100 flex-1">{toast.message}</span>
      <button
        onClick={() => ui.removeToast(toast.id)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  return createPortal(
    <div className="fixed bottom-6 end-6 z-[9998] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
