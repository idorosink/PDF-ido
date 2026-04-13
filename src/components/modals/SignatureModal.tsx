import React, { useRef, useState, useEffect } from 'react'
import { Modal, Button } from '@/components/ui/Modal'
import { Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useDocumentStore } from '@/store/documentStore'
import { useUIStore } from '@/store/uiStore'
import { useTranslation } from 'react-i18next'
import type { Annotation } from '@/types'

type Mode = 'draw' | 'type'

function uid() { return Math.random().toString(36).slice(2, 10) }

export function SignatureModal() {
  const { t } = useTranslation()
  const docStore = useDocumentStore()
  const ui = useUIStore()
  const activeDoc = docStore.getActiveDocument()

  const [mode, setMode] = useState<Mode>('draw')
  const [typedSig, setTypedSig] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [mode])

  const startDraw = (e: React.MouseEvent) => {
    isDrawingRef.current = true
    const rect = canvasRef.current!.getBoundingClientRect()
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const last = lastPointRef.current!
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPointRef.current = { x, y }
  }

  const endDraw = () => { isDrawingRef.current = false; lastPointRef.current = null }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const applySignature = () => {
    if (!activeDoc) return
    let imageData: string

    if (mode === 'draw') {
      imageData = canvasRef.current!.toDataURL('image/png')
    } else {
      if (!typedSig.trim()) return
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 80
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, 300, 80)
      ctx.font = "italic 36px 'Dancing Script', Georgia, serif"
      ctx.fillStyle = '#1e293b'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedSig, 10, 40)
      imageData = canvas.toDataURL('image/png')
    }

    const annotation: Annotation = {
      id: uid(),
      type: 'signature',
      pageIndex: docStore.activePageIndex,
      x: 0.1,
      y: 0.7,
      width: 0.3,
      height: 0.1,
      imageData,
      color: '#000000',
      opacity: 1,
    }
    docStore.addAnnotation(activeDoc.id, docStore.activePageIndex, annotation)
    ui.addToast({ message: 'Signature added', type: 'success' })
    ui.closeModal()
  }

  return (
    <Modal
      title={t('signature.title')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={ui.closeModal}>{t('actions.cancel')}</Button>
          <Button onClick={applySignature}>{t('signature.apply')}</Button>
        </>
      }
    >
      {/* Mode selector */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
        {(['draw', 'type'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'flex-1 py-2 text-sm font-medium transition-colors',
              mode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            {m === 'draw' ? t('signature.draw') : t('signature.type')}
          </button>
        ))}
      </div>

      {mode === 'draw' ? (
        <div>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl cursor-crosshair bg-white"
          />
          <button
            onClick={clearCanvas}
            className="mt-2 flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('signature.clear')}
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={typedSig}
          onChange={(e) => setTypedSig(e.target.value)}
          placeholder={t('signature.placeholder')}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-4 text-2xl italic"
          style={{ fontFamily: 'Georgia, serif' }}
        />
      )}
    </Modal>
  )
}
