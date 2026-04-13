import React, { useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { renderPage } from '@/services/pdfRenderer'

interface PDFPageProps {
  data: Uint8Array
  pageNumber: number   // 1-indexed
  scale: number
  rotation?: number
  isActive?: boolean
  onVisible?: (pageNumber: number) => void
  className?: string
}

export const PDFPage = React.memo(function PDFPage({
  data,
  pageNumber,
  scale,
  rotation = 0,
  isActive = false,
  onVisible,
  className,
}: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedRef = useRef<{ scale: number; rotation: number; dataLen: number } | null>(null)

  const render = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const alreadyRendered = renderedRef.current
    if (
      alreadyRendered &&
      alreadyRendered.scale === scale &&
      alreadyRendered.rotation === rotation &&
      alreadyRendered.dataLen === data.length
    ) return

    try {
      await renderPage(data, pageNumber, canvas, scale, rotation)
      renderedRef.current = { scale, rotation, dataLen: data.length }
    } catch (e) {
      console.error(`Error rendering page ${pageNumber}:`, e)
    }
  }, [data, pageNumber, scale, rotation])

  // IntersectionObserver for lazy rendering
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            render()
            onVisible?.(pageNumber)
          }
        }
      },
      { threshold: 0.05 }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [render, onVisible, pageNumber])

  // Re-render when dependencies change
  useEffect(() => {
    render()
  }, [render])

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative flex-shrink-0 select-none',
        'rounded-sm overflow-hidden',
        'shadow-page',
        isActive && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent',
        className
      )}
      style={{ lineHeight: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="block max-w-full"
        style={{ display: 'block' }}
      />
    </div>
  )
})
