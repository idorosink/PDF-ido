import React, { useEffect, useRef, useCallback, useState } from 'react'
import { clsx } from 'clsx'
import { renderPage, getPage } from '@/services/pdfRenderer'

interface PDFPageProps {
  data: Uint8Array
  pageNumber: number   // 1-indexed
  scale: number
  rotation?: number
  isActive?: boolean
  showTextLayer?: boolean
  onVisible?: (pageNumber: number) => void
  className?: string
}

export const PDFPage = React.memo(function PDFPage({
  data,
  pageNumber,
  scale,
  rotation = 0,
  isActive = false,
  showTextLayer = true,
  onVisible,
  className,
}: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedRef = useRef<{ scale: number; rotation: number; dataLen: number } | null>(null)
  const textRenderedRef = useRef<{ scale: number; rotation: number; dataLen: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const prev = renderedRef.current
    if (
      prev &&
      prev.scale === scale &&
      prev.rotation === rotation &&
      prev.dataLen === data.length
    ) return

    try {
      await renderPage(data, pageNumber, canvas, scale, rotation)
      renderedRef.current = { scale, rotation, dataLen: data.length }
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') {
        console.error(`Canvas render error page ${pageNumber}:`, e)
      }
    }
  }, [data, pageNumber, scale, rotation])

  const renderText = useCallback(async () => {
    const textDiv = textLayerRef.current
    if (!textDiv || !showTextLayer) return
    const prev = textRenderedRef.current
    if (
      prev &&
      prev.scale === scale &&
      prev.rotation === rotation &&
      prev.dataLen === data.length
    ) return

    try {
      // Clear existing text layer
      textDiv.replaceChildren()

      const page = await getPage(data, pageNumber)
      const viewport = page.getViewport({ scale, rotation })

      textDiv.style.width = `${Math.floor(viewport.width)}px`
      textDiv.style.height = `${Math.floor(viewport.height)}px`

      // PDF.js 4.x TextLayer API
      const { TextLayer } = await import('pdfjs-dist')
      const textLayer = new (TextLayer as any)({
        textContentSource: page.streamTextContent({ includeMarkedContent: true }),
        container: textDiv,
        viewport,
      })
      await textLayer.render()
      textRenderedRef.current = { scale, rotation, dataLen: data.length }
    } catch (e: any) {
      // Graceful fallback — text layer is optional
      if (e?.name !== 'RenderingCancelledException' && e?.name !== 'AbortException') {
        console.warn(`Text layer error page ${pageNumber}:`, e)
      }
    }
  }, [data, pageNumber, scale, rotation, showTextLayer])

  // IntersectionObserver for lazy rendering
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true)
            onVisible?.(pageNumber)
          }
        }
      },
      { threshold: 0.02, rootMargin: '200px' }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [onVisible, pageNumber])

  // Render when visible or when deps change
  useEffect(() => {
    if (!isVisible) return
    renderCanvas()
  }, [isVisible, renderCanvas])

  useEffect(() => {
    if (!isVisible) return
    renderText()
  }, [isVisible, renderText])

  // Also trigger initial render
  useEffect(() => {
    renderCanvas()
    renderText()
  }, [renderCanvas, renderText])

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative flex-shrink-0 select-none',
        'overflow-hidden rounded-sm',
        'shadow-page',
        isActive && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent',
        className
      )}
      style={{ lineHeight: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="block max-w-full"
      />
      {showTextLayer && (
        <div
          ref={textLayerRef}
          className="pdf-text-layer absolute top-0 start-0 overflow-hidden select-text"
          aria-hidden="false"
        />
      )}
    </div>
  )
})
