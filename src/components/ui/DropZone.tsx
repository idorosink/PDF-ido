import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { usePDF } from '@/hooks/usePDF'
import { useTranslation } from 'react-i18next'

interface DropZoneProps {
  className?: string
  onlyOverlay?: boolean  // show as a transparent overlay for drag-over
}

export function DropZone({ className, onlyOverlay = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const pdf = usePDF()
  const { t } = useTranslation()

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
      )
      if (files.length > 0) {
        pdf.openPDFFiles(files)
      }
    },
    [pdf]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  if (onlyOverlay) {
    return isDragOver ? (
      <div
        className="absolute inset-0 z-50 bg-indigo-500/20 border-4 border-dashed border-indigo-400 rounded-xl flex items-center justify-center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <span className="text-indigo-300 font-semibold text-lg">Drop PDF here</span>
      </div>
    ) : null
  }

  return (
    <div
      className={clsx(
        'absolute inset-0 flex flex-col items-center justify-center',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <motion.div
        animate={{
          borderColor: isDragOver ? '#6366f1' : '#d1d5db',
          backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
        }}
        className={clsx(
          'flex flex-col items-center justify-center gap-4 rounded-2xl',
          'border-2 border-dashed border-gray-300 dark:border-gray-700',
          'p-12 text-center cursor-pointer select-none',
          'hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20',
          'transition-colors duration-200'
        )}
        onClick={() => pdf.openPDFFiles()}
      >
        <div className={clsx(
          'rounded-full p-4 transition-colors',
          isDragOver ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-800'
        )}>
          {isDragOver ? (
            <Upload className="h-8 w-8 text-indigo-500" />
          ) : (
            <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <div>
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            {isDragOver ? 'Release to open' : t('viewer.noDocument')}
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            PDF files only
          </p>
        </div>
      </motion.div>
    </div>
  )
}
