import React, { useState } from 'react'
import { Modal, Button } from '@/components/ui/Modal'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from 'react-i18next'
import type { Annotation } from '@/types'

function uid() { return Math.random().toString(36).slice(2, 10) }

export function TextAnnotationModal() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const activeDoc = docStore.getActiveDocument()

  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(16)
  const [color, setColor] = useState('#1e293b')
  const [opacity, setOpacity] = useState(1)

  const apply = () => {
    if (!activeDoc || !text.trim()) return
    const annotation: Annotation = {
      id: uid(),
      type: 'text',
      pageIndex: docStore.activePageIndex,
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.1,
      text,
      color,
      opacity,
      fontSize,
      fontFamily: 'sans-serif',
    }
    docStore.addAnnotation(activeDoc.id, docStore.activePageIndex, annotation)
    ui.addToast({ message: 'Text added', type: 'success' })
    ui.closeModal()
  }

  return (
    <Modal
      title={t('addText.title')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={ui.closeModal}>{t('actions.cancel')}</Button>
          <Button onClick={apply} disabled={!text.trim()}>{t('actions.apply')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('addText.placeholder')}
          rows={4}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('addText.fontSize')}</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
              min={8}
              max={72}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('addText.color')}</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('addText.opacity')} ({Math.round(opacity * 100)}%)</label>
          <input
            type="range"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            min={0.1}
            max={1}
            step={0.05}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>
    </Modal>
  )
}
