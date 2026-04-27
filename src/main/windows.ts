import { join } from 'node:path'
import { app, BrowserWindow, Menu, nativeImage, screen, shell, Tray } from 'electron'
import type { Rectangle } from 'electron/main'
import type { AppData, WidgetKey } from '@shared/types/app'
import type { OverlayWidgetUpdatePayload, WindowStatePayload } from '@shared/ipc'

type OverlayRuntimeState = {
  hidden: boolean
  collapsedEdge?: 'left' | 'right' | 'top' | 'bottom'
  expandedBounds?: Rectangle
  suppressBoundsSync: boolean
  syncTimer?: NodeJS.Timeout
  suppressTimer?: NodeJS.Timeout
  suppressResizeUntil?: number
  hideTimer?: NodeJS.Timeout
}

const rendererHtml = join(__dirname, '../renderer/index.html')
const preloadPath = join(__dirname, '../preload/index.mjs')
const AUTO_HIDE_THRESHOLD = 40
const AUTO_HIDE_STRIP = 22
const PROGRAMMATIC_BOUNDS_SUPPRESS_MS = 180
const MAIN_WINDOW_DEFAULT_WIDTH = 1180
const MAIN_WINDOW_DEFAULT_HEIGHT = 760
const MAIN_WINDOW_MIN_WIDTH = 1024
const MAIN_WINDOW_MIN_HEIGHT = 660
const MAIN_WINDOW_SCREEN_MARGIN = 64

