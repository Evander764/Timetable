import { join } from 'node:path'
import { app, type BrowserWindow } from 'electron'
import { applyDataPatch } from '@shared/data/reducer'
import type { AppData, WidgetKey } from '@shared/types/app'
import type { AppDataPatch, OverlayWidgetUpdatePayload, WindowControlAction } from '@shared/ipc'
import { MainWindowController } from './windowing/mainWindowController'
import { OverlayWindowController } from './windowing/overlayWindowController'

const rendererHtml = join(__dirname, '../renderer/index.html')
const preloadPath = join(__dirname, '../preload/index.mjs')

function loadRoute(window: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    return window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`)
  }

  return window.loadFile(rendererHtml, { hash: `/${hash}` })
}

export class WindowManager {
  private latestData: AppData | null = null
  private isQuitting = false
  private readonly mainWindows: MainWindowController
  private readonly overlayWindows: OverlayWindowController

  constructor(onOverlayBoundsChanged: (payload: OverlayWidgetUpdatePayload) => Promise<void>) {
    this.mainWindows = new MainWindowController({
      preloadPath,
      loadRoute,
      isQuitting: () => this.isQuitting,
      shouldCloseToTray: () => this.shouldCloseToTray(),
      quitApplication: () => this.quitApplication(),
    })
    this.overlayWindows = new OverlayWindowController({
      preloadPath,
      loadRoute,
      onOverlayBoundsChanged,
    })
  }

  createMainWindow(): Promise<BrowserWindow> {
    return this.mainWindows.createMainWindow()
  }

  async syncOverlayWindows(data: AppData): Promise<void> {
    this.latestData = data
    await this.overlayWindows.syncOverlayWindows(data)
  }

  hideOverlayWindows(): void {
    this.overlayWindows.hideOverlayWindows()
  }

  broadcastData(data: AppData): void {
    this.mainWindows.broadcastData(data)
    this.overlayWindows.broadcastData(data)
  }

  broadcastPatch(patch: AppDataPatch): void {
    if (this.latestData) {
      this.latestData = applyDataPatch(this.latestData, patch)
    }

    this.mainWindows.broadcastPatch(patch)
    if (patch.type === 'widget/replace') {
      this.overlayWindows.broadcastPatch(patch)
    }
  }

  showMainWindow(): Promise<void> {
    return this.mainWindows.showMainWindow()
  }

  hideMainWindow(): void {
    this.mainWindows.hideMainWindow()
  }

  shouldCloseToTray(): boolean {
    return this.latestData?.appSettings.closeButtonAction === 'tray'
  }

  controlCurrentWindow(window: BrowserWindow, action: WindowControlAction): void {
    this.mainWindows.controlCurrentWindow(window, action)
  }

  quitApplication(): void {
    this.isQuitting = true
    this.hideOverlayWindows()
    app.quit()
  }

  handleOverlayHover(key: WidgetKey, hovering: boolean, data: AppData): void {
    this.overlayWindows.handleOverlayHover(key, hovering, data)
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindows.getMainWindow()
  }
}
