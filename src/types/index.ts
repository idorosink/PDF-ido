// Core types for the PDF-ido application

export type Theme = 'dark' | 'light'
export type Language = 'he' | 'en'
export type Direction = 'rtl' | 'ltr'
export type ViewMode = 'single' | 'continuous' | 'double'
export type ZoomMode = 'custom' | 'fitWidth' | 'fitPage'
export type AnnotationType = 'text' | 'image' | 'signature' | 'highlight' | 'freehand'
export type ModalType =
  | 'merge'
  | 'split'
  | 'compress'
  | 'addText'
  | 'addImage'
  | 'signature'
  | 'crop'
  | null

export interface PageState {
  pageIndex: number        // 0-based
  rotation: number         // 0 | 90 | 180 | 270
  thumbnail: string | null // data URL
  thumbnailLoading: boolean
  annotations: Annotation[]
}

export interface OpenDocument {
  id: string
  name: string
  originalData: Uint8Array
  currentData: Uint8Array
  pageCount: number
  pages: PageState[]
  isDirty: boolean
  createdAt: number
}

export interface HistoryEntry {
  documentId: string
  data: Uint8Array
  pages: PageState[]
  description: string
  timestamp: number
}

export interface Annotation {
  id: string
  type: AnnotationType
  pageIndex: number
  // Position as fraction of page dimensions (0-1)
  x: number
  y: number
  width: number
  height: number
  // Content
  text?: string
  imageData?: string  // base64 data URL
  // Styling
  color: string
  opacity: number
  fontSize?: number
  fontFamily?: string
  strokeWidth?: number
  points?: { x: number; y: number }[]  // for freehand
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export interface SplitRange {
  start: number   // 1-based page number
  end: number
  name: string
}

export interface CropRect {
  x: number       // fraction of page width
  y: number
  width: number
  height: number
}
