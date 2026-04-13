import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import {
  FolderOpen, Save, Download, GitMerge, Scissors, Trash2,
  RotateCw, RotateCcw, Package, Copy, FilePlus, Type, ImageIcon,
  PenLine, Undo2, Redo2, ZoomIn, ZoomOut, AlignCenter, Maximize2,
  Sun, Moon, ChevronDown, ChevronUp, SplitSquareHorizontal,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { usePDF } from '@/hooks/usePDF'
import { useTranslation } from 'react-i18next'

interface ToolAction {
  id: string
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  separator?: boolean
  danger?: boolean
}

export function FloatingToolbar() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const pdf = usePDF()
  const [collapsed, setCollapsed] = useState(false)

  const hasDoc = !!docStore.getActiveDocument()
  const canUndo = docStore.historyIndex >= 0
  const canRedo = docStore.historyIndex < docStore.history.length - 1

  const tools: ToolAction[] = [
    {
      id: 'open',
      icon: FolderOpen,
      label: t('actions.openFile'),
      onClick: () => pdf.openPDFFiles(),
    },
    {
      id: 'save',
      icon: Save,
      label: t('actions.save'),
      onClick: pdf.savePDF,
      disabled: !hasDoc,
    },
    {
      id: 'export',
      icon: Download,
      label: t('actions.export'),
      onClick: pdf.savePDF,
      disabled: !hasDoc,
      separator: true,
    },
    {
      id: 'merge',
      icon: GitMerge,
      label: t('actions.merge'),
      onClick: () => ui.openModal('merge'),
    },
    {
      id: 'split',
      icon: Scissors,
      label: t('actions.split'),
      onClick: () => ui.openModal('split'),
      disabled: !hasDoc,
    },
    {
      id: 'compress',
      icon: Package,
      label: t('actions.compress'),
      onClick: () => ui.openModal('compress'),
      disabled: !hasDoc,
      separator: true,
    },
    {
      id: 'rotateCW',
      icon: RotateCw,
      label: t('actions.rotateCW'),
      onClick: () => pdf.rotatePages('cw'),
      disabled: !hasDoc,
    },
    {
      id: 'rotateCCW',
      icon: RotateCcw,
      label: t('actions.rotateCCW'),
      onClick: () => pdf.rotatePages('ccw'),
      disabled: !hasDoc,
    },
    {
      id: 'delete',
      icon: Trash2,
      label: t('actions.deletePages'),
      onClick: pdf.deletePages,
      disabled: !hasDoc,
      danger: true,
      separator: true,
    },
    {
      id: 'duplicate',
      icon: Copy,
      label: t('actions.duplicate'),
      onClick: pdf.duplicatePage,
      disabled: !hasDoc,
    },
    {
      id: 'addBlank',
      icon: FilePlus,
      label: t('actions.addBlankPage'),
      onClick: pdf.addBlankPage,
      disabled: !hasDoc,
      separator: true,
    },
    {
      id: 'addText',
      icon: Type,
      label: t('actions.addText'),
      onClick: () => ui.openModal('addText'),
      disabled: !hasDoc,
    },
    {
      id: 'addImage',
      icon: ImageIcon,
      label: t('actions.addImage'),
      onClick: () => ui.openModal('addImage'),
      disabled: !hasDoc,
    },
    {
      id: 'signature',
      icon: PenLine,
      label: t('actions.addSignature'),
      onClick: () => ui.openModal('signature'),
      disabled: !hasDoc,
      separator: true,
    },
    {
      id: 'undo',
      icon: Undo2,
      label: `${t('actions.undo')} (Ctrl+Z)`,
      onClick: docStore.undo,
      disabled: !canUndo,
    },
    {
      id: 'redo',
      icon: Redo2,
      label: `${t('actions.redo')} (Ctrl+Y)`,
      onClick: docStore.redo,
      disabled: !canRedo,
      separator: true,
    },
    {
      id: 'zoomIn',
      icon: ZoomIn,
      label: `${t('actions.zoomIn')} (Ctrl++)`,
      onClick: () => docStore.setScale(docStore.scale * 1.2),
      disabled: !hasDoc,
    },
    {
      id: 'zoomOut',
      icon: ZoomOut,
      label: `${t('actions.zoomOut')} (Ctrl+-)`,
      onClick: () => docStore.setScale(docStore.scale * 0.83),
      disabled: !hasDoc,
    },
    {
      id: 'fitWidth',
      icon: AlignCenter,
      label: t('actions.fitWidth'),
      onClick: () => docStore.setZoomMode('fitWidth'),
      disabled: !hasDoc,
    },
    {
      id: 'fitPage',
      icon: Maximize2,
      label: t('actions.fitPage'),
      onClick: () => docStore.setZoomMode('fitPage'),
      disabled: !hasDoc,
    },
  ]

  return (
    <div className="flex-shrink-0 flex flex-col items-center py-3 gap-1 w-12 border-s border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* Theme toggle */}
      <Tooltip content={ui.theme === 'dark' ? 'Light mode' : 'Dark mode'} side="start">
        <button
          onClick={ui.toggleTheme}
          className={clsx(
            'p-2 rounded-xl transition-all duration-150',
            'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {ui.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </Tooltip>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors mb-1"
      >
        {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      <div className="w-6 h-px bg-gray-200 dark:bg-gray-800 mb-1" />

      {/* Tools */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-0.5 w-full"
          >
            {tools.map((tool) => (
              <React.Fragment key={tool.id}>
                {tool.separator && (
                  <div className="w-6 h-px bg-gray-100 dark:bg-gray-800/80 my-1" />
                )}
                <Tooltip content={tool.label} side="start">
                  <button
                    onClick={tool.onClick}
                    disabled={tool.disabled}
                    className={clsx(
                      'p-2 rounded-xl w-full flex items-center justify-center transition-all duration-150',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      tool.danger
                        ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
                    )}
                  >
                    <tool.icon className="h-4 w-4" />
                  </button>
                </Tooltip>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
