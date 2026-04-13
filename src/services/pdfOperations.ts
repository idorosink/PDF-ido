/**
 * PDF Operations Service
 * All PDF manipulation operations using pdf-lib.
 * Each function is pure: takes Uint8Array input, returns new Uint8Array.
 */
import { PDFDocument, degrees, PageSizes, StandardFonts, rgb } from 'pdf-lib'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

// ── Core Operations ────────────────────────────────────────────────────────────

/** Rotate one or more pages by delta degrees (cumulative with existing rotation) */
export async function rotatePages(
  data: Uint8Array,
  pageIndices: number[],
  deltaDegrees: 90 | -90 | 180
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  for (const idx of pageIndices) {
    const page = doc.getPage(idx)
    const current = page.getRotation().angle
    page.setRotation(degrees((current + deltaDegrees + 360) % 360))
  }
  return doc.save()
}

/** Delete pages by 0-based indices */
export async function deletePages(data: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  // Remove in reverse order to preserve indices
  const sorted = [...pageIndices].sort((a, b) => b - a)
  for (const idx of sorted) {
    doc.removePage(idx)
  }
  return doc.save()
}

/** Duplicate a page, inserting the copy immediately after the original */
export async function duplicatePage(data: Uint8Array, pageIndex: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const [copiedPage] = await doc.copyPages(doc, [pageIndex])
  doc.insertPage(pageIndex + 1, copiedPage)
  return doc.save()
}

/** Insert a blank page of the same size as the reference page */
export async function addBlankPage(
  data: Uint8Array,
  afterIndex: number,
  width?: number,
  height?: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  let w = width
  let h = height
  if (!w || !h) {
    const refPage = doc.getPage(Math.min(afterIndex, doc.getPageCount() - 1))
    const size = refPage.getSize()
    w = size.width
    h = size.height
  }
  doc.insertPage(afterIndex + 1, [w, h])
  return doc.save()
}

/** Reorder pages: move pageIndex to targetIndex */
export async function movePages(
  data: Uint8Array,
  order: number[]  // new order as array of original 0-based indices
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(doc, order)
  for (const page of pages) {
    newDoc.addPage(page)
  }
  return newDoc.save()
}

/** Merge multiple PDFs into one */
export async function mergePDFs(pdfDataArray: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const data of pdfDataArray) {
    const doc = await PDFDocument.load(data)
    const indices = doc.getPageIndices()
    const pages = await merged.copyPages(doc, indices)
    for (const page of pages) {
      merged.addPage(page)
    }
  }
  return merged.save()
}

/** Split PDF into separate documents by page ranges */
export async function splitPDF(
  data: Uint8Array,
  ranges: { start: number; end: number }[]  // 0-based inclusive
): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(data)
  const results: Uint8Array[] = []
  for (const range of ranges) {
    const newDoc = await PDFDocument.create()
    const indices = []
    for (let i = range.start; i <= Math.min(range.end, doc.getPageCount() - 1); i++) {
      indices.push(i)
    }
    if (indices.length === 0) continue
    const pages = await newDoc.copyPages(doc, indices)
    for (const page of pages) {
      newDoc.addPage(page)
    }
    results.push(await newDoc.save())
  }
  return results
}

/** Split every page into separate document */
export async function splitPDFAllPages(data: Uint8Array): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(data)
  const count = doc.getPageCount()
  const results: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const newDoc = await PDFDocument.create()
    const [page] = await newDoc.copyPages(doc, [i])
    newDoc.addPage(page)
    results.push(await newDoc.save())
  }
  return results
}

/** Embed text as overlay annotation on a page */
export async function addTextOverlay(
  data: Uint8Array,
  pageIndex: number,
  text: string,
  options: {
    x: number         // absolute points from bottom-left
    y: number
    fontSize?: number
    color?: string    // hex
    fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier'
    opacity?: number
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const page = doc.getPage(pageIndex)
  const fontName = (options.fontFamily || 'Helvetica') as keyof typeof StandardFonts
  const font = await doc.embedFont(StandardFonts[fontName] ?? StandardFonts.Helvetica)
  const { r, g, b } = hexToRgb(options.color ?? '#000000')
  page.drawText(text, {
    x: options.x,
    y: options.y,
    size: options.fontSize ?? 14,
    font,
    color: rgb(r, g, b),
    opacity: options.opacity ?? 1,
  })
  return doc.save()
}

/** Embed image as overlay on a page */
export async function addImageOverlay(
  data: Uint8Array,
  pageIndex: number,
  imageData: Uint8Array,
  imageType: 'png' | 'jpeg',
  options: { x: number; y: number; width: number; height: number; opacity?: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const page = doc.getPage(pageIndex)
  const image =
    imageType === 'png'
      ? await doc.embedPng(imageData)
      : await doc.embedJpg(imageData)
  page.drawImage(image, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    opacity: options.opacity ?? 1,
  })
  return doc.save()
}

/** Crop a page to the given rect (in PDF points from bottom-left) */
export async function cropPage(
  data: Uint8Array,
  pageIndex: number,
  rect: { x: number; y: number; width: number; height: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data)
  const page = doc.getPage(pageIndex)
  page.setCropBox(rect.x, rect.y, rect.width, rect.height)
  page.setMediaBox(rect.x, rect.y, rect.width, rect.height)
  return doc.save()
}

/** Extract metadata */
export async function getPDFMetadata(data: Uint8Array) {
  const doc = await PDFDocument.load(data)
  return {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    pageCount: doc.getPageCount(),
  }
}

/** Get file size formatted */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
