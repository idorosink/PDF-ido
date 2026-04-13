import React, { useState } from 'react'
import { Modal, Button } from '@/components/ui/Modal'
import { Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { splitPDF, splitPDFAllPages } from '@/services/pdfOperations'
import { useDocumentStore, createDocument } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { usePDF } from '@/hooks/usePDF'
import { loadPDFDocument } from '@/services/pdfRenderer'
import { useTranslation } from 'react-i18next'

function uid() { return Math.random().toString(36).slice(2, 10) }

interface Range { id: string; start: number; end: number; name: string }

export function SplitModal() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()
  const activeDoc = docStore.getActiveDocument()
  const pageCount = activeDoc?.pageCount ?? 1

  const [mode, setMode] = useState<'every' | 'range'>('every')
  const [ranges, setRanges] = useState<Range[]>([
    { id: uid(), start: 1, end: Math.min(pageCount, 5), name: 'Part 1' }
  ])
  const [isSplitting, setIsSplitting] = useState(false)

  const addRange = () => setRanges((prev) => [
    ...prev,
    { id: uid(), start: 1, end: pageCount, name: `Part ${prev.length + 1}` }
  ])
  const removeRange = (id: string) => setRanges((prev) => prev.filter((r) => r.id !== id))
  const updateRange = (id: string, field: keyof Range, value: string | number) =>
    setRanges((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))

  const split = async () => {
    if (!activeDoc) return
    setIsSplitting(true)
    try {
      if (mode === 'every') {
        const results = await splitPDFAllPages(activeDoc.currentData)
        for (let i = 0; i < results.length; i++) {
          const id = uid()
          const name = `${activeDoc.name.replace('.pdf', '')}_page${i + 1}.pdf`
          docStore.addDocument(createDocument(id, name, results[i], 1))
          pdf.generateThumbnails(id, results[i], 1)
        }
      } else {
        const results = await splitPDF(
          activeDoc.currentData,
          ranges.map((r) => ({ start: r.start - 1, end: r.end - 1 }))
        )
        for (let i = 0; i < results.length; i++) {
          const r = ranges[i]
          const id = uid()
          const pdfDoc = await loadPDFDocument(results[i])
          docStore.addDocument(createDocument(id, r.name + '.pdf', results[i], pdfDoc.numPages))
          pdf.generateThumbnails(id, results[i], pdfDoc.numPages)
        }
      }
      ui.addToast({ message: t('toast.splitDone'), type: 'success' })
      ui.closeModal()
    } catch (e) {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      setIsSplitting(false)
    }
  }

  if (!activeDoc) return null

  return (
    <Modal
      title={t('split.title')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={ui.closeModal}>{t('actions.cancel')}</Button>
          <Button onClick={split} disabled={isSplitting}>
            {isSplitting ? 'Splitting...' : t('split.splitButton')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('split.description')} • {pageCount} pages
      </p>

      {/* Mode selector */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
        {(['every', 'range'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'flex-1 py-2 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            {m === 'every' ? t('split.everyPage') : t('split.byRange')}
          </button>
        ))}
      </div>

      {mode === 'range' && (
        <div className="space-y-2">
          {ranges.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <input
                type="text"
                value={r.name}
                onChange={(e) => updateRange(r.id, 'name', e.target.value)}
                placeholder={t('split.name')}
                className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-gray-700 dark:text-gray-300"
              />
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{t('split.from')}</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={r.start}
                  onChange={(e) => updateRange(r.id, 'start', parseInt(e.target.value) || 1)}
                  className="w-14 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-1.5"
                />
                <span>{t('split.to')}</span>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={r.end}
                  onChange={(e) => updateRange(r.id, 'end', parseInt(e.target.value) || pageCount)}
                  className="w-14 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-1.5"
                />
              </div>
              <button onClick={() => removeRange(r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addRange}
            className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-400 transition-colors mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('split.addRange')}
          </button>
        </div>
      )}
    </Modal>
  )
}
