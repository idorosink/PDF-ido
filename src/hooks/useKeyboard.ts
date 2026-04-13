import { useEffect } from 'react'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { usePDF } from './usePDF'

export function useKeyboard() {
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Don't intercept if typing in an input/textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'o') { e.preventDefault(); pdf.openPDFFiles() }
      else if (ctrl && e.key === 's') { e.preventDefault(); pdf.savePDF() }
      else if (ctrl && e.key === 'z') { e.preventDefault(); docStore.undo() }
      else if (ctrl && (e.key === 'y' || e.key === 'Z')) { e.preventDefault(); docStore.redo() }
      else if (ctrl && e.key === '=') { e.preventDefault(); docStore.setScale(docStore.scale * 1.15) }
      else if (ctrl && e.key === '-') { e.preventDefault(); docStore.setScale(docStore.scale * 0.87) }
      else if (ctrl && e.key === '0') { e.preventDefault(); docStore.setZoomMode('fitPage') }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (docStore.selectedPageIndices.length > 0) { e.preventDefault(); pdf.deletePages() }
      }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const doc = docStore.getActiveDocument()
        if (doc && docStore.activePageIndex < doc.pageCount - 1) {
          docStore.setActivePage(docStore.activePageIndex + 1)
        }
      }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (docStore.activePageIndex > 0) {
          docStore.setActivePage(docStore.activePageIndex - 1)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [docStore, ui, pdf])
}
