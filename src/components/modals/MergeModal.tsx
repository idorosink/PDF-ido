import React, { useState, useCallback } from 'react'
import { Modal, Button } from '@/components/ui/Modal'
import { GitMerge, Plus, Trash2, GripVertical, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { readDroppedFile } from '@/services/fileService'
import { mergePDFs } from '@/services/pdfOperations'
import { loadPDFDocument, evictDocument } from '@/services/pdfRenderer'
import { useDocumentStore, createDocument } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { usePDF } from '@/hooks/usePDF'
import { useTranslation } from 'react-i18next'

interface FileEntry {
  id: string
  name: string
  data: Uint8Array
  pageCount: number
}

function uid() { return Math.random().toString(36).slice(2, 10) }

export function MergeModal() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  // Add current document as first entry if available
  const activeDoc = docStore.getActiveDocument()

  const addFiles = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      for (const file of Array.from(input.files)) {
        const data = new Uint8Array(await file.arrayBuffer())
        const doc = await loadPDFDocument(data)
        setFiles((prev) => [
          ...prev,
          { id: uid(), name: file.name, data, pageCount: doc.numPages },
        ])
      }
    }
    input.click()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.pdf'))
    for (const file of dropped) {
      const opened = await readDroppedFile(file)
      const doc = await loadPDFDocument(opened.data)
      setFiles((prev) => [
        ...prev,
        { id: uid(), name: opened.name, data: opened.data, pageCount: doc.numPages },
      ])
    }
  }, [])

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const merge = async () => {
    const allFiles = [
      ...(activeDoc ? [{ id: 'current', name: activeDoc.name, data: activeDoc.currentData, pageCount: activeDoc.pageCount }] : []),
      ...files,
    ]
    if (allFiles.length < 2) {
      ui.addToast({ message: 'Add at least 2 PDF files', type: 'warning' })
      return
    }
    setIsMerging(true)
    try {
      const merged = await mergePDFs(allFiles.map((f) => f.data))
      const id = uid()
      const pageCount = allFiles.reduce((s, f) => s + f.pageCount, 0)
      const name = 'merged.pdf'
      const doc = createDocument(id, name, merged, pageCount)
      docStore.addDocument(doc)
      pdf.generateThumbnails(id, merged, pageCount)
      ui.addToast({ message: t('toast.mergeDone'), type: 'success' })
      ui.closeModal()
    } catch (e) {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <Modal
      title={t('merge.title')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={ui.closeModal}>{t('actions.cancel')}</Button>
          <Button onClick={merge} disabled={isMerging || files.length === 0 && !activeDoc}>
            {isMerging ? 'Merging...' : t('merge.mergeButton')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('merge.description')}</p>

      {/* Current document */}
      {activeDoc && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">Current document</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span className="text-sm text-indigo-700 dark:text-indigo-300 flex-1 truncate">{activeDoc.name}</span>
            <span className="text-xs text-indigo-400">{activeDoc.pageCount}p</span>
          </div>
        </div>
      )}

      {/* Additional files */}
      {files.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">Additional files</p>
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <GripVertical className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-gray-400">{f.pageCount}p</span>
              <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={addFiles}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
        )}
      >
        <Plus className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
        <p className="text-sm text-gray-500">{t('merge.addFiles')}</p>
      </div>
    </Modal>
  )
}
