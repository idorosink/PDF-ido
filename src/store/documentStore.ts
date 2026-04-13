import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { OpenDocument, PageState, HistoryEntry, Annotation } from '@/types'

interface DocumentState {
  documents: OpenDocument[]
  activeDocumentId: string | null
  activePageIndex: number
  selectedPageIndices: number[]
  scale: number
  zoomMode: 'custom' | 'fitWidth' | 'fitPage'
  viewMode: 'single' | 'continuous' | 'double'
  history: HistoryEntry[]
  historyIndex: number
  maxHistory: number
}

interface DocumentActions {
  addDocument: (doc: OpenDocument) => void
  removeDocument: (id: string) => void
  setActiveDocument: (id: string) => void
  setActivePage: (index: number) => void
  togglePageSelection: (index: number) => void
  selectPages: (indices: number[]) => void
  clearSelection: () => void
  setScale: (scale: number) => void
  setZoomMode: (mode: 'custom' | 'fitWidth' | 'fitPage') => void
  setViewMode: (mode: 'single' | 'continuous' | 'double') => void
  updateDocumentData: (id: string, data: Uint8Array, description: string) => void
  updatePageStates: (id: string, pages: PageState[]) => void
  setThumbnail: (docId: string, pageIndex: number, thumbnail: string) => void
  reorderPages: (docId: string, fromIndex: number, toIndex: number) => void
  addAnnotation: (docId: string, pageIndex: number, annotation: Annotation) => void
  updateAnnotation: (docId: string, pageIndex: number, annotation: Annotation) => void
  removeAnnotation: (docId: string, pageIndex: number, annotationId: string) => void
  undo: () => void
  redo: () => void
  markClean: (id: string) => void
  getActiveDocument: () => OpenDocument | null
}

function createDefaultPages(count: number): PageState[] {
  return Array.from({ length: count }, (_, i) => ({
    pageIndex: i,
    rotation: 0,
    thumbnail: null,
    thumbnailLoading: false,
    annotations: [],
  }))
}

export const useDocumentStore = create<DocumentState & DocumentActions>()(
  immer((set, get) => ({
    documents: [],
    activeDocumentId: null,
    activePageIndex: 0,
    selectedPageIndices: [],
    scale: 1.0,
    zoomMode: 'fitPage',
    viewMode: 'continuous',
    history: [],
    historyIndex: -1,
    maxHistory: 50,

    addDocument: (doc) =>
      set((state) => {
        state.documents.push(doc)
        state.activeDocumentId = doc.id
        state.activePageIndex = 0
        state.selectedPageIndices = []
      }),

    removeDocument: (id) =>
      set((state) => {
        state.documents = state.documents.filter((d) => d.id !== id)
        if (state.activeDocumentId === id) {
          state.activeDocumentId = state.documents[0]?.id ?? null
          state.activePageIndex = 0
        }
      }),

    setActiveDocument: (id) =>
      set((state) => {
        state.activeDocumentId = id
        state.activePageIndex = 0
        state.selectedPageIndices = []
      }),

    setActivePage: (index) =>
      set((state) => {
        state.activePageIndex = index
      }),

    togglePageSelection: (index) =>
      set((state) => {
        const idx = state.selectedPageIndices.indexOf(index)
        if (idx === -1) {
          state.selectedPageIndices.push(index)
        } else {
          state.selectedPageIndices.splice(idx, 1)
        }
      }),

    selectPages: (indices) =>
      set((state) => {
        state.selectedPageIndices = indices
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedPageIndices = []
      }),

    setScale: (scale) =>
      set((state) => {
        state.scale = Math.max(0.25, Math.min(5.0, scale))
        state.zoomMode = 'custom'
      }),

    setZoomMode: (mode) =>
      set((state) => {
        state.zoomMode = mode
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode
      }),

    updateDocumentData: (id, data, description) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === id)
        if (!doc) return
        // Push to history
        const entry: HistoryEntry = {
          documentId: id,
          data: doc.currentData,
          pages: JSON.parse(JSON.stringify(doc.pages)),
          description,
          timestamp: Date.now(),
        }
        // Trim future history if we're mid-stream
        state.history = state.history.slice(0, state.historyIndex + 1)
        state.history.push(entry)
        if (state.history.length > state.maxHistory) {
          state.history.shift()
        } else {
          state.historyIndex++
        }
        doc.currentData = data
        doc.isDirty = true
      }),

    updatePageStates: (id, pages) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === id)
        if (doc) doc.pages = pages
      }),

    setThumbnail: (docId, pageIndex, thumbnail) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (doc && doc.pages[pageIndex]) {
          doc.pages[pageIndex].thumbnail = thumbnail
          doc.pages[pageIndex].thumbnailLoading = false
        }
      }),

    reorderPages: (docId, fromIndex, toIndex) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (!doc) return
        const pages = [...doc.pages]
        const [moved] = pages.splice(fromIndex, 1)
        pages.splice(toIndex, 0, moved)
        // Update pageIndex values
        pages.forEach((p, i) => { p.pageIndex = i })
        doc.pages = pages
      }),

    addAnnotation: (docId, pageIndex, annotation) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (doc && doc.pages[pageIndex]) {
          doc.pages[pageIndex].annotations.push(annotation)
          doc.isDirty = true
        }
      }),

    updateAnnotation: (docId, pageIndex, annotation) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (doc && doc.pages[pageIndex]) {
          const idx = doc.pages[pageIndex].annotations.findIndex((a) => a.id === annotation.id)
          if (idx !== -1) doc.pages[pageIndex].annotations[idx] = annotation
        }
      }),

    removeAnnotation: (docId, pageIndex, annotationId) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === docId)
        if (doc && doc.pages[pageIndex]) {
          doc.pages[pageIndex].annotations = doc.pages[pageIndex].annotations.filter(
            (a) => a.id !== annotationId
          )
          doc.isDirty = true
        }
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex < 0) return
        const entry = state.history[state.historyIndex]
        const doc = state.documents.find((d) => d.id === entry.documentId)
        if (doc) {
          doc.currentData = entry.data
          doc.pages = entry.pages
          doc.isDirty = true
        }
        state.historyIndex--
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return
        state.historyIndex++
        const entry = state.history[state.historyIndex + 1]
        if (!entry) return
        const doc = state.documents.find((d) => d.id === entry.documentId)
        if (doc) {
          doc.currentData = entry.data
          doc.pages = entry.pages
          doc.isDirty = true
        }
      }),

    markClean: (id) =>
      set((state) => {
        const doc = state.documents.find((d) => d.id === id)
        if (doc) doc.isDirty = false
      }),

    getActiveDocument: () => {
      const state = get()
      return state.documents.find((d) => d.id === state.activeDocumentId) ?? null
    },
  }))
)

export function createDocument(
  id: string,
  name: string,
  data: Uint8Array,
  pageCount: number
): OpenDocument {
  return {
    id,
    name,
    originalData: data,
    currentData: data,
    pageCount,
    pages: createDefaultPages(pageCount),
    isDirty: false,
    createdAt: Date.now(),
  }
}
