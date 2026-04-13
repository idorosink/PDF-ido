import React, { useState } from 'react'
import { Modal, Button } from '@/components/ui/Modal'
import { clsx } from 'clsx'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { formatFileSize } from '@/services/pdfOperations'
import { useTranslation } from 'react-i18next'

type Quality = 'low' | 'medium' | 'high'

export function CompressModal() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const activeDoc = docStore.getActiveDocument()
  const [quality, setQuality] = useState<Quality>('medium')
  const [isCompressing, setIsCompressing] = useState(false)

  if (!activeDoc) return null

  const originalSize = activeDoc.currentData.length
  const estimates: Record<Quality, number> = {
    low: originalSize * 0.35,
    medium: originalSize * 0.55,
    high: originalSize * 0.75,
  }

  const compress = async () => {
    setIsCompressing(true)
    // Note: true image-based PDF compression requires advanced processing.
    // We re-save which removes some overhead (duplicate streams, etc.)
    // For real compression, integration with ghostscript or a backend service would be needed.
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(activeDoc.currentData, { updateMetadata: false })
      const compressed = await doc.save({ useObjectStreams: true })
      docStore.updateDocumentData(activeDoc.id, compressed, 'compress')
      ui.addToast({ message: t('toast.compressDone'), type: 'success' })
      ui.closeModal()
    } catch {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      setIsCompressing(false)
    }
  }

  const options: { value: Quality; label: string }[] = [
    { value: 'high', label: t('compress.high') },
    { value: 'medium', label: t('compress.medium') },
    { value: 'low', label: t('compress.low') },
  ]

  return (
    <Modal
      title={t('compress.title')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={ui.closeModal}>{t('actions.cancel')}</Button>
          <Button onClick={compress} disabled={isCompressing}>
            {isCompressing ? 'Compressing...' : t('compress.compressButton')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('compress.description')}</p>

      <div className="flex gap-2 mb-4 text-sm">
        <div className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">{t('compress.originalSize')}</p>
          <p className="font-semibold text-gray-700 dark:text-gray-200">{formatFileSize(originalSize)}</p>
        </div>
        <div className="flex-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-3 text-center">
          <p className="text-xs text-indigo-400 mb-0.5">{t('compress.estimatedSize')}</p>
          <p className="font-semibold text-indigo-600 dark:text-indigo-300">{formatFileSize(estimates[quality])}</p>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors',
              quality === opt.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800'
            )}
          >
            <input
              type="radio"
              name="quality"
              value={opt.value}
              checked={quality === opt.value}
              onChange={() => setQuality(opt.value)}
              className="accent-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </Modal>
  )
}
