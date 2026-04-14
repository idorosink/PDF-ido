import React, { useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, FileText, X, Globe } from 'lucide-react'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { ThumbnailSidebar } from '@/components/sidebar/ThumbnailSidebar'
import { PDFViewer } from '@/components/viewer/PDFViewer'
import { ToastContainer } from '@/components/ui/Toast'
import { MergeModal } from '@/components/modals/MergeModal'
import { SplitModal } from '@/components/modals/SplitModal'
import { TextAnnotationModal } from '@/components/modals/TextAnnotationModal'
import { SignatureModal } from '@/components/modals/SignatureModal'
import { CompressModal } from '@/components/modals/CompressModal'
import { usePDF } from '@/hooks/usePDF'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useTranslation } from 'react-i18next'
import { i18n } from '@/i18n'

export function AppLayout() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()

  // Register global keyboard shortcuts
  useKeyboard()

  // Global drag-and-drop for the entire app
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
      )
      if (files.length > 0) pdf.openPDFFiles(files)
    },
    [pdf]
  )

  const switchLanguage = () => {
    const next = ui.language === 'he' ? 'en' : 'he'
    ui.setLanguage(next)
    i18n.changeLanguage(next)
  }

  const activeDoc = docStore.getActiveDocument()

  return (
    <div
      className="flex flex-col h-full bg-surface text-text-primary"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center h-10 px-3 gap-2 flex-shrink-0 border-b border-border bg-surface-raised z-20 select-none">
        {/* Logo */}
        <div className="flex items-center gap-1.5 me-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <FileText className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">PDF‑ido</span>
        </div>

        {/* Document tabs */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
          {docStore.documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => docStore.setActiveDocument(doc.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 max-w-[180px] group',
                doc.id === docStore.activeDocumentId
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <span className="truncate">{doc.name}</span>
              {doc.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  docStore.removeDocument(doc.id)
                }}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ms-auto flex-shrink-0">
          {/* Zoom display */}
          {activeDoc && (
            <div className="hidden sm:flex items-center">
              <button
                onClick={() => docStore.setScale(docStore.scale * 0.87)}
                className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                −
              </button>
              <button
                onClick={() => docStore.setZoomMode('fitPage')}
                className="px-2 py-0.5 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors min-w-[48px] text-center"
              >
                {Math.round(docStore.scale * 100)}%
              </button>
              <button
                onClick={() => docStore.setScale(docStore.scale * 1.15)}
                className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                +
              </button>
            </div>
          )}

          {/* Language toggle */}
          <button
            onClick={switchLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Switch language / שנה שפה"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="font-medium">{ui.language === 'he' ? 'EN' : 'עב'}</span>
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Thumbnail sidebar */}
        <ThumbnailSidebar />

        {/* Center: PDF viewer */}
        <PDFViewer />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {ui.activeModal === 'merge'   && <MergeModal />}
        {ui.activeModal === 'split'   && <SplitModal />}
        {ui.activeModal === 'addText' && <TextAnnotationModal />}
        {ui.activeModal === 'signature' && <SignatureModal />}
        {ui.activeModal === 'compress' && <CompressModal />}
      </AnimatePresence>

      {/* ── Global loading overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {ui.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9985] bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-3 bg-surface-raised border border-border rounded-2xl px-5 py-4 shadow-tool">
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              <span className="text-sm font-medium text-text-primary">
                {ui.loadingMessage || t('viewer.loading')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toasts ──────────────────────────────────────────────────────────── */}
      <ToastContainer />
    </div>
  )
}
