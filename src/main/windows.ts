import { join } from 'node:path'
import { app, BrowserWindow, Menu, nativeImage, screen, shell, Tray } from 'electron'
import type { Rectangle } from 'electron/main'
import type { AppData, WidgetKey } from '@shared/types/app'
import type { OverlayWidgetUpdatePayload, WindowStatePayload } from '@shared/ipc'
import { getEffectiveOverlayOpacity, normalizeDesktopAutoHideDelayMs } from '@shared/utils/widgets'

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
const AUTO_HIDE_POINTER_MARGIN = 8
const PROGRAMMATIC_BOUNDS_SUPPRESS_MS = 180
const MAIN_WINDOW_DEFAULT_WIDTH = 1180
const MAIN_WINDOW_DEFAULT_HEIGHT = 760
const MAIN_WINDOW_MIN_WIDTH = 1024
const MAIN_WINDOW_MIN_HEIGHT = 660
const MAIN_WINDOW_SCREEN_MARGIN = 64
const EMBEDDED_APP_ICON =
  'data:image/png;base64,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'

function loadRoute(window: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    return window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`)
  }

  return window.loadFile(rendererHtml, { hash: `/${hash}` })
}

function createAppIcon(size: number): Electron.NativeImage {
  // Keep tray/window icons on the same ICO source used for the packaged app icon.
  const candidates = [
    join(__dirname, '../renderer/favicon.ico'),
    join(process.cwd(), 'public/favicon.ico'),
    join(process.cwd(), 'buildResources/icon.ico'),
  ]
  const fileImage = candidates.map((path) => nativeImage.createFromPath(path)).find((image) => !image.isEmpty())
  const image = fileImage ?? nativeImage.createFromDataURL(EMBEDDED_APP_ICON)

  if (image.isEmpty()) {
    return image
  }

  return image.resize({ width: size, height: size })
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
    private readonly flushBeforeQuit?: () => Promise<void>,
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
      backgroundColor: '#f4f3f0',
      icon: createAppIcon(64),
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

    const image = createAppIcon(16)
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
      { label: '重启应用', click: () => void this.restartApplication() },
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
    await this.flushBeforeQuit?.()
    this.tray?.destroy()
    this.tray = null
    for (const key of [...this.overlayWindows.keys()]) {
      this.destroyOverlayWindow(key)
    }
    this.mainWindow?.destroy()
    app.quit()
  }

  async restartApplication(): Promise<void> {
    this.isQuitting = true
    await this.flushBeforeQuit?.()
    app.relaunch()
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
      clearTimeout(runtime.hideTimer)
      runtime.hideTimer = undefined
      if (runtime.hidden && runtime.expandedBounds) {
        runtime.hidden = false
        runtime.collapsedEdge = undefined
        const expandedBounds = constrainBoundsToDisplay(runtime.expandedBounds)
        this.restoreOverlayWindowConstraints(window, key, data)
        this.setOverlayBounds(key, expandedBounds)
        runtime.expandedBounds = undefined
      }
      return
    }

    if (runtime.hidden) {
      return
    }

    const config = data.desktopSettings.widgets[key]
    const shouldAutoHide = Boolean(config.autoHide)
    if (!shouldAutoHide) {
      return
    }

    this.scheduleOverlayCollapse(key, data)
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
      resizable: isOverlayUserResizable(key) && !this.isOverlayLayoutLocked(key, data),
      movable: isOverlayUserMovable() && !this.isOverlayLayoutLocked(key, data),
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
      const currentData = this.latestData ?? data
      if (runtime?.hidden || this.isOverlayLayoutLocked(key, currentData)) {
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
      const currentData = this.latestData ?? data
      if (this.isOverlayLayoutLocked(key, currentData)) {
        this.setOverlayBounds(key, this.withConfiguredOverlaySize(key, window.getBounds()))
        return
      }

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
    window.setOpacity(getEffectiveOverlayOpacity(config.opacity, data.desktopSettings.opacity))

    if (runtime.hidden) {
      runtime.expandedBounds ??= configuredBounds
      window.setResizable(false)
      window.setMovable(false)

      if (runtime.collapsedEdge) {
        const display = screen.getDisplayMatching(runtime.expandedBounds).workArea
        const collapsedBounds = getHiddenOverlayBounds(runtime.expandedBounds, display, runtime.collapsedEdge)
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
    const layoutLocked = this.isOverlayLayoutLocked(key, data)
    window.setResizable(isOverlayUserResizable(key) && !layoutLocked)
    window.setMovable(isOverlayUserMovable() && !layoutLocked)
  }

  private scheduleOverlayCollapse(key: WidgetKey, data: AppData): void {
    const runtime = this.overlayState.get(key)
    if (!runtime) {
      return
    }

    clearTimeout(runtime.hideTimer)
    runtime.hideTimer = setTimeout(() => {
      runtime.hideTimer = undefined
      const window = this.overlayWindows.get(key)
      const currentRuntime = this.overlayState.get(key)
      const currentData = this.getData?.() ?? data
      if (!window || !currentRuntime || currentRuntime.hidden) {
        return
      }

      const config = currentData.desktopSettings.widgets[key]
      const shouldAutoHide = Boolean(config.autoHide)
      if (!shouldAutoHide) {
        return
      }

      const currentBounds = window.getBounds()
      const cursor = screen.getCursorScreenPoint()
      if (isPointInsideBounds(cursor, currentBounds, AUTO_HIDE_POINTER_MARGIN)) {
        return
      }

      const display = screen.getDisplayMatching(currentBounds).workArea
      const bounds = constrainBoundsToDisplay(currentBounds, display)
      const edge = getCollapsibleEdge(bounds, display, AUTO_HIDE_THRESHOLD)
      if (!edge) {
        return
      }

      currentRuntime.expandedBounds = bounds
      currentRuntime.collapsedEdge = edge
      currentRuntime.hidden = true

      window.setResizable(false)
      window.setMovable(false)
      this.setOverlayBounds(key, getHiddenOverlayBounds(bounds, display, edge), false)
    }, normalizeDesktopAutoHideDelayMs(data.appSettings.desktopAutoHideDelayMs))
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

  private isOverlayLayoutLocked(key: WidgetKey, data: AppData): boolean {
    const config = data.desktopSettings.widgets[key]
    return data.appSettings.desktopLayoutLockEnabled || data.desktopSettings.dragLocked || Boolean(config.dragLocked)
  }
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

function getHiddenOverlayBounds(bounds: Rectangle, display: Rectangle, edge: 'left' | 'right' | 'top' | 'bottom'): Rectangle {
  const width = Math.min(Math.max(1, Math.round(bounds.width)), display.width)
  const height = Math.min(Math.max(1, Math.round(bounds.height)), display.height)
  const x = clamp(Math.round(bounds.x), display.x, display.x + display.width - width)
  const y = clamp(Math.round(bounds.y), display.y, display.y + display.height - height)

  if (edge === 'left') {
    return { x: display.x - width + AUTO_HIDE_STRIP, y, width, height }
  }
  if (edge === 'right') {
    return { x: display.x + display.width - AUTO_HIDE_STRIP, y, width, height }
  }
  if (edge === 'top') {
    return { x, y: display.y - height + AUTO_HIDE_STRIP, width, height }
  }
  return { x, y: display.y + display.height - AUTO_HIDE_STRIP, width, height }
}

function isPointInsideBounds(point: { x: number; y: number }, bounds: Rectangle, margin = 0): boolean {
  return (
    point.x >= bounds.x - margin &&
    point.x <= bounds.x + bounds.width + margin &&
    point.y >= bounds.y - margin &&
    point.y <= bounds.y + bounds.height + margin
  )
}
