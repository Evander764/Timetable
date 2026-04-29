import { pathToFileURL } from 'node:url'
import { contextBridge, ipcRenderer } from 'electron'
import type { AppDataPatch, TimeableApi } from '@shared/ipc'

const api: TimeableApi = {
  loadData: () => ipcRenderer.invoke('data:load'),
  updateData: (action) => ipcRenderer.invoke('data:update', action),
  updateSettings: (payload) => ipcRenderer.invoke('settings:update', payload),
  updateOverlayWidget: (payload) => ipcRenderer.invoke('overlay:update', payload),
  snapOverlayPosition: (payload) => ipcRenderer.invoke('overlay:snapPosition', payload),
  showOverlay: () => ipcRenderer.invoke('overlay:show'),
  hideOverlay: () => ipcRenderer.invoke('overlay:hide'),
  setStartup: (enabled) => ipcRenderer.invoke('startup:set', enabled),
  selectBackground: () => ipcRenderer.invoke('file:selectBackground'),
  exportData: () => ipcRenderer.invoke('data:export'),
  listDataBackups: () => ipcRenderer.invoke('data:listBackups'),
  restoreDataBackup: (id) => ipcRenderer.invoke('data:restoreBackup', id),
  saveBrowserUsageDay: (date) => ipcRenderer.invoke('browserUsage:saveDay', date),
  filePathToUrl: (filePath) => pathToFileURL(filePath).toString(),
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  overlayHover: (key, hovering) => ipcRenderer.send('overlay:hover', { key, hovering }),
  onDataChanged: (listener) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: Awaited<ReturnType<TimeableApi['loadData']>>) => {
      listener(data)
    }

    ipcRenderer.on('data:changed', subscription)
    return () => {
      ipcRenderer.removeListener('data:changed', subscription)
    }
  },
  onDataPatched: (listener) => {
    const subscription = (_event: Electron.IpcRendererEvent, patch: AppDataPatch) => {
      listener(patch)
    }

    ipcRenderer.on('data:patched', subscription)
    return () => {
      ipcRenderer.removeListener('data:patched', subscription)
    }
  },
  onWindowStateChanged: (listener) => {
    const subscription = (_event: Electron.IpcRendererEvent, payload: { isMaximized: boolean }) => {
      listener(payload)
    }
    ipcRenderer.on('window:state', subscription)
    return () => {
      ipcRenderer.removeListener('window:state', subscription)
    }
  },
}

contextBridge.exposeInMainWorld('timeable', api)
