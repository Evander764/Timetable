import { stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { BrowserWindow, dialog, ipcMain, screen, type OpenDialogOptions } from 'electron'
import type { AppData, WidgetPosition } from '@shared/types/app'
import type { DataAction, OverlaySnapPositionPayload, OverlayWidgetUpdatePayload, SelectBackgroundResult, SettingsUpdatePayload, WindowControlAction } from '@shared/ipc'
import { getLaunchAtStartup, setLaunchAtStartup } from './startup'
import type { AppStorage } from './storage'
import type { WindowManager } from './windows'

type IpcServices = {
  storage: AppStorage
  windows: WindowManager
  getData: () => AppData
}

export function registerIpcHandlers({ storage, windows, getData }: IpcServices): void {
  ipcMain.handle('data:load', async () => storage.getData())
  ipcMain.handle('data:update', async (_event, action: DataAction) => {
    const next = await storage.updateWithAction(action)
    await windows.syncOverlayWindows(next)
    windows.broadcastData(next)
    return next
  })
  ipcMain.handle('settings:update', async (_event, payload: SettingsUpdatePayload) => {
    const next = await storage.updateSettings(payload)
    await windows.syncOverlayWindows(next)
    windows.broadcastData(next)
    return next
  })
  ipcMain.handle('overlay:update', async (_event, payload: OverlayWidgetUpdatePayload) => {
    const patch = await storage.updateWidgetPatch(payload)
    const next = storage.getData()
    await windows.syncOverlayWindows(next)
    windows.broadcastPatch(patch)
    return next
  })
  ipcMain.handle('overlay:snapPosition', async (_event, payload: OverlaySnapPositionPayload) => {
    const current = getData()
    const widget = current.desktopSettings.widgets[payload.key]
    const targetDisplay = screen.getDisplayNearestPoint({ x: widget.x, y: widget.y }).workArea
    const snapped = getSnappedCoordinates(
      targetDisplay,
      Math.round(widget.width),
      Math.round(widget.height),
      payload.position,
    )

    let next = await storage.updateWidget({
      key: payload.key,
      changes: {
        x: snapped.x,
        y: snapped.y,
      },
    })

    if (payload.key === 'countdown') {
      next = await storage.updateWithAction({ type: 'countdown/update', payload: { position: payload.position } })
    }

    if (payload.key === 'principle') {
      next = await storage.updateWithAction({ type: 'principle/update', payload: { position: payload.position } })
    }

    await windows.syncOverlayWindows(next)
    windows.broadcastData(next)
    return next
  })
  ipcMain.handle('overlay:show', async () => {
    await windows.syncOverlayWindows(getData())
  })
  ipcMain.handle('overlay:hide', async () => {
    windows.hideOverlayWindows()
  })
  ipcMain.handle('startup:set', async (_event, enabled: boolean) => {
    setLaunchAtStartup(enabled)
    const next = await storage.setLaunchAtStartup(enabled)
    windows.broadcastData(next)
    return next
  })
  ipcMain.handle('file:selectBackground', async () => selectBackground(windows.getMainWindow()))
  ipcMain.handle('data:export', async () => {
    const result = await storage.exportData(windows.getMainWindow() ?? undefined)
    windows.broadcastData(storage.getData())
    return result
  })
  ipcMain.handle('data:listBackups', async () => storage.listDataBackups())
  ipcMain.handle('data:restoreBackup', async (_event, id: string) => {
    const next = await storage.restoreDataBackup(id)
    await windows.syncOverlayWindows(next)
    windows.broadcastData(next)
    return next
  })
  ipcMain.handle('browserUsage:saveDay', async (_event, date: string) => storage.saveBrowserUsageDay(date, windows.getMainWindow() ?? undefined))
  ipcMain.handle('window:control', async (event, action: WindowControlAction) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (action === 'close') {
      if (window && windows.shouldCloseToTray()) {
        windows.hideMainWindow()
        return
      }

      await storage.flush()
      windows.quitApplication()
      return
    }

    if (window) {
      windows.controlCurrentWindow(window, action)
    }
  })
  ipcMain.handle('file:pathToUrl', async (_event, filePath: string) => pathToFileURL(filePath).toString())

  ipcMain.on('overlay:hover', (_event, payload: { key: OverlayWidgetUpdatePayload['key']; hovering: boolean }) => {
    windows.handleOverlayHover(payload.key, payload.hovering, getData())
  })
}

async function selectBackground(window: BrowserWindow | null): Promise<SelectBackgroundResult | null> {
  const options: OpenDialogOptions = {
    title: '选择背景图片',
    properties: ['openFile'],
    filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
  }
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]
  const fileStat = await stat(selectedPath)
  return {
    path: selectedPath,
    name: selectedPath.split(/[\\/]/).at(-1),
    size: fileStat.size,
  }
}

export function getInitialLaunchState(): boolean {
  return getLaunchAtStartup()
}

function getSnappedCoordinates(
  workArea: Electron.Rectangle,
  width: number,
  height: number,
  position: WidgetPosition,
): { x: number; y: number } {
  const margin = 28

  const horizontal = position.endsWith('left')
    ? workArea.x + margin
    : position.endsWith('right')
      ? workArea.x + workArea.width - width - margin
      : workArea.x + Math.round((workArea.width - width) / 2)

  const vertical = position.startsWith('top')
    ? workArea.y + margin
    : position.startsWith('bottom')
      ? workArea.y + workArea.height - height - margin
      : workArea.y + Math.round((workArea.height - height) / 2)

  return { x: horizontal, y: vertical }
}
