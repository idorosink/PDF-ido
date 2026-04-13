import React, { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { ThumbnailItem } from './ThumbnailItem'
import { usePDF } from '@/hooks/usePDF'
import * as ops from '@/services/pdfOperations'
import { evictDocument } from '@/services/pdfRenderer'
import { useTranslation } from 'react-i18next'

export function ThumbnailSidebar() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()

  const activeDoc = docStore.getActiveDocument()
  const isOpen = ui.sidebarOpen

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !activeDoc) return

      const pages = activeDoc.pages
      const fromIndex = pages.findIndex((_, i) => `page-${i}` === active.id)
      const toIndex = pages.findIndex((_, i) => `page-${i}` === over.id)
      if (fromIndex === -1 || toIndex === -1) return

      // Build new order array
      const order = pages.map((_, i) => i)
      const [moved] = order.splice(fromIndex, 1)
      order.splice(toIndex, 0, moved)

      try {
        evictDocument(activeDoc.currentData)
        const newData = await ops.movePages(activeDoc.currentData, order)
        docStore.updateDocumentData(activeDoc.id, newData, 'reorder pages')
        docStore.reorderPages(activeDoc.id, fromIndex, toIndex)
      } catch (e) {
        console.error('Reorder failed:', e)
      }
    },
    [activeDoc, docStore]
  )

  const handlePageClick = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      if (e.shiftKey && activeDoc) {
        const from = docStore.activePageIndex
        const to = pageIndex
        const range = Array.from(
          { length: Math.abs(to - from) + 1 },
          (_, i) => Math.min(from, to) + i
        )
        docStore.selectPages(range)
      } else if (e.ctrlKey || e.metaKey) {
        docStore.togglePageSelection(pageIndex)
      } else {
        docStore.setActivePage(pageIndex)
        docStore.clearSelection()
      }
    },
    [docStore, activeDoc]
  )

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-3 w-10 flex-shrink-0 border-e border-gray-200 dark:border-gray-800">
        <button
          onClick={ui.toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('sidebar.pages')}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
        {activeDoc && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <span className="text-[9px] text-gray-400 [writing-mode:vertical-rl] rotate-180">
              {activeDoc.pageCount} pages
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex flex-col flex-shrink-0 border-e border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-950',
        'transition-all duration-200'
      )}
      style={{ width: ui.sidebarWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('sidebar.pages')}
            {activeDoc && (
              <span className="ms-1 text-gray-400 dark:text-gray-600">
                ({activeDoc.pageCount})
              </span>
            )}
          </span>
        </div>
        <button
          onClick={ui.toggleSidebar}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1">
        {!activeDoc ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-3">
            <p className="text-xs text-gray-400">No document open</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeDoc.pages.map((_, i) => `page-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {activeDoc.pages.map((page, i) => (
                <ThumbnailItem
                  key={`page-${i}`}
                  id={`page-${i}`}
                  pageIndex={i}
                  pageNumber={i + 1}
                  thumbnail={page.thumbnail}
                  thumbnailLoading={page.thumbnailLoading}
                  isActive={docStore.activePageIndex === i}
                  isSelected={docStore.selectedPageIndices.includes(i)}
                  onClick={(e) => handlePageClick(e, i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
