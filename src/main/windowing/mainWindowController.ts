import { BrowserWindow, screen, shell } from 'electron'
import type { AppData } from '@shared/types/app'
import type { AppDataPatch, WindowControlAction, WindowStatePayload } from '@shared/ipc'
import { getDefaultMainWindowSize } from './geometry'

type RouteLoader = (window: BrowserWindow, hash: string) => Promise<void>

type MainWindowControllerOptions = {
  preloadPath: string
  loadRoute: RouteLoader
  isQuitting: () => boolean
  shouldCloseToTray: () => boolean
  quitApplication: () => void
}

export class MainWindowController {
  private mainWindow: BrowserWindow | null = null

  constructor(private readonly options: MainWindowControllerOptions) {}

  async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    const window = new BrowserWindow({
      ...getDefaultMainWindowSize(screen.getPrimaryDisplay().workArea),
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#EDF4FF',
      show: false,
      webPreferences: {
        preload: this.options.preloadPath,
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
    window.on('close', (event) => {
      if (!this.options.isQuitting() && this.options.shouldCloseToTray()) {
        event.preventDefault()
        window.hide()
      }
    })
    window.on('maximize', () => this.sendWindowState(window, { isMaximized: true }))
    window.on('unmaximize', () => this.sendWindowState(window, { isMaximized: false }))
    window.once('ready-to-show', () => window.show())

    await this.options.loadRoute(window, 'overview')
    this.mainWindow = window
    return window
  }

  broadcastData(data: AppData): void {
    this.mainWindow?.webContents.send('data:changed', data)
  }

  broadcastPatch(patch: AppDataPatch): void {
    this.mainWindow?.webContents.send('data:patched', patch)
  }

  async showMainWindow(): Promise<void> {
    const window = await this.createMainWindow()
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
    window.focus()
  }

  hideMainWindow(): void {
    this.mainWindow?.hide()
  }

  controlCurrentWindow(window: BrowserWindow, action: WindowControlAction): void {
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

    if (this.options.shouldCloseToTray()) {
      window.hide()
      return
    }

    this.options.quitApplication()
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  private sendWindowState(window: BrowserWindow, payload: WindowStatePayload): void {
    window.webContents.send('window:state', payload)
  }
}
