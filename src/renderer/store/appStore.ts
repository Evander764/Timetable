import { create } from 'zustand'
import type { AppData } from '@shared/types/app'
import type {
  BackupInfo,
  DataAction,
  GithubUpdateInfo,
  OverlaySnapPositionPayload,
  OverlayWidgetUpdatePayload,
  SettingsUpdatePayload,
  WindowStatePayload,
} from '@shared/ipc'
import { createId } from '@shared/utils/id'

export type Toast = {
  id: string
  tone: 'success' | 'info' | 'error'
  message: string
}

type AppStore = {
  data: AppData | null
  loaded: boolean
  isMaximized: boolean
  toasts: Toast[]
  backups: BackupInfo[]
  updateInfo: GithubUpdateInfo | null
  setData: (data: AppData) => void
  setLoaded: (loaded: boolean) => void
  setWindowState: (payload: WindowStatePayload) => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  load: () => Promise<void>
  updateData: (action: DataAction, successMessage?: string) => Promise<void>
  updateSettings: (payload: SettingsUpdatePayload, successMessage?: string) => Promise<void>
  updateWidget: (payload: OverlayWidgetUpdatePayload, successMessage?: string) => Promise<void>
  snapWidgetPosition: (payload: OverlaySnapPositionPayload, successMessage?: string) => Promise<void>
  setStartup: (enabled: boolean) => Promise<void>
  selectBackground: () => Promise<void>
  exportData: () => Promise<void>
  createBackup: () => Promise<void>
  loadBackups: () => Promise<void>
  restoreBackup: (filePath?: string) => Promise<void>
  openBackupDir: () => Promise<void>
  checkForUpdate: (silent?: boolean) => Promise<void>
  installUpdate: () => Promise<void>
  saveBrowserUsageDay: (date: string) => Promise<void>
}

function scheduleToastRemoval(id: string, dismissToast: (toastId: string) => void): void {
  setTimeout(() => dismissToast(id), 3600)
}

export const useAppStore = create<AppStore>((set, get) => ({
  data: null,
  loaded: false,
  isMaximized: false,
  toasts: [],
  backups: [],
  updateInfo: null,
  setData: (data) => set({ data }),
  setLoaded: (loaded) => set({ loaded }),
  setWindowState: (payload) => set({ isMaximized: payload.isMaximized }),
  pushToast: (message, tone = 'success') => {
    const id = createId('toast')
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    scheduleToastRemoval(id, get().dismissToast)
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
  load: async () => {
    try {
      const data = await window.timeable.loadData()
      set({ data, loaded: true })
    } catch (error) {
      console.error(error)
      get().pushToast('读取本地数据失败。', 'error')
    }
  },
  updateData: async (action, successMessage) => {
    try {
      const data = await window.timeable.updateData(action)
      set({ data })
      if (successMessage) {
        get().pushToast(successMessage)
      }
    } catch (error) {
      console.error(error)
      get().pushToast('保存数据失败。', 'error')
    }
  },
  updateSettings: async (payload, successMessage) => {
    try {
      const data = await window.timeable.updateSettings(payload)
      set({ data })
      if (successMessage) {
        get().pushToast(successMessage)
      }
    } catch (error) {
      console.error(error)
      get().pushToast('更新设置失败。', 'error')
    }
  },
  updateWidget: async (payload, successMessage) => {
    try {
      const data = await window.timeable.updateOverlayWidget(payload)
      set({ data })
      if (successMessage) {
        get().pushToast(successMessage)
      }
    } catch (error) {
      console.error(error)
      get().pushToast('同步桌面卡片失败。', 'error')
    }
  },
  snapWidgetPosition: async (payload, successMessage) => {
    try {
      const data = await window.timeable.snapOverlayPosition(payload)
      set({ data })
      if (successMessage) {
        get().pushToast(successMessage)
      }
    } catch (error) {
      console.error(error)
      get().pushToast('调整卡片位置失败。', 'error')
    }
  },
  setStartup: async (enabled) => {
    try {
      const data = await window.timeable.setStartup(enabled)
      set({ data })
      get().pushToast(enabled ? '已开启开机启动。' : '已关闭开机启动。')
    } catch (error) {
      console.error(error)
      get().pushToast('开机启动设置失败。', 'error')
    }
  },
  selectBackground: async () => {
    try {
      const selected = await window.timeable.selectBackground()
      if (!selected?.path) {
        return
      }

      const data = await window.timeable.updateSettings({
        desktopSettings: {
          backgroundImage: selected.path,
          backgroundMeta: {
            path: selected.path,
            name: selected.name ?? selected.path,
            size: selected.size,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      set({ data })
      get().pushToast('背景图片已更新。')
    } catch (error) {
      console.error(error)
      get().pushToast('选择背景图片失败。', 'error')
    }
  },
  exportData: async () => {
    try {
      const result = await window.timeable.exportData()
      if (result.canceled) {
        return
      }
      get().pushToast(`数据已导出到 ${result.filePath ?? '目标路径'}。`)
    } catch (error) {
      console.error(error)
      get().pushToast('导出数据失败。', 'error')
    }
  },
  createBackup: async () => {
    try {
      const backup = await window.timeable.createBackup()
      const data = await window.timeable.loadData()
      set((state) => ({
        data,
        backups: [backup, ...state.backups.filter((item) => item.filePath !== backup.filePath)],
      }))
      get().pushToast(`备份已创建：${backup.name}`)
    } catch (error) {
      console.error(error)
      get().pushToast('创建备份失败。', 'error')
    }
  },
  loadBackups: async () => {
    try {
      const backups = await window.timeable.listBackups()
      set({ backups })
    } catch (error) {
      console.error(error)
      get().pushToast('读取备份列表失败。', 'error')
    }
  },
  restoreBackup: async (filePath) => {
    try {
      const result = await window.timeable.restoreBackup(filePath)
      if (result.canceled) {
        return
      }
      if (result.data) {
        set({ data: result.data })
      }
      await get().loadBackups()
      get().pushToast('数据已从备份恢复。')
    } catch (error) {
      console.error(error)
      get().pushToast('恢复备份失败。', 'error')
    }
  },
  openBackupDir: async () => {
    try {
      await window.timeable.openBackupDir()
    } catch (error) {
      console.error(error)
      get().pushToast('打开备份目录失败。', 'error')
    }
  },
  checkForUpdate: async (silent = false) => {
    try {
      const updateInfo = await window.timeable.checkForUpdate()
      set({ updateInfo })
      if (updateInfo.available && !updateInfo.error) {
        get().pushToast(`发现新版本 v${updateInfo.latestVersion}。`, 'info')
      } else if (!silent) {
        get().pushToast(updateInfo.error ? `检查更新失败：${updateInfo.error}` : '当前已经是最新版本。', updateInfo.error ? 'error' : 'success')
      }
    } catch (error) {
      console.error(error)
      if (!silent) {
        get().pushToast('检查更新失败。', 'error')
      }
    }
  },
  installUpdate: async () => {
    try {
      const result = await window.timeable.installUpdate()
      if (!result.started) {
        get().pushToast(result.error ?? '没有可安装的新版本。', 'error')
      }
    } catch (error) {
      console.error(error)
      get().pushToast('安装更新失败。', 'error')
    }
  },
  saveBrowserUsageDay: async (date) => {
    try {
      const result = await window.timeable.saveBrowserUsageDay(date)
      if (result.canceled) {
        return
      }
      get().pushToast(`时间统计已保存到 ${result.filePath ?? '目标路径'}。`)
    } catch (error) {
      console.error(error)
      get().pushToast('保存时间统计失败。', 'error')
    }
  },
}))
