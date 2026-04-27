import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import type { AppData } from '@shared/types/app'
import type { DataAction, ExportDataResult, OverlayWidgetUpdatePayload, SettingsUpdatePayload } from '@shared/ipc'
import { createDefaultAppData } from '@shared/data/defaults'
import { applyDataAction, applyOverlayWidgetUpdate, applySettingsUpdate } from '@shared/data/reducer'
import { migrateLegacyDesktopScale } from '@shared/utils/widgets'

export class AppStorage {
  private readonly filePath: string
  private data!: AppData
  private saveTimer?: NodeJS.Timeout
  private dirty = false

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async initialize(): Promise<AppData> {
    await mkdir(dirname(this.filePath), { recursive: true })

    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppData>
      this.data = this.normalizeData(parsed)
    } catch {
      this.data = createDefaultAppData(this.filePath)
      await this.saveNow()
    }

    this.data.appSettings.dataPath = this.filePath
    return this.getData()
  }

  getData(): AppData {
    return structuredClone(this.data)
  }

  async updateWithAction(action: DataAction): Promise<AppData> {
    this.data = applyDataAction(this.data, action)
    this.markDirty()
    return this.getData()
  }

  async updateSettings(payload: SettingsUpdatePayload): Promise<AppData> {
    this.data = applySettingsUpdate(this.data, payload)
    this.data.appSettings.dataPath = this.filePath
    this.markDirty()
    return this.getData()
  }

  async updateWidget(payload: OverlayWidgetUpdatePayload): Promise<AppData> {
    this.data = applyOverlayWidgetUpdate(this.data, payload)
    this.markDirty()
    return this.getData()
  }

  async setLaunchAtStartup(enabled: boolean): Promise<AppData> {
    this.data = {
      ...this.data,
      appSettings: {
        ...this.data.appSettings,
        launchAtStartup: enabled,
      },
    }
    this.markDirty()
    return this.getData()
  }

  async saveNow(): Promise<void> {
    if (!this.data) {
      return
    }

    clearTimeout(this.saveTimer)
    this.data = {
      ...this.data,
      appSettings: {
        ...this.data.appSettings,
        dataPath: this.filePath,
        lastSavedAt: new Date().toISOString(),
      },
    }

    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8')
    this.dirty = false
  }

  async flush(): Promise<void> {
    if (this.dirty) {
      await this.saveNow()
    }
  }

  async exportData(window?: BrowserWindow): Promise<ExportDataResult> {
    const options = {
      title: '导出 Timeable 数据',
      defaultPath: 'timeable-backup.json',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    }
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    await writeFile(result.filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8')
    this.data = {
      ...this.data,
      appSettings: {
        ...this.data.appSettings,
        lastExportedAt: new Date().toISOString(),
      },
    }
    this.markDirty()

    return {
      canceled: false,
      filePath: result.filePath,
    }
  }

  private markDirty(): void {
    this.dirty = true
    clearTimeout(this.saveTimer)

    if (!this.data.appSettings.autoSave) {
      return
    }

    this.saveTimer = setTimeout(() => {
      void this.saveNow()
    }, 500)
  }

  private normalizeData(raw: Partial<AppData>): AppData {
    const defaults = createDefaultAppData(this.filePath)
    return migrateLegacyDesktopScale({
      ...defaults,
      ...raw,
      courses: raw.courses ?? defaults.courses,
      dailyTasks: raw.dailyTasks ?? defaults.dailyTasks,
      longTermGoals: raw.longTermGoals ?? defaults.longTermGoals,
      memos: raw.memos ?? defaults.memos,
      principleCard: {
        ...defaults.principleCard,
        ...raw.principleCard,
      },
      countdownCard: {
        ...defaults.countdownCard,
        ...raw.countdownCard,
      },
      desktopSettings: {
        ...defaults.desktopSettings,
        ...raw.desktopSettings,
        widgets: {
          ...defaults.desktopSettings.widgets,
          ...raw.desktopSettings?.widgets,
        },
      },
      appSettings: {
        ...defaults.appSettings,
        ...raw.appSettings,
        dataPath: this.filePath,
      },
    })
  }
}
