import { join } from 'node:path'
import { app } from 'electron'
import type { OverlayWidgetUpdatePayload } from '@shared/ipc'
import { BrowserUsageTracker } from './browserUsageTracker'
import { CourseReminderService } from './courseReminder'
import { promptForGithubUpdate } from './githubUpdate'
import { registerIpcHandlers } from './ipc'
import { AppStorage } from './storage'
import { getLaunchAtStartup } from './startup'
import { WindowManager } from './windows'

let storage: AppStorage
let windows: WindowManager
let browserUsageTracker: BrowserUsageTracker
let courseReminderService: CourseReminderService

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
  }, () => storage.getData(), () => storage.flush())

  browserUsageTracker = new BrowserUsageTracker({
    getData: () => storage.getData(),
    recordUsage: (sample, durationSeconds) => storage.recordBrowserUsage(sample, durationSeconds),
    onDataChanged: (next) => windows.broadcastData(next),
  })
  courseReminderService = new CourseReminderService({
    getData: () => storage.getData(),
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
  courseReminderService.start()
  void promptForGithubUpdate(storage, windows.getMainWindow()).then(() => windows.broadcastData(storage.getData()))
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
  courseReminderService?.stop()
  await storage?.flush()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
