/**
 * PDF Renderer Service
 * Wraps PDF.js for rendering pages to canvases and generating thumbnails.
 */
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface RenderOptions {
  scale: number
  rotation?: number
  canvas?: HTMLCanvasElement
}

export interface PageDimensions {
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

// Cache loaded PDF documents by data fingerprint
const documentCache = new Map<string, PDFDocumentProxy>()

function dataFingerprint(data: Uint8Array): string {
  // Simple fingerprint: first 32 bytes + length
  const head = Array.from(data.slice(0, 32))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${head}_${data.length}`
}

export async function loadPDFDocument(data: Uint8Array): Promise<PDFDocumentProxy> {
  const key = dataFingerprint(data)
  if (documentCache.has(key)) {
    return documentCache.get(key)!
  }
  const copy = data.slice(0) // defensive copy
  const doc = await pdfjsLib.getDocument({ data: copy }).promise
  documentCache.set(key, doc)
  return doc
}

export function evictDocument(data: Uint8Array) {
  const key = dataFingerprint(data)
  const doc = documentCache.get(key)
  if (doc) {
    doc.destroy()
    documentCache.delete(key)
  }
}

export async function getPageCount(data: Uint8Array): Promise<number> {
  const doc = await loadPDFDocument(data)
  return doc.numPages
}

export async function getPage(data: Uint8Array, pageNumber: number): Promise<PDFPageProxy> {
  const doc = await loadPDFDocument(data)
  return doc.getPage(pageNumber) // 1-indexed
}

export async function getPageDimensions(
  data: Uint8Array,
  pageNumber: number,
  scale = 1.0,
  rotation = 0
): Promise<PageDimensions> {
  const page = await getPage(data, pageNumber)
  const viewport = page.getViewport({ scale, rotation })
  const naturalViewport = page.getViewport({ scale: 1.0 })
  return {
    width: viewport.width,
    height: viewport.height,
    originalWidth: naturalViewport.width,
    originalHeight: naturalViewport.height,
  }
}

// Active render tasks so we can cancel stale renders
const activeRenderTasks = new Map<string, RenderTask>()

export async function renderPage(
  data: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation = 0
): Promise<void> {
  const taskKey = `${dataFingerprint(data)}_${pageNumber}`

  // Cancel any in-flight render for this page
  const existing = activeRenderTasks.get(taskKey)
  if (existing) {
    try { existing.cancel() } catch {}
  }

  const page = await getPage(data, pageNumber)
  const viewport = page.getViewport({ scale, rotation })

  const devicePixelRatio = window.devicePixelRatio || 1
  const outputScale = devicePixelRatio

  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(outputScale, outputScale)

  const renderContext = {
    canvasContext: ctx,
    viewport,
    intent: 'display' as const,
  }

  const task = page.render(renderContext)
  activeRenderTasks.set(taskKey, task)

  try {
    await task.promise
  } catch (e: any) {
    if (e?.name !== 'RenderingCancelledException') {
      throw e
    }
  } finally {
    activeRenderTasks.delete(taskKey)
  }
}

export async function generateThumbnail(
  data: Uint8Array,
  pageNumber: number,
  targetWidth = 150,
  rotation = 0
): Promise<string> {
  const page = await getPage(data, pageNumber)
  const naturalViewport = page.getViewport({ scale: 1.0, rotation })
  const scale = targetWidth / naturalViewport.width
  const viewport = page.getViewport({ scale, rotation })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d')!
  const task = page.render({ canvasContext: ctx, viewport, intent: 'print' as const })

  try {
    await task.promise
  } catch (e: any) {
    if (e?.name !== 'RenderingCancelledException') throw e
  }

  return canvas.toDataURL('image/jpeg', 0.75)
}

export async function getTextContent(data: Uint8Array, pageNumber: number) {
  const page = await getPage(data, pageNumber)
  return page.getTextContent()
}
