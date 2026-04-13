'use strict'

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const url = require('url')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  // Graceful show after ready
  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ───────────────────────────────────────────────────────────────

// Open file dialog
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  if (result.canceled) return null
  const files = []
  for (const filePath of result.filePaths) {
    try {
      const data = fs.readFileSync(filePath)
      files.push({
        name: path.basename(filePath),
        data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        path: filePath,
      })
    } catch (e) {
      console.error('Failed to read file:', filePath, e)
    }
  }
  return files
})

// Save file dialog
ipcMain.handle('dialog:saveFile', async (_event, { defaultName }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName || 'document.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  return result.canceled ? null : result.filePath
})

// Write file
ipcMain.handle('fs:writeFile', async (_event, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data))
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Open external
ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url)
})
