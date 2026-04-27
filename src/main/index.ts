import { join } from 'node:path'
import { app } from 'electron'
import type { OverlayWidgetUpdatePayload } from '@shared/ipc'
import { BrowserUsageTracker } from './browserUsageTracker'
import { promptForGithubUpdate } from './githubUpdate'
import { registerIpcHandlers } from './ipc'
import { AppStorage } from './storage'
import { getLaunchAtStartup } from './startup'
import { WindowManager } from './windows'

let storage: AppStorage
let windows: WindowManager
let browserUsageTracker: BrowserUsageTracker

async function bootstrap(): Promise<void> {
  const dataPath = join(app.getPath('userData'), 'app-data.json')
  storage = new AppStorage(dataPath)
  await storage.initialize()
  await storage.updateSettings({
    appSettings: {
      launchAtStartup: getLaunchAtStartup(),
    },
  })

  windows = new WindowManager(async (payload: OverlayWidgetUpdatePayload) => {
    const next = await storage.updateWidget(payload)
    windows.broadcastData(next)
  }, () => storage.getData())

  browserUsageTracker = new BrowserUsageTracker({
    getData: () => storage.getData(),
    recordUsage: (sample, durationSeconds) => storage.recordBrowserUsage(sample, durationSeconds),
    onDataChanged: (next) => windows.broadcastData(next),
  })

  registerIpcHandlers({
    storage,
    windows,
    getData: () => storage.getData(),
  })

  await windows.createMainWindow()
  await windows.syncOverlayWindows(storage.getData())
  windows.broadcastData(storage.getData())
  browserUsageTracker.start()
  void promptForGithubUpdate(storage, windows.getMainWindow()).then(() => windows.broadcastData(storage.getData()))
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.timeable.app')
  await bootstrap()

  app.on('activate', async () => {
    if (windows.getMainWindow() === null) {
      await windows.createMainWindow()
    }
  })
})

app.on('before-quit', async () => {
  browserUsageTracker?.stop()
  await storage?.flush()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
