/**
 * File Service
 * Handles file I/O for both web (File API) and Electron (IPC).
 */

declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<Array<{ name: string; data: ArrayBuffer; path: string }> | null>
      saveFile: (opts: { defaultName: string }) => Promise<string | null>
      writeFile: (opts: { filePath: string; data: Uint8Array }) => Promise<{ success: boolean; error?: string }>
      openExternal: (url: string) => Promise<void>
      isElectron: boolean
    }
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron

export interface OpenedFile {
  name: string
  data: Uint8Array
  path?: string
}

/** Open one or more PDF files */
export async function openFiles(): Promise<OpenedFile[]> {
  if (isElectron && window.electronAPI) {
    const files = await window.electronAPI.openFile()
    if (!files) return []
    return files.map((f) => ({
      name: f.name,
      data: new Uint8Array(f.data),
      path: f.path,
    }))
  }
  // Web: use input element
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.multiple = true
    input.onchange = async () => {
      const files: OpenedFile[] = []
      if (input.files) {
        for (const file of Array.from(input.files)) {
          const buffer = await file.arrayBuffer()
          files.push({ name: file.name, data: new Uint8Array(buffer) })
        }
      }
      resolve(files)
    }
    input.click()
  })
}

/** Read a File object dropped via drag-and-drop */
export async function readDroppedFile(file: File): Promise<OpenedFile> {
  const buffer = await file.arrayBuffer()
  return { name: file.name, data: new Uint8Array(buffer) }
}

/** Save PDF data to disk */
export async function saveFile(data: Uint8Array, defaultName: string): Promise<boolean> {
  if (isElectron && window.electronAPI) {
    const filePath = await window.electronAPI.saveFile({ defaultName })
    if (!filePath) return false
    const result = await window.electronAPI.writeFile({ filePath, data })
    return result.success
  }
  // Web: trigger download
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/** Download a PDF (same as save for web) */
export async function downloadFile(data: Uint8Array, name: string): Promise<void> {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Generate a unique document ID */
export function generateDocId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
