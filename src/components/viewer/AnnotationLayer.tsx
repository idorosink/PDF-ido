import React, { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { X, Move } from 'lucide-react'
import { useDocumentStore } from '@/store/documentStore'
import type { Annotation } from '@/types'

interface AnnotationLayerProps {
  docId: string
  pageIndex: number
  pageWidth: number
  pageHeight: number
  scale: number
}

interface DragState {
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
}

export function AnnotationLayer({ docId, pageIndex, pageWidth, pageHeight, scale }: AnnotationLayerProps) {
  const doc = useDocumentStore()
  const annotations = doc.documents
    .find((d) => d.id === docId)
    ?.pages[pageIndex]?.annotations ?? []

  const [dragState, setDragState] = useState<DragState | null>(null)

  const startDrag = useCallback(
    (e: React.MouseEvent, ann: Annotation) => {
      e.preventDefault()
      e.stopPropagation()
      setDragState({
        id: ann.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: ann.x,
        origY: ann.y,
      })

      const onMove = (me: MouseEvent) => {
        const dx = (me.clientX - e.clientX) / (pageWidth * scale)
        const dy = (me.clientY - e.clientY) / (pageHeight * scale)
        doc.updateAnnotation(docId, pageIndex, {
          ...ann,
          x: Math.max(0, Math.min(1 - ann.width, dragState ? dragState.origX + dx : ann.x + dx)),
          y: Math.max(0, Math.min(1 - ann.height, dragState ? dragState.origY + dy : ann.y + dy)),
        })
      }

      const onUp = () => {
        setDragState(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [docId, pageIndex, pageWidth, pageHeight, scale, doc, dragState]
  )

  if (annotations.length === 0) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ width: pageWidth * scale, height: pageHeight * scale }}
    >
      {annotations.map((ann) => (
        <AnnotationItem
          key={ann.id}
          annotation={ann}
          pageWidth={pageWidth * scale}
          pageHeight={pageHeight * scale}
          onDragStart={(e) => startDrag(e, ann)}
          onRemove={() => doc.removeAnnotation(docId, pageIndex, ann.id)}
        />
      ))}
    </div>
  )
}

function AnnotationItem({
  annotation,
  pageWidth,
  pageHeight,
  onDragStart,
  onRemove,
}: {
  annotation: Annotation
  pageWidth: number
  pageHeight: number
  onDragStart: (e: React.MouseEvent) => void
  onRemove: () => void
}) {
  const x = annotation.x * pageWidth
  const y = annotation.y * pageHeight
  const w = annotation.width * pageWidth
  const h = annotation.height * pageHeight

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        'absolute pointer-events-auto group',
        'ring-1 ring-transparent hover:ring-indigo-400 rounded'
      )}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: annotation.opacity,
      }}
    >
      {/* Controls */}
      <div className="absolute -top-7 start-0 hidden group-hover:flex items-center gap-1 z-10">
        <button
          onMouseDown={onDragStart}
          className="rounded bg-indigo-600 p-1 text-white cursor-grab active:cursor-grabbing"
        >
          <Move className="h-3 w-3" />
        </button>
        <button
          onClick={onRemove}
          className="rounded bg-red-600 p-1 text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      {annotation.type === 'text' && (
        <div
          className="w-full h-full overflow-hidden flex items-start p-1"
          style={{
            color: annotation.color,
            fontSize: (annotation.fontSize ?? 14) + 'px',
            fontFamily: annotation.fontFamily ?? 'sans-serif',
          }}
        >
          {annotation.text}
        </div>
      )}
      {(annotation.type === 'image' || annotation.type === 'signature') && annotation.imageData && (
        <img
          src={annotation.imageData}
          alt=""
          className="w-full h-full object-contain"
          style={{ opacity: annotation.opacity }}
        />
      )}
      {annotation.type === 'highlight' && (
        <div
          className="w-full h-full rounded"
          style={{ backgroundColor: annotation.color, opacity: 0.3 }}
        />
      )}
    </motion.div>
  )
}
