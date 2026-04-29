import { BrowserWindow, screen } from 'electron'
import type { Rectangle } from 'electron/main'
import { applyDataPatch } from '@shared/data/reducer'
import type { AppData, WidgetKey } from '@shared/types/app'
import type { AppDataPatch, OverlayWidgetUpdatePayload } from '@shared/ipc'
import {
  AUTO_HIDE_DELAY_MS,
  AUTO_HIDE_THRESHOLD,
  PROGRAMMATIC_BOUNDS_SUPPRESS_MS,
  clampOpacity,
  constrainBoundsToDisplay,
  getCollapsedBounds,
  getCollapsibleEdge,
  pointInBounds,
  sameBounds,
  snapBoundsToEdge,
  type CollapsibleEdge,
  type WindowBounds,
} from './geometry'

type RouteLoader = (window: BrowserWindow, hash: string) => Promise<void>

type OverlayRuntimeState = {
  hidden: boolean
  collapsedEdge?: CollapsibleEdge
  expandedBounds?: Rectangle
  suppressBoundsSync: boolean
  syncTimer?: NodeJS.Timeout
  hideTimer?: NodeJS.Timeout
  suppressTimer?: NodeJS.Timeout
}

type OverlayWindowControllerOptions = {
  preloadPath: string
  loadRoute: RouteLoader
  onOverlayBoundsChanged: (payload: OverlayWidgetUpdatePayload) => Promise<void>
}

export class OverlayWindowController {
  private readonly overlayWindows = new Map<WidgetKey, BrowserWindow>()
  private readonly overlayState = new Map<WidgetKey, OverlayRuntimeState>()
  private latestData: AppData | null = null

  constructor(private readonly options: OverlayWindowControllerOptions) {}

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

    for (const key of [...this.overlayWindows.keys()]) {
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
    for (const window of this.overlayWindows.values()) {
      window.webContents.send('data:changed', data)
    }
  }

  broadcastPatch(patch: AppDataPatch): void {
    if (this.latestData) {
      this.latestData = applyDataPatch(this.latestData, patch)
    }

    for (const window of this.overlayWindows.values()) {
      window.webContents.send('data:patched', patch)
    }
  }

