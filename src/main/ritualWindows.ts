import { BrowserWindow, screen } from 'electron'
import type { AppSettings } from '@shared/types/app'
import { formatDateKey } from '@shared/utils/date'
import {
  buildEntryRitualHtml,
  buildExitRitualHtml,
  buildWorkRitualHtml,
  getEntryRitualDurationMs,
  getExitRitualDurationMs,
  getWorkRitualDurationMs,
} from './ritualHtml'

const ritualWindows = new Set<BrowserWindow>()

function createRitualWindow(): BrowserWindow {
  const bounds = screen.getPrimaryDisplay().bounds
  const window = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#030303',
    show: true,
    fullscreenable: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  ritualWindows.add(window)
  window.on('closed', () => ritualWindows.delete(window))
  return window
}

function loadRitualHtml(window: BrowserWindow, html: string): void {
  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

export function showEntryRitualSplash(appSettings: AppSettings): Promise<void> {
  const window = createRitualWindow()
  const todayKey = formatDateKey(new Date())
  loadRitualHtml(window, buildEntryRitualHtml(appSettings, todayKey))
  return closeAfter(window, getEntryRitualDurationMs(appSettings))
}

export function showExitRitualSplash(appSettings: AppSettings): Promise<void> {
  const window = createRitualWindow()
  loadRitualHtml(window, buildExitRitualHtml(appSettings))
  return closeAfter(window, getExitRitualDurationMs(appSettings))
}

export function showWorkRitualSplash(appSettings: AppSettings): Promise<void> {
  const window = createRitualWindow()
  const todayKey = formatDateKey(new Date())
  loadRitualHtml(window, buildWorkRitualHtml(appSettings, todayKey))
  return closeAfter(window, getWorkRitualDurationMs(appSettings))
}

function closeAfter(window: BrowserWindow, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!window.isDestroyed()) {
        window.close()
      }
      resolve()
    }, durationMs)
  })
}
