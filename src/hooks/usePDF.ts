import { useCallback } from 'react'
import { useDocumentStore, createDocument } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { loadPDFDocument, generateThumbnail, evictDocument } from '@/services/pdfRenderer'
import * as ops from '@/services/pdfOperations'
import { openFiles, saveFile, readDroppedFile } from '@/services/fileService'
import { useTranslation } from 'react-i18next'

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function usePDF() {
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const { t } = useTranslation()

  const activeDoc = docStore.getActiveDocument()

  /** Generate thumbnails for all pages of a document */
  const generateThumbnails = useCallback(
    async (docId: string, data: Uint8Array, pageCount: number) => {
      const THUMB_CONCURRENCY = 3
      let i = 0
      async function worker() {
        while (i < pageCount) {
          const idx = i++
          try {
            const thumb = await generateThumbnail(data, idx + 1, 150)
            docStore.setThumbnail(docId, idx, thumb)
          } catch (e) {
            console.warn(`Thumbnail generation failed for page ${idx + 1}:`, e)
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(THUMB_CONCURRENCY, pageCount) }, worker))
    },
    [docStore]
  )

  /** Open files via file picker or handle dropped files */
  const openPDFFiles = useCallback(
    async (droppedFiles?: File[]) => {
      ui.setLoading(true, t('viewer.loading'))
      try {
        let files
        if (droppedFiles && droppedFiles.length > 0) {
          files = await Promise.all(droppedFiles.map(readDroppedFile))
        } else {
          files = await openFiles()
        }

        if (!files || files.length === 0) return

        for (const file of files) {
          const pdfDoc = await loadPDFDocument(file.data)
          const pageCount = pdfDoc.numPages
          const id = uid()
          const doc = createDocument(id, file.name, file.data, pageCount)
          docStore.addDocument(doc)
          // Generate thumbnails in background
          generateThumbnails(id, file.data, pageCount)
        }
        ui.addToast({ message: t('toast.fileOpened'), type: 'success' })
      } catch (e) {
        console.error('Open file error:', e)
        ui.addToast({ message: t('toast.fileError'), type: 'error' })
      } finally {
        ui.setLoading(false)
      }
    },
    [ui, t, docStore, generateThumbnails]
  )

  /** Save the current document */
  const savePDF = useCallback(async () => {
    if (!activeDoc) { ui.addToast({ message: t('toast.noPDF'), type: 'warning' }); return }
    ui.setLoading(true, t('actions.save'))
    try {
      await saveFile(activeDoc.currentData, activeDoc.name)
      docStore.markClean(activeDoc.id)
      ui.addToast({ message: t('toast.fileSaved'), type: 'success' })
    } catch (e) {
      ui.addToast({ message: t('toast.saveError'), type: 'error' })
    } finally {
      ui.setLoading(false)
    }
  }, [activeDoc, docStore, ui, t])

  /** Rotate selected or active pages */
  const rotatePages = useCallback(
    async (direction: 'cw' | 'ccw' | '180') => {
      if (!activeDoc) { ui.addToast({ message: t('toast.noPDF'), type: 'warning' }); return }
      const delta: 90 | -90 | 180 = direction === 'cw' ? 90 : direction === 'ccw' ? -90 : 180
      const indices = docStore.selectedPageIndices.length > 0
        ? docStore.selectedPageIndices
        : [docStore.activePageIndex]
      ui.setLoading(true)
      try {
        evictDocument(activeDoc.currentData)
        const newData = await ops.rotatePages(activeDoc.currentData, indices, delta as 90 | -90)
        docStore.updateDocumentData(activeDoc.id, newData, `rotate ${direction}`)
        // Refresh thumbnails for rotated pages
        for (const idx of indices) {
          const thumb = await generateThumbnail(newData, idx + 1, 150)
          docStore.setThumbnail(activeDoc.id, idx, thumb)
        }
        ui.addToast({ message: t('toast.rotated'), type: 'success' })
      } catch (e) {
        ui.addToast({ message: t('toast.error'), type: 'error' })
      } finally {
        ui.setLoading(false)
      }
    },
    [activeDoc, docStore, ui, t]
  )

  /** Delete selected or active pages */
  const deletePages = useCallback(async () => {
    if (!activeDoc) { ui.addToast({ message: t('toast.noPDF'), type: 'warning' }); return }
    const indices = docStore.selectedPageIndices.length > 0
      ? docStore.selectedPageIndices
      : [docStore.activePageIndex]
    if (indices.length >= activeDoc.pageCount) {
      ui.addToast({ message: "Cannot delete all pages", type: 'error' }); return
    }
    ui.setLoading(true)
    try {
      evictDocument(activeDoc.currentData)
      const newData = await ops.deletePages(activeDoc.currentData, indices)
      const newPageCount = activeDoc.pageCount - indices.length
      docStore.updateDocumentData(activeDoc.id, newData, 'delete pages')
      // Rebuild page states
      const newPages = Array.from({ length: newPageCount }, (_, i) => ({
        pageIndex: i, rotation: 0, thumbnail: null, thumbnailLoading: false, annotations: []
      }))
      docStore.updatePageStates(activeDoc.id, newPages)
      docStore.clearSelection()
      generateThumbnails(activeDoc.id, newData, newPageCount)
      ui.addToast({ message: t('toast.deleted'), type: 'success' })
    } catch (e) {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      ui.setLoading(false)
    }
  }, [activeDoc, docStore, ui, t, generateThumbnails])

  /** Duplicate active page */
  const duplicatePage = useCallback(async () => {
    if (!activeDoc) { ui.addToast({ message: t('toast.noPDF'), type: 'warning' }); return }
    ui.setLoading(true)
    try {
      evictDocument(activeDoc.currentData)
      const newData = await ops.duplicatePage(activeDoc.currentData, docStore.activePageIndex)
      const newPageCount = activeDoc.pageCount + 1
      docStore.updateDocumentData(activeDoc.id, newData, 'duplicate page')
      const newPages = Array.from({ length: newPageCount }, (_, i) => ({
        pageIndex: i, rotation: 0, thumbnail: null, thumbnailLoading: false, annotations: []
      }))
      docStore.updatePageStates(activeDoc.id, newPages)
      generateThumbnails(activeDoc.id, newData, newPageCount)
      ui.addToast({ message: t('toast.duplicated'), type: 'success' })
    } catch (e) {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      ui.setLoading(false)
    }
  }, [activeDoc, docStore, ui, t, generateThumbnails])

  /** Add blank page after active page */
  const addBlankPage = useCallback(async () => {
    if (!activeDoc) { ui.addToast({ message: t('toast.noPDF'), type: 'warning' }); return }
    ui.setLoading(true)
    try {
      evictDocument(activeDoc.currentData)
      const newData = await ops.addBlankPage(activeDoc.currentData, docStore.activePageIndex)
      const newPageCount = activeDoc.pageCount + 1
      docStore.updateDocumentData(activeDoc.id, newData, 'add blank page')
      const newPages = Array.from({ length: newPageCount }, (_, i) => ({
        pageIndex: i, rotation: 0, thumbnail: null, thumbnailLoading: false, annotations: []
      }))
      docStore.updatePageStates(activeDoc.id, newPages)
      generateThumbnails(activeDoc.id, newData, newPageCount)
      ui.addToast({ message: t('toast.blankAdded'), type: 'success' })
    } catch (e) {
      ui.addToast({ message: t('toast.error'), type: 'error' })
    } finally {
      ui.setLoading(false)
    }
  }, [activeDoc, docStore, ui, t, generateThumbnails])

  return {
    activeDoc,
    openPDFFiles,
    savePDF,
    rotatePages,
    deletePages,
    duplicatePage,
    addBlankPage,
    generateThumbnails,
  }
}