  handleOverlayHover(key: WidgetKey, hovering: boolean, data: AppData): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime) {
      return
    }

    clearTimeout(runtime.hideTimer)
    if (hovering) {
      this.expandOverlayWindow(key)
      return
    }

    if (!this.shouldAutoHide(key, data)) {
      return
    }

    runtime.hideTimer = setTimeout(() => {
      this.collapseOverlayWindow(key, data)
    }, AUTO_HIDE_DELAY_MS)
  }

  private async createOverlayWindow(key: WidgetKey, data: AppData): Promise<BrowserWindow> {
    const config = data.desktopSettings.widgets[key]
    const initialBounds = this.constrainToMatchingDisplay({
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
      resizable: isOverlayUserAdjustable(key),
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: this.options.preloadPath,
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

      const constrained = this.constrainToMatchingDisplay(newBounds)
      if (!sameBounds(newBounds, constrained)) {
        event.preventDefault()
        this.setOverlayBounds(key, constrained)
        this.queueOverlayBoundsSync(key, constrained, true)
      }
    })
    window.on('moved', () => this.queueOverlayBoundsSync(key))
    window.on('resized', () => this.queueOverlayBoundsSync(key))
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
    await this.options.loadRoute(window, `overlay/${key}`)
    return window
  }

  private applyOverlayWindowState(window: BrowserWindow, key: WidgetKey, data: AppData): void {
    const config = data.desktopSettings.widgets[key]
    const runtime = this.overlayState.get(key)
    if (!runtime) {
      return
    }

    const configuredBounds = this.constrainToMatchingDisplay({
      x: Math.round(config.x),
      y: Math.round(config.y),
      width: Math.round(config.width),
      height: Math.round(config.height),
    })

    window.setIgnoreMouseEvents(false)
    window.setAlwaysOnTop(data.desktopSettings.overlayMode === 'floating' && data.desktopSettings.alwaysOnTop, 'screen-saver')
    window.setOpacity(clampOpacity(config.opacity * data.desktopSettings.opacity))

    if (runtime.hidden && runtime.collapsedEdge && this.shouldAutoHide(key, data)) {
      const display = screen.getDisplayMatching(configuredBounds).workArea
      const expandedBounds = snapBoundsToEdge(configuredBounds, display, runtime.collapsedEdge)

      runtime.expandedBounds = expandedBounds
      window.setResizable(false)
      window.setMovable(false)
      this.setOverlayBounds(key, getCollapsedBounds(expandedBounds, display, runtime.collapsedEdge), false)
      return
    }

    runtime.hidden = false
    runtime.expandedBounds = undefined
    runtime.collapsedEdge = undefined
    window.setResizable(isOverlayUserAdjustable(key))
    window.setMovable(isOverlayUserAdjustable(key) && !this.isOverlayDragLocked(key, data))
    this.setOverlayBounds(key, configuredBounds, false)
  }

  private queueOverlayBoundsSync(key: WidgetKey, boundsOverride?: Rectangle, force = false): void {
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

      const bounds = this.constrainToMatchingDisplay(boundsOverride ?? window.getBounds())
      if (!sameBounds(window.getBounds(), bounds)) {
        this.setOverlayBounds(key, bounds)
      }

      void this.options.onOverlayBoundsChanged({
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

  private expandOverlayWindow(key: WidgetKey): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    if (!window || !runtime || !runtime.hidden || !runtime.expandedBounds) {
      return
    }

    const expandedBounds = this.constrainToMatchingDisplay(runtime.expandedBounds)
    const data = this.latestData
    runtime.hidden = false
    runtime.expandedBounds = undefined
    runtime.collapsedEdge = undefined
    window.setResizable(isOverlayUserAdjustable(key))
    window.setMovable(isOverlayUserAdjustable(key) && (!data || !this.isOverlayDragLocked(key, data)))
    this.setOverlayBounds(key, expandedBounds, false)
  }

  private collapseOverlayWindow(key: WidgetKey, fallbackData: AppData): void {
    const window = this.overlayWindows.get(key)
    const runtime = this.overlayState.get(key)
    const data = this.latestData ?? fallbackData
    if (!window || !runtime || runtime.hidden || !this.shouldAutoHide(key, data)) {
      return
    }

    const currentBounds = this.constrainToMatchingDisplay(window.getBounds())
    const cursor = screen.getCursorScreenPoint()
    if (pointInBounds(cursor, currentBounds, 2)) {
      return
    }

    const display = screen.getDisplayMatching(currentBounds).workArea
    const edge = getCollapsibleEdge(currentBounds, display, AUTO_HIDE_THRESHOLD)
    if (!edge) {
      if (!sameBounds(window.getBounds(), currentBounds)) {
        this.setOverlayBounds(key, currentBounds, false)
      }
      return
    }

    const expandedBounds = snapBoundsToEdge(currentBounds, display, edge)
    runtime.expandedBounds = expandedBounds
    runtime.collapsedEdge = edge
    runtime.hidden = true
    window.setResizable(false)
    window.setMovable(false)
    this.setOverlayBounds(key, getCollapsedBounds(expandedBounds, display, edge), false)
  }

  private destroyOverlayWindow(key: WidgetKey): void {
    const window = this.overlayWindows.get(key)
    if (!window) {
      return
    }

    const runtime = this.overlayState.get(key)
    clearTimeout(runtime?.hideTimer)
    clearTimeout(runtime?.syncTimer)
    clearTimeout(runtime?.suppressTimer)
    this.overlayWindows.delete(key)
    this.overlayState.delete(key)
    window.destroy()
  }

  private shouldAutoHide(key: WidgetKey, data: AppData): boolean {
    const config = data.desktopSettings.widgets[key]
    return config.autoHide || data.desktopSettings.autoHide
  }

  private isOverlayDragLocked(key: WidgetKey, data: AppData): boolean {
    const config = data.desktopSettings.widgets[key]
    return data.desktopSettings.dragLocked || Boolean(config.dragLocked)
  }

  private constrainToMatchingDisplay(bounds: WindowBounds): Rectangle {
    return constrainBoundsToDisplay(bounds, screen.getDisplayMatching(bounds).workArea)
  }
}

function isOverlayUserAdjustable(key: WidgetKey): boolean {
  return key !== 'countdown'
}

function getOverlayMinWidth(key: WidgetKey): number {
  return key === 'countdown' ? 300 : 240
}

function getOverlayMinHeight(key: WidgetKey): number {
  return key === 'countdown' ? 46 : 160
}