function loadRoute(window: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    return window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`)
  }

  return window.loadFile(rendererHtml, { hash: `/${hash}` })
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private tray: Tray | null = null
  private isQuitting = false
  private readonly overlayWindows = new Map<WidgetKey, BrowserWindow>()
  private readonly overlayState = new Map<WidgetKey, OverlayRuntimeState>()
  private latestData: AppData | null = null

  constructor(
    private readonly onOverlayBoundsChanged: (payload: OverlayWidgetUpdatePayload) => Promise<void>,
    private readonly getData?: () => AppData,
  ) {}

  async createMainWindow(): Promise<BrowserWindow> {
    this.initializeTray()
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    const primaryWorkArea = screen.getPrimaryDisplay().workArea
    const initialSize = getDefaultMainWindowSize(primaryWorkArea)
    const window = new BrowserWindow({
      width: initialSize.width,
      height: initialSize.height,
      minWidth: initialSize.minWidth,
      minHeight: initialSize.minHeight,
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
      this.refreshTrayMenu()
    })
    window.on('show', () => this.refreshTrayMenu())
    window.on('hide', () => this.refreshTrayMenu())
    window.on('maximize', () => this.sendWindowState(window, { isMaximized: true }))
    window.on('unmaximize', () => this.sendWindowState(window, { isMaximized: false }))
    window.once('ready-to-show', () => window.show())

    await loadRoute(window, 'overview')
    this.mainWindow = window
    return window
  }

  initializeTray(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      return
    }

    const trayIcon = nativeImage.createFromPath(join(__dirname, '../renderer/tray-icon.png'))
    const fallbackIcon = nativeImage.createFromPath(join(__dirname, '../renderer/favicon.svg'))
    const image = trayIcon.isEmpty() ? fallbackIcon : trayIcon.resize({ width: 16, height: 16 })
    this.tray = new Tray(image)
    this.tray.setToolTip('Timetable')
    this.tray.on('click', () => void this.showMainWindow())
    this.tray.on('double-click', () => void this.showMainWindow())
    this.refreshTrayMenu()
  }

  refreshTrayMenu(): void {
    if (!this.tray || this.tray.isDestroyed()) {
      return
    }

    const mainVisible = Boolean(this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.isVisible())
    const closeAction = this.getCloseButtonAction()
    const trayOnlyQuitEnabled = this.isTrayOnlyQuitEnabled()
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示 Timetable', click: () => void this.showMainWindow() },
      { label: '隐藏到托盘', enabled: mainVisible, click: () => this.hideMainWindow() },
      { type: 'separator' },
      { label: `退出方式：${trayOnlyQuitEnabled ? '仅托盘退出' : '按关闭按钮设置'}`, enabled: false },
      { label: `关闭按钮：${trayOnlyQuitEnabled || closeAction === 'hide' ? '隐藏到托盘' : '退出程序'}`, enabled: false },
      { type: 'separator' },
      { label: '彻底退出', click: () => void this.quitApplication() },
    ])
    this.tray.setContextMenu(contextMenu)
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
    this.refreshTrayMenu()
  }

  async controlCurrentWindow(window: BrowserWindow, action: 'minimize' | 'maximize' | 'close' | 'hide' | 'show' | 'quit'): Promise<void> {
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

    if (action === 'hide') {
      this.hideMainWindow()
      return
    }

    if (action === 'show') {
      await this.showMainWindow()
      return
    }

    if (action === 'quit') {
      await this.quitApplication()
      return
    }

    await this.handleMainWindowCloseIntent(this.getData?.())
  }

  async handleMainWindowCloseIntent(data?: AppData | null): Promise<void> {
    const shouldHide = this.isTrayOnlyQuitEnabled(data) || this.getCloseButtonAction(data) === 'hide'
    if (shouldHide) {
      this.hideMainWindow()
      return
    }

    await this.quitApplication()
  }

  hideMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
    }
    this.refreshTrayMenu()
  }

  async showMainWindow(): Promise<void> {
    const window = await this.createMainWindow()
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
    window.focus()
    this.refreshTrayMenu()
  }

  async quitApplication(): Promise<void> {
    this.isQuitting = true
    this.tray?.destroy()
    this.tray = null
    for (const key of [...this.overlayWindows.keys()]) {
      this.destroyOverlayWindow(key)
    }
    this.mainWindow?.destroy()
    app.quit()
  }

  handleOverlayHover(key: WidgetKey, hovering: boolean, data: AppData): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime) {
      return
    }

    if (hovering) {
      if (runtime.hidden && runtime.expandedBounds) {
        runtime.hidden = false
        runtime.collapsedEdge = undefined
        const expandedBounds = constrainBoundsToDisplay(runtime.expandedBounds)
        this.setOverlayBounds(key, expandedBounds)
        this.restoreOverlayWindowConstraints(window, key, data)
        runtime.expandedBounds = undefined
      }
      return
    }

    if (runtime.hidden) {
      return
    }

    const config = data.desktopSettings.widgets[key]
    const shouldAutoHide = config.autoHide || data.desktopSettings.autoHide
    if (!shouldAutoHide) {
      return
    }

    const display = screen.getDisplayMatching(window.getBounds()).workArea
    const bounds = constrainBoundsToDisplay(window.getBounds(), display)
    const edge = getCollapsibleEdge(bounds, display, AUTO_HIDE_THRESHOLD)
    if (!edge) {
      return
    }

    runtime.expandedBounds = bounds
    runtime.collapsedEdge = edge
    runtime.hidden = true

    window.setMinimumSize(1, 1)
    window.setResizable(false)
    window.setMovable(false)
    this.setOverlayBounds(key, getCollapsedOverlayBounds(bounds, display, edge), false)
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  private async createOverlayWindow(key: WidgetKey, data: AppData): Promise<BrowserWindow> {
    const config = data.desktopSettings.widgets[key]
    const initialBounds = constrainBoundsToDisplay({
      x: Math.round(config.x),
      y: Math.round(config.y),
      width: Math.round(config.width),
      height: Math.round(config.height),
    })
    const window = new BrowserWindow({
      ...initialBounds,
      minWidth: getOverlayMinWidth(key),
      minHeight: getOverlayMinHeight(key),
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: isOverlayUserResizable(key),
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    })

    window.on('will-move', (event, newBounds) => {
      const runtime = this.overlayState.get(key)
      if (runtime?.hidden) {
        event.preventDefault()
        return
      }
      if (runtime) {
        runtime.suppressResizeUntil = Date.now() + 900
      }
      const constrained = constrainBoundsToDisplay(newBounds)
      if (!sameBounds(newBounds, constrained)) {
        event.preventDefault()
        const moveBounds = this.withConfiguredOverlaySize(key, constrained)
        this.setOverlayBounds(key, moveBounds)
        this.queueOverlayBoundsSync(key, moveBounds, true, 'move')
      }
    })
    window.on('moved', () => {
      const runtime = this.overlayState.get(key)
      if (runtime) {
        runtime.suppressResizeUntil = Date.now() + 900
      }
      this.queueOverlayBoundsSync(key, undefined, false, 'move')
    })
    window.on('resized', () => {
      const runtime = this.overlayState.get(key)
      const resizedDuringMove = Boolean(runtime?.suppressResizeUntil && Date.now() < runtime.suppressResizeUntil)
      this.queueOverlayBoundsSync(key, undefined, resizedDuringMove, resizedDuringMove ? 'move' : 'resize')
    })
    window.on('closed', () => {
      const runtime = this.overlayState.get(key)
      clearTimeout(runtime?.hideTimer)
      clearTimeout(runtime?.syncTimer)
      clearTimeout(runtime?.suppressTimer)
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
    const configuredBounds = constrainBoundsToDisplay({
      x: Math.round(config.x),
      y: Math.round(config.y),
      width: Math.round(config.width),
      height: Math.round(config.height),
    })
    window.setIgnoreMouseEvents(false)
    window.setAlwaysOnTop(data.desktopSettings.overlayMode === 'floating' && data.desktopSettings.alwaysOnTop, 'screen-saver')
    window.setOpacity(clampOpacity(config.opacity * data.desktopSettings.opacity))

    if (runtime.hidden) {
      runtime.expandedBounds ??= configuredBounds
      window.setMinimumSize(1, 1)
      window.setResizable(false)
      window.setMovable(false)

      if (runtime.collapsedEdge) {
        const display = screen.getDisplayMatching(runtime.expandedBounds).workArea
        const collapsedBounds = getCollapsedOverlayBounds(runtime.expandedBounds, display, runtime.collapsedEdge)
        if (!sameBounds(window.getBounds(), collapsedBounds)) {
          this.setOverlayBounds(key, collapsedBounds, false)
        }
      }
      return
    }

    this.restoreOverlayWindowConstraints(window, key, data)
    if (!runtime.hidden && !sameBounds(window.getBounds(), configuredBounds)) {
      this.setOverlayBounds(key, configuredBounds, false)
    }
  }

  private restoreOverlayWindowConstraints(window: BrowserWindow, key: WidgetKey, data: AppData): void {
    window.setMinimumSize(getOverlayMinWidth(key), getOverlayMinHeight(key))
    window.setResizable(isOverlayUserResizable(key))
    window.setMovable(isOverlayUserMovable() && !this.isOverlayDragLocked(key, data))
  }

  private withConfiguredOverlaySize(key: WidgetKey, bounds: Rectangle): Rectangle {
    const config = this.latestData?.desktopSettings.widgets[key]
    if (!config) {
      return constrainBoundsToDisplay(bounds)
    }

    return constrainBoundsToDisplay({
      x: bounds.x,
      y: bounds.y,
      width: Math.round(config.width),
      height: Math.round(config.height),
    })
  }

  private queueOverlayBoundsSync(key: WidgetKey, boundsOverride?: Rectangle, force = false, syncMode: 'bounds' | 'move' | 'resize' = 'bounds'): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime || (!force && (runtime.suppressBoundsSync || runtime.hidden))) {
      return
    }

    clearTimeout(runtime.syncTimer)
    runtime.syncTimer = setTimeout(() => {
      if (runtime.hidden) {
        return
      }

      const currentBounds = constrainBoundsToDisplay(boundsOverride ?? window.getBounds())
      const resizeSuppressedByMove = syncMode === 'resize' && runtime.suppressResizeUntil && Date.now() < runtime.suppressResizeUntil
      const effectiveMode = resizeSuppressedByMove ? 'move' : syncMode
      const bounds = effectiveMode === 'move' ? this.withConfiguredOverlaySize(key, currentBounds) : currentBounds
      if (!sameBounds(window.getBounds(), bounds)) {
        this.setOverlayBounds(key, bounds)
      }
      const changes = effectiveMode === 'move'
        ? { x: bounds.x, y: bounds.y }
        : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      void this.onOverlayBoundsChanged({
        key,
        changes,
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
    clearTimeout(runtime.suppressTimer)
    if (center) {
      window.center()
    } else {
      window.setBounds(bounds)
    }
    runtime.suppressTimer = setTimeout(() => {
      runtime.suppressBoundsSync = false
    }, PROGRAMMATIC_BOUNDS_SUPPRESS_MS)
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

  private getCloseButtonAction(data: AppData | null | undefined = undefined): 'exit' | 'hide' {
    try {
      const current = data ?? this.getData?.()
      return current?.appSettings?.closeButtonAction === 'hide' ? 'hide' : 'exit'
    } catch {
      return 'exit'
    }
  }

  private isTrayOnlyQuitEnabled(data: AppData | null | undefined = undefined): boolean {
    try {
      const current = data ?? this.getData?.()
      return current?.appSettings?.trayOnlyQuitEnabled === true
    } catch {
      return false
    }
  }

  private isOverlayDragLocked(key: WidgetKey, data: AppData): boolean {
    const config = data.desktopSettings.widgets[key]
    return data.desktopSettings.dragLocked || Boolean(config.dragLocked)
  }
}

function clampOpacity(value: number): number {
  return Math.max(0.2, Math.min(1, value))
}

function isOverlayUserResizable(key: WidgetKey): boolean {
  return key !== 'countdown'
}

function isOverlayUserMovable(): boolean {
  return true
}

function getOverlayMinWidth(key: WidgetKey): number {
  return key === 'countdown' ? 300 : 240
}

function getOverlayMinHeight(key: WidgetKey): number {
  if (key === 'countdown') {
    return 46
  }
  if (key === 'principle') {
    return 128
  }
  return 160
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min
  }
  return Math.max(min, Math.min(max, value))
}

function getDefaultMainWindowSize(workArea: Rectangle): { width: number; height: number; minWidth: number; minHeight: number } {
  const widthFloor = Math.min(MAIN_WINDOW_MIN_WIDTH, workArea.width)
  const heightFloor = Math.min(MAIN_WINDOW_MIN_HEIGHT, workArea.height)
  const width = Math.min(MAIN_WINDOW_DEFAULT_WIDTH, Math.max(widthFloor, workArea.width - MAIN_WINDOW_SCREEN_MARGIN))
  const height = Math.min(MAIN_WINDOW_DEFAULT_HEIGHT, Math.max(heightFloor, workArea.height - MAIN_WINDOW_SCREEN_MARGIN))
  return {
    width,
    height,
    minWidth: Math.min(MAIN_WINDOW_MIN_WIDTH, width),
    minHeight: Math.min(MAIN_WINDOW_MIN_HEIGHT, height),
  }
}

function constrainBoundsToDisplay(bounds: Rectangle, display = screen.getDisplayMatching(bounds).workArea): Rectangle {
  const width = Math.min(Math.max(1, Math.round(bounds.width)), display.width)
  const height = Math.min(Math.max(1, Math.round(bounds.height)), display.height)
  return {
    x: clamp(Math.round(bounds.x), display.x, display.x + display.width - width),
    y: clamp(Math.round(bounds.y), display.y, display.y + display.height - height),
    width,
    height,
  }
}

function sameBounds(a: Rectangle, b: Rectangle): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
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

function getCollapsedOverlayBounds(bounds: Rectangle, display: Rectangle, edge: 'left' | 'right' | 'top' | 'bottom'): Rectangle {
  const width = Math.min(Math.max(1, Math.round(bounds.width)), display.width)
  const height = Math.min(Math.max(1, Math.round(bounds.height)), display.height)
  const stripWidth = Math.min(AUTO_HIDE_STRIP, width, display.width)
  const stripHeight = Math.min(AUTO_HIDE_STRIP, height, display.height)
  const x = clamp(Math.round(bounds.x), display.x, display.x + display.width - width)
  const y = clamp(Math.round(bounds.y), display.y, display.y + display.height - height)

  if (edge === 'left') {
    return { x: display.x, y, width: stripWidth, height }
  }
  if (edge === 'right') {
    return { x: display.x + display.width - stripWidth, y, width: stripWidth, height }
  }
  if (edge === 'top') {
    return { x, y: display.y, width, height: stripHeight }
  }
  return { x, y: display.y + display.height - stripHeight, width, height: stripHeight }
}
