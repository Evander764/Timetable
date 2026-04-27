import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'
import type { Rectangle } from 'electron/main'
import type { AppData, WidgetKey } from '@shared/types/app'
import type { OverlayWidgetUpdatePayload, WindowStatePayload } from '@shared/ipc'

type OverlayRuntimeState = {
  hidden: boolean
  collapsedEdge?: 'left' | 'right' | 'top' | 'bottom'
  expandedBounds?: Rectangle
  suppressBoundsSync: boolean
  syncTimer?: NodeJS.Timeout
}

const rendererHtml = join(__dirname, '../renderer/index.html')
const preloadPath = join(__dirname, '../preload/index.mjs')

function loadRoute(window: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    return window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`)
  }

  return window.loadFile(rendererHtml, { hash: `/${hash}` })
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private readonly overlayWindows = new Map<WidgetKey, BrowserWindow>()
  private readonly overlayState = new Map<WidgetKey, OverlayRuntimeState>()
  private latestData: AppData | null = null

  constructor(
    private readonly onOverlayBoundsChanged: (payload: OverlayWidgetUpdatePayload) => Promise<void>,
  ) {}

  async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    const window = new BrowserWindow({
      width: 1560,
      height: 980,
      minWidth: 1320,
      minHeight: 820,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#EDF4FF',
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    })

    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })

    window.on('closed', () => {
      this.mainWindow = null
    })
    window.on('maximize', () => this.sendWindowState(window, { isMaximized: true }))
    window.on('unmaximize', () => this.sendWindowState(window, { isMaximized: false }))
    window.once('ready-to-show', () => window.show())

    await loadRoute(window, 'overview')
    this.mainWindow = window
    return window
  }

  async syncOverlayWindows(data: AppData): Promise<void> {
    this.latestData = data
    if (!data.desktopSettings.overlayEnabled) {
      this.hideOverlayWindows()
      return
    }

    const keys = Object.keys(data.desktopSettings.widgets) as WidgetKey[]
    for (const key of keys) {
      const config = data.desktopSettings.widgets[key]
      if (!config.enabled) {
        this.destroyOverlayWindow(key)
        continue
      }

      const window = this.overlayWindows.get(key) ?? (await this.createOverlayWindow(key, data))
      this.applyOverlayWindowState(window, key, data)
    }

    for (const key of this.overlayWindows.keys()) {
      if (!keys.includes(key) || !data.desktopSettings.widgets[key].enabled) {
        this.destroyOverlayWindow(key)
      }
    }
  }

  hideOverlayWindows(): void {
    for (const key of [...this.overlayWindows.keys()]) {
      this.destroyOverlayWindow(key)
    }
  }

  broadcastData(data: AppData): void {
    this.mainWindow?.webContents.send('data:changed', data)
    for (const window of this.overlayWindows.values()) {
      window.webContents.send('data:changed', data)
    }
  }

  controlCurrentWindow(window: BrowserWindow, action: 'minimize' | 'maximize' | 'close'): void {
    if (action === 'minimize') {
      window.minimize()
      return
    }
    if (action === 'maximize') {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
      return
    }

    window.close()
  }

  handleOverlayHover(key: WidgetKey, hovering: boolean, data: AppData): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime) {
      return
    }

    if (hovering) {
      if (runtime.hidden && runtime.expandedBounds) {
        this.setOverlayBounds(key, runtime.expandedBounds)
        runtime.hidden = false
      }
      return
    }

    const config = data.desktopSettings.widgets[key]
    const shouldAutoHide = config.autoHide || data.desktopSettings.autoHide
    if (!shouldAutoHide) {
      return
    }

    const display = screen.getDisplayMatching(window.getBounds()).workArea
    const bounds = window.getBounds()
    const threshold = 40
    const strip = 22

    const edge = getCollapsibleEdge(bounds, display, threshold)
    if (!edge) {
      return
    }

    runtime.expandedBounds = bounds
    runtime.collapsedEdge = edge
    runtime.hidden = true

    const collapsed = { ...bounds }
    if (edge === 'left') {
      collapsed.x = display.x - bounds.width + strip
    } else if (edge === 'right') {
      collapsed.x = display.x + display.width - strip
    } else if (edge === 'top') {
      collapsed.y = display.y - bounds.height + strip
    } else {
      collapsed.y = display.y + display.height - strip
    }

    this.setOverlayBounds(key, collapsed, false)
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  private async createOverlayWindow(key: WidgetKey, data: AppData): Promise<BrowserWindow> {
    const config = data.desktopSettings.widgets[key]
    const window = new BrowserWindow({
      x: Math.round(config.x),
      y: Math.round(config.y),
      width: Math.round(config.width),
      height: Math.round(config.height),
      minWidth: 240,
      minHeight: 160,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: true,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    })

    window.on('moved', () => this.queueOverlayBoundsSync(key))
    window.on('resized', () => this.queueOverlayBoundsSync(key))
    window.on('closed', () => {
      this.overlayWindows.delete(key)
      this.overlayState.delete(key)
    })
    window.once('ready-to-show', () => window.showInactive())

    this.overlayWindows.set(key, window)
    this.overlayState.set(key, { hidden: false, suppressBoundsSync: false })
    await loadRoute(window, `overlay/${key}`)
    return window
  }

  private applyOverlayWindowState(window: BrowserWindow, key: WidgetKey, data: AppData): void {
    const config = data.desktopSettings.widgets[key]
    const runtime = this.overlayState.get(key)
    if (!runtime) {
      return
    }
    window.setIgnoreMouseEvents(false)
    window.setAlwaysOnTop(data.desktopSettings.overlayMode === 'floating' && data.desktopSettings.alwaysOnTop, 'screen-saver')
    window.setOpacity(clampOpacity(config.opacity * data.desktopSettings.opacity))
    this.setOverlayBounds(
      key,
      {
        x: Math.round(config.x),
        y: Math.round(config.y),
        width: Math.round(config.width),
        height: Math.round(config.height),
      },
      false,
    )

    if (runtime.hidden && runtime.expandedBounds) {
      runtime.hidden = false
      runtime.expandedBounds = undefined
      runtime.collapsedEdge = undefined
    }
  }

  private queueOverlayBoundsSync(key: WidgetKey): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime || runtime.suppressBoundsSync) {
      return
    }

    clearTimeout(runtime.syncTimer)
    runtime.syncTimer = setTimeout(() => {
      const bounds = window.getBounds()
      void this.onOverlayBoundsChanged({
        key,
        changes: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      })
    }, 180)
  }

  private setOverlayBounds(key: WidgetKey, bounds: Rectangle, center = false): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime) {
      return
    }

    runtime.suppressBoundsSync = true
    if (center) {
      window.center()
    } else {
      window.setBounds(bounds)
    }
    setTimeout(() => {
      runtime.suppressBoundsSync = false
    }, 60)
  }

  private destroyOverlayWindow(key: WidgetKey): void {
    const window = this.overlayWindows.get(key)
    if (!window) {
      return
    }

    this.overlayWindows.delete(key)
    this.overlayState.delete(key)
    window.destroy()
  }

  private sendWindowState(window: BrowserWindow, payload: WindowStatePayload): void {
    window.webContents.send('window:state', payload)
  }
}

function clampOpacity(value: number): number {
  return Math.max(0.2, Math.min(1, value))
}

function getCollapsibleEdge(bounds: Rectangle, display: Rectangle, threshold: number): 'left' | 'right' | 'top' | 'bottom' | undefined {
  if (Math.abs(bounds.x - display.x) <= threshold) {
    return 'left'
  }
  if (Math.abs(display.x + display.width - (bounds.x + bounds.width)) <= threshold) {
    return 'right'
  }
  if (Math.abs(bounds.y - display.y) <= threshold) {
    return 'top'
  }
  if (Math.abs(display.y + display.height - (bounds.y + bounds.height)) <= threshold) {
    return 'bottom'
  }
  return undefined
}
