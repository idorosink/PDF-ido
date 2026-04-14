import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import {
  FolderOpen, Save, Download, GitMerge, Scissors, Trash2,
  RotateCw, RotateCcw, RefreshCw, Package, Copy, FilePlus,
  Type, ImageIcon, PenLine, Undo2, Redo2, ZoomIn, ZoomOut,
  AlignCenter, Maximize2, ChevronDown,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { usePDF } from '@/hooks/usePDF'
import { useTranslation } from 'react-i18next'

interface ToolItem {
  id: string
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface ToolGroup {
  id: string
  tools: ToolItem[]
}

export function FloatingToolbar() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()
  const [rotateOpen, setRotateOpen] = useState(false)

  const hasDoc = !!docStore.getActiveDocument()
  const canUndo = docStore.historyIndex >= 0
  const canRedo = docStore.historyIndex < docStore.history.length - 1

  const groups: ToolGroup[] = [
    {
      id: 'file',
      tools: [
        { id: 'open',   icon: FolderOpen, label: t('actions.openFile'), onClick: () => pdf.openPDFFiles() },
        { id: 'save',   icon: Save,       label: `${t('actions.save')} (Ctrl+S)`, onClick: pdf.savePDF, disabled: !hasDoc },
        { id: 'export', icon: Download,   label: t('actions.export'),  onClick: pdf.savePDF,  disabled: !hasDoc },
      ],
    },
    {
      id: 'combine',
      tools: [
        { id: 'merge',    icon: GitMerge, label: t('actions.merge'),    onClick: () => ui.openModal('merge') },
        { id: 'split',    icon: Scissors, label: t('actions.split'),    onClick: () => ui.openModal('split'),    disabled: !hasDoc },
        { id: 'compress', icon: Package,  label: t('actions.compress'), onClick: () => ui.openModal('compress'), disabled: !hasDoc },
      ],
    },
    {
      id: 'pages',
      tools: [
        { id: 'duplicate', icon: Copy,     label: t('actions.duplicate'),    onClick: pdf.duplicatePage, disabled: !hasDoc },
        { id: 'addBlank',  icon: FilePlus, label: t('actions.addBlankPage'), onClick: pdf.addBlankPage,  disabled: !hasDoc },
        { id: 'delete',    icon: Trash2,   label: t('actions.deletePages'),  onClick: pdf.deletePages,   disabled: !hasDoc, danger: true },
      ],
    },
    {
      id: 'annotate',
      tools: [
        { id: 'addText',   icon: Type,      label: t('actions.addText'),      onClick: () => ui.openModal('addText'),  disabled: !hasDoc },
        { id: 'addImage',  icon: ImageIcon, label: t('actions.addImage'),     onClick: () => ui.openModal('addImage'), disabled: !hasDoc },
        { id: 'signature', icon: PenLine,   label: t('actions.addSignature'), onClick: () => ui.openModal('signature'),disabled: !hasDoc },
      ],
    },
    {
      id: 'history',
      tools: [
        { id: 'undo', icon: Undo2, label: `${t('actions.undo')} (Ctrl+Z)`, onClick: docStore.undo, disabled: !canUndo },
        { id: 'redo', icon: Redo2, label: `${t('actions.redo')} (Ctrl+Y)`, onClick: docStore.redo, disabled: !canRedo },
      ],
    },
    {
      id: 'zoom',
      tools: [
        { id: 'zoomIn',   icon: ZoomIn,       label: `${t('actions.zoomIn')} (Ctrl++)`,  onClick: () => docStore.setScale(docStore.scale * 1.2), disabled: !hasDoc },
        { id: 'zoomOut',  icon: ZoomOut,      label: `${t('actions.zoomOut')} (Ctrl+-)`, onClick: () => docStore.setScale(docStore.scale * 0.83), disabled: !hasDoc },
        { id: 'fitWidth', icon: AlignCenter,  label: t('actions.fitWidth'), onClick: () => docStore.setZoomMode('fitWidth'), disabled: !hasDoc },
        { id: 'fitPage',  icon: Maximize2,    label: t('actions.fitPage'),  onClick: () => docStore.setZoomMode('fitPage'),  disabled: !hasDoc },
      ],
    },
  ]

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          'pointer-events-auto flex items-center gap-0.5 px-2 py-1.5 rounded-2xl',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md',
          'border border-gray-200/80 dark:border-gray-700/80',
          'shadow-[0_8px_32px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)]',
        )}
      >
        {groups.map((group, gi) => (
          <React.Fragment key={group.id}>
            {gi > 0 && (
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />
            )}

            {/* Special rotate group with dropdown */}
            {group.id === 'pages' ? (
              <>
                {/* Rotate button with popover */}
                <div className="relative">
                  <Tooltip content="Rotate" side="bottom">
                    <button
                      disabled={!hasDoc}
                      onClick={() => setRotateOpen((o) => !o)}
                      className={clsx(
                        'flex items-center gap-0.5 p-2 rounded-xl transition-all duration-150',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        'text-gray-600 dark:text-gray-300',
                        'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                        rotateOpen && 'bg-gray-100 dark:bg-gray-800',
                      )}
                    >
                      <RotateCw className="h-5 w-5" />
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </Tooltip>

                  {/* Rotate dropdown */}
                  <AnimatePresence>
                    {rotateOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className={clsx(
                          'absolute top-full mt-2 start-0 z-50',
                          'flex flex-col gap-0.5 p-1.5 rounded-xl',
                          'bg-white dark:bg-gray-900',
                          'border border-gray-200 dark:border-gray-700',
                          'shadow-[0_8px_24px_rgba(0,0,0,0.15)]',
                          'min-w-[160px]',
                        )}
                      >
                        {[
                          { label: '90° ' + t('actions.rotateCW'),  icon: RotateCw,  action: () => pdf.rotatePages('cw') },
                          { label: '90° ' + t('actions.rotateCCW'), icon: RotateCcw, action: () => pdf.rotatePages('ccw') },
                          { label: '180°',                          icon: RefreshCw, action: () => pdf.rotatePages('180') },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => { opt.action(); setRotateOpen(false) }}
                            className={clsx(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-start',
                              'text-sm text-gray-700 dark:text-gray-300',
                              'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                            )}
                          >
                            <opt.icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rest of pages group */}
                {group.tools.map((tool) => (
                  <Tooltip key={tool.id} content={tool.label} side="bottom">
                    <button
                      onClick={tool.onClick}
                      disabled={tool.disabled}
                      className={clsx(
                        'p-2 rounded-xl transition-all duration-150',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        tool.danger
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                      )}
                    >
                      <tool.icon className="h-5 w-5" />
                    </button>
                  </Tooltip>
                ))}
              </>
            ) : (
              group.tools.map((tool) => (
                <Tooltip key={tool.id} content={tool.label} side="bottom">
                  <button
                    onClick={tool.onClick}
                    disabled={tool.disabled}
                    className={clsx(
                      'p-2 rounded-xl transition-all duration-150',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      tool.danger
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                    )}
                  >
                    <tool.icon className="h-5 w-5" />
                  </button>
                </Tooltip>
              ))
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  )
}
