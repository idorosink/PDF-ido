import React, { useRef, useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { PDFPage } from './PDFPage'
import { AnnotationLayer } from './AnnotationLayer'
import { DropZone } from '@/components/ui/DropZone'
import { getPageDimensions } from '@/services/pdfRenderer'
import { FloatingToolbar } from '@/components/toolbar/FloatingToolbar'

const PAGE_GAP = 20   // px between pages in continuous mode
const MIN_SCALE = 0.25
const MAX_SCALE = 5.0

export function PDFViewer() {
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeDoc = docStore.getActiveDocument()
  const scale = docStore.scale
  const zoomMode = docStore.zoomMode
  const viewMode = docStore.viewMode

  const [containerWidth, setContainerWidth] = useState(0)
  const [pageDims, setPageDims] = useState<{ width: number; height: number } | null>(null)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Load dimensions of first page to calculate fit scales
  useEffect(() => {
    if (!activeDoc) { setPageDims(null); return }
    getPageDimensions(activeDoc.currentData, 1).then((dims) => {
      setPageDims({ width: dims.originalWidth, height: dims.originalHeight })
    }).catch(() => {})
  }, [activeDoc?.id])

  // Auto-zoom for fit modes
  useEffect(() => {
    if (!pageDims || !containerWidth || zoomMode === 'custom') return
    if (zoomMode === 'fitWidth') {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (containerWidth - 48) / pageDims.width))
      docStore.setScale(s)
    } else if (zoomMode === 'fitPage') {
      const scrollEl = scrollRef.current
      const h = scrollEl?.clientHeight ?? window.innerHeight
      const sw = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (containerWidth - 48) / pageDims.width))
      const sh = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (h - 48) / pageDims.height))
      docStore.setScale(Math.min(sw, sh))
    }
  }, [pageDims, containerWidth, zoomMode])

  // Scroll to active page
  useEffect(() => {
    if (!scrollRef.current || !activeDoc) return
    const pageEl = scrollRef.current.querySelector(
      `[data-page-index="${docStore.activePageIndex}"]`
    ) as HTMLElement
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [docStore.activePageIndex])

  const handlePageVisible = useCallback(
    (pageNumber: number) => {
      const idx = pageNumber - 1
      if (viewMode === 'continuous') {
        // Only update active page if it makes sense
        docStore.setActivePage(idx)
      }
    },
    [docStore, viewMode]
  )

  // Ctrl+wheel zoom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      docStore.setScale(scale * factor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scale, docStore])

  if (!activeDoc) {
    return (
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950"
      >
        <DropZone />
      </div>
    )
  }

  const pages = activeDoc.pages
  const visiblePages = viewMode === 'single'
    ? [pages[docStore.activePageIndex]].filter(Boolean)
    : pages

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-gray-200 dark:bg-gray-950"
    >
      <FloatingToolbar />
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          className={clsx(
            'flex min-h-full',
            viewMode === 'double'
              ? 'flex-wrap justify-center gap-4 pt-16 pb-6 px-6'
              : 'flex-col items-center pt-16 pb-6 px-6',
          )}
          style={{ gap: viewMode !== 'double' ? PAGE_GAP : undefined }}
        >
          {visiblePages.map((page, listIdx) => {
            const globalIdx = viewMode === 'single' ? docStore.activePageIndex : listIdx
            const pageNumber = globalIdx + 1
            const isActive = globalIdx === docStore.activePageIndex

            return (
              <div
                key={globalIdx}
                data-page-index={globalIdx}
                className={clsx(
                  'relative flex-shrink-0',
                  'bg-white dark:bg-white shadow-page rounded-sm'
                )}
                onClick={() => docStore.setActivePage(globalIdx)}
              >
                <PDFPage
                  data={activeDoc.currentData}
                  pageNumber={pageNumber}
                  scale={scale}
                  rotation={page.rotation}
                  isActive={isActive}
                  onVisible={handlePageVisible}
                />
                {/* Annotation overlay */}
                {pageDims && (
                  <AnnotationLayer
                    docId={activeDoc.id}
                    pageIndex={globalIdx}
                    pageWidth={pageDims.width}
                    pageHeight={pageDims.height}
                    scale={scale}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Page indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-full bg-gray-900/70 backdrop-blur px-3 py-1 text-xs text-white font-medium tabular-nums">
          {docStore.activePageIndex + 1} / {activeDoc.pageCount}
        </div>
      </div>
    </div>
  )
}
