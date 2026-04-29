import { access, copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { OverlayWidgetUpdatePayload } from '@shared/ipc'
import { registerIpcHandlers } from './ipc'
import { BrowserUsageTracker } from './browserUsageTracker'
import { AppStorage } from './storage'
import { getLaunchAtStartup } from './startup'
import { AppTray } from './tray'
import { WindowManager } from './windows'

let storage: AppStorage
let windows: WindowManager
let browserUsageTracker: BrowserUsageTracker | undefined
let appTray: AppTray | undefined

async function bootstrap(): Promise<void> {
  const dataPath = join(app.getPath('userData'), 'app-data.json')
  await migrateLegacyTimeableData(dataPath)
  storage = new AppStorage(dataPath)
  await storage.initialize()
  await storage.updateSettings({
    appSettings: {
      launchAtStartup: getLaunchAtStartup(),
    },
  })

  windows = new WindowManager(async (payload: OverlayWidgetUpdatePayload) => {
    const patch = await storage.updateWidgetPatch(payload)
    windows.broadcastPatch(patch)
  })

  appTray = new AppTray({
    showMainWindow: () => windows.showMainWindow(),
    hideMainWindow: () => windows.hideMainWindow(),
    quitApplication: async () => {
      await storage.flush()
      windows.quitApplication()
    },
  })

  registerIpcHandlers({
    storage,
    windows,
    getData: () => storage.getData(),
  })

  await windows.createMainWindow()
  await windows.syncOverlayWindows(storage.getData())
  windows.broadcastData(storage.getData())

  browserUsageTracker = new BrowserUsageTracker({
    getData: () => storage.getData(),
    recordUsage: (sample, durationSeconds) => storage.recordBrowserUsagePatch(sample, durationSeconds),
    onDataPatched: (patch) => windows.broadcastPatch(patch),
  })
  browserUsageTracker.start()
}

async function migrateLegacyTimeableData(dataPath: string): Promise<void> {
  try {
    await access(dataPath)
    return
  } catch {
    // Continue and try the previous product-name directory.
  }

  const legacyDataPath = join(app.getPath('appData'), 'Timeable', 'app-data.json')
  if (legacyDataPath === dataPath) {
    return
  }

  try {
    await access(legacyDataPath)
    await mkdir(dirname(dataPath), { recursive: true })
    await copyFile(legacyDataPath, dataPath)
  } catch {
    // If there is no previous data, normal initialization will create a fresh file.
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.timetable.app')
  await bootstrap()

  app.on('activate', async () => {
    if (windows.getMainWindow() === null) {
      await windows.createMainWindow()
    }
  })
})

app.on('before-quit', async () => {
  browserUsageTracker?.stop()
  appTray?.destroy()
  await storage?.flush()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
