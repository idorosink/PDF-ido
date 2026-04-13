'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  writeFile: (opts) => ipcRenderer.invoke('fs:writeFile', opts),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  isElectron: true,
})
