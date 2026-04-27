import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import type { AppData, BrowserPageSample } from '@shared/types/app'
import type { BackupInfo, DataAction, ExportDataResult, OverlayWidgetUpdatePayload, SettingsUpdatePayload } from '@shared/ipc'
import { createDefaultAppData } from '@shared/data/defaults'
import { applyDataAction, applyOverlayWidgetUpdate, applySettingsUpdate } from '@shared/data/reducer'
import { formatDateKey } from '@shared/utils/date'
import { createBrowserUsageDaySnapshot, normalizeBrowserPageSample, recordBrowserUsageSample } from '@shared/utils/browserUsage'
import { normalizeCourseTimeSlots, normalizeTermWeekCount } from '@shared/utils/course'
import { normalizePrincipleCard } from '@shared/utils/principle'
import { migrateDesktopThreePieceLayout, migrateLegacyDesktopScale, migrateOverlayOpacity, normalizeCountdownStripWidget } from '@shared/utils/widgets'

const AUTO_BACKUP_LIMIT = 30

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
    let loadedExistingData = false

    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppData>
      this.data = this.normalizeData(parsed)
      loadedExistingData = true
    } catch {
      this.data = createDefaultAppData(this.filePath)
      await this.saveNow()
    }

    this.data.appSettings.dataPath = this.filePath
    await this.autoSaveKnownBrowserUsageDays()
    if (loadedExistingData && this.data.appSettings.autoBackupEnabled) {
      await this.createBackup('startup', true)
    }
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

  async recordBrowserUsage(sample: BrowserPageSample, durationSeconds: number): Promise<AppData> {
    const normalizedSample = normalizeBrowserPageSample(sample)
    if (!normalizedSample) {
      return this.getData()
    }

    this.data = recordBrowserUsageSample(this.data, normalizedSample, durationSeconds)
    this.markDirty()
    await this.autoSaveBrowserUsageDay(getSampleDateKey(sample.observedAt))
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
    await this.ensureDailyBackup()
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

  async createBackup(reason: 'startup' | 'daily' | 'manual' | 'pre-update' | 'before-restore' = 'manual', automatic = false): Promise<BackupInfo> {
    await mkdir(this.getBackupDir(), { recursive: true })
    const timestamp = formatBackupTimestamp(new Date())
    const prefix = automatic || reason === 'startup' || reason === 'daily' || reason === 'pre-update' ? 'timetable-backup' : `timetable-${reason}`
    const filePath = join(this.getBackupDir(), `${prefix}-${timestamp}.json`)
    await writeFile(filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8')

    const createdAt = new Date().toISOString()
    this.data = {
      ...this.data,
      appSettings: {
        ...this.data.appSettings,
        lastBackupAt: createdAt,
        lastBackupPath: filePath,
        lastAutoBackupDate: automatic || reason === 'startup' || reason === 'daily' ? formatDateKey(new Date()) : this.data.appSettings.lastAutoBackupDate,
      },
    }

    if (automatic || reason === 'startup' || reason === 'daily' || reason === 'pre-update') {
      await this.cleanupAutomaticBackups()
    }

    this.markDirty()
    return {
      name: basename(filePath),
      filePath,
      createdAt,
      reason,
      size: (await stat(filePath)).size,
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    await mkdir(this.getBackupDir(), { recursive: true })
    const entries = await readdir(this.getBackupDir(), { withFileTypes: true })
    const backups = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map(async (entry) => {
        const filePath = join(this.getBackupDir(), entry.name)
        const fileStat = await stat(filePath)
        return {
          name: entry.name,
          filePath,
          createdAt: fileStat.birthtime.toISOString(),
          reason: inferBackupReason(entry.name),
          size: fileStat.size,
        } satisfies BackupInfo
      }))

    return backups.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  async restoreBackup(filePath: string): Promise<AppData> {
    await this.createBackup('before-restore')
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppData>
    this.data = this.normalizeData(parsed)
    this.data.appSettings.dataPath = this.filePath
    await this.saveNow()
    return this.getData()
  }

  async restoreBackupFromDialog(window?: BrowserWindow): Promise<{ canceled: boolean; data?: AppData; filePath?: string }> {
    const result = window
      ? await dialog.showOpenDialog(window, {
          title: '从备份恢复 Timetable 数据',
          properties: ['openFile'],
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
          defaultPath: this.getBackupDir(),
        })
      : await dialog.showOpenDialog({
          title: '从备份恢复 Timetable 数据',
          properties: ['openFile'],
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
          defaultPath: this.getBackupDir(),
        })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    return {
      canceled: false,
      filePath: result.filePaths[0],
      data: await this.restoreBackup(result.filePaths[0]),
    }
  }

  getBackupDir(): string {
    return join(dirname(this.filePath), 'backups')
  }

  async saveBrowserUsageDay(date: string, window?: BrowserWindow): Promise<ExportDataResult> {
    const options = {
      title: '保存每日时间统计',
      defaultPath: `timetable-usage-${date}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    }
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    await this.writeBrowserUsageDaySnapshot(date, result.filePath)
    return {
      canceled: false,
      filePath: result.filePath,
    }
  }

  async autoSaveBrowserUsageDay(date: string): Promise<void> {
    try {
      await this.writeBrowserUsageDaySnapshot(date, this.getBrowserUsageAutoSavePath(date))
    } catch (error) {
      console.error('Failed to auto-save browser usage day.', error)
    }
  }

  async autoSaveKnownBrowserUsageDays(): Promise<void> {
    await Promise.all(Object.keys(this.data.browserUsage).map((date) => this.autoSaveBrowserUsageDay(date)))
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
    const previousLayoutVersion = raw.appSettings?.desktopLayoutVersion
    const previousOpacityVersion = raw.appSettings?.opacityVersion
    const normalized = normalizeCountdownStripWidget(migrateLegacyDesktopScale({
      ...defaults,
      ...raw,
      courses: raw.courses ?? defaults.courses,
      dailyTasks: raw.dailyTasks ?? defaults.dailyTasks,
      longTermGoals: raw.longTermGoals ?? defaults.longTermGoals,
      memos: raw.memos ?? defaults.memos,
      principleCard: normalizePrincipleCard({
        ...defaults.principleCard,
        ...raw.principleCard,
      }),
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
        termWeekCount: normalizeTermWeekCount(raw.appSettings?.termWeekCount ?? defaults.appSettings.termWeekCount),
        timetableSlots: normalizeCourseTimeSlots(raw.appSettings?.timetableSlots ?? defaults.appSettings.timetableSlots),
      },
      browserUsage: raw.browserUsage ?? defaults.browserUsage,
    }))
    return migrateOverlayOpacity(migrateDesktopThreePieceLayout(normalized, previousLayoutVersion), previousOpacityVersion)
  }

  private async ensureDailyBackup(): Promise<void> {
    if (!this.data.appSettings.autoBackupEnabled) {
      return
    }

    const todayKey = formatDateKey(new Date())
    if (this.data.appSettings.lastAutoBackupDate === todayKey) {
      return
    }

    await this.createBackup('daily', true)
  }

  private async cleanupAutomaticBackups(): Promise<void> {
    const backups = (await this.listBackups())
      .filter((backup) => backup.name.startsWith('timetable-backup-'))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    const extra = backups.slice(AUTO_BACKUP_LIMIT)
    await Promise.all(extra.map((backup) => unlink(backup.filePath).catch(() => undefined)))
  }

  private async writeBrowserUsageDaySnapshot(date: string, filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true })
    const snapshot = createBrowserUsageDaySnapshot(this.data, date)
    await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8')
  }

  private getBrowserUsageAutoSavePath(date: string): string {
    return join(dirname(this.filePath), 'daily-usage', `timetable-usage-${date}.json`)
  }
}

function formatBackupTimestamp(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function inferBackupReason(name: string): BackupInfo['reason'] {
  if (name.includes('before-restore')) {
    return 'before-restore'
  }
  if (name.includes('pre-update')) {
    return 'pre-update'
  }
  if (name.includes('manual')) {
    return 'manual'
  }
  return 'daily'
}

function getSampleDateKey(observedAt: string): string {
  const observedDate = new Date(observedAt)
  return formatDateKey(Number.isNaN(observedDate.getTime()) ? new Date() : observedDate)
}
