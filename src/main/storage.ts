import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import { createDefaultAppData } from '@shared/data/defaults'
import { migrateAppData, type MigratableAppData } from '@shared/data/migrations'
import { applyDataAction, applyOverlayWidgetUpdate, applySettingsUpdate } from '@shared/data/reducer'
import { APP_DATA_SCHEMA_VERSION, type AppData } from '@shared/types/app'
import type {
  AppDataPatch,
  DataAction,
  DataBackupReason,
  DataBackupSummary,
  ExportDataResult,
  OverlayWidgetUpdatePayload,
  SettingsUpdatePayload,
} from '@shared/ipc'
import { createBrowserUsageDaySnapshot, recordBrowserUsageSample, type NormalizedBrowserPageSample } from '@shared/utils/browserUsage'
import { formatDateKey } from '@shared/utils/date'
import { migrateDesktopThreePieceLayout, migrateLegacyDesktopScale, normalizeCountdownStripWidget, raiseOverlayOpacity } from '@shared/utils/widgets'

const BACKUP_LIMIT = 14
const BACKUP_FILE_PATTERN = /^app-data\.(daily|migration|manual)\.(.+)\.json$/

type SaveOptions = {
  skipDailyBackup?: boolean
}

export class AppStorage {
  private readonly filePath: string
  private data!: AppData
  private saveTimer?: NodeJS.Timeout
  private dirty = false

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async initialize(): Promise<AppData> {
    await fs.mkdir(dirname(this.filePath), { recursive: true })
    await this.cleanupStaleTempFiles()

    try {
      const raw = await fs.readFile(this.filePath, 'utf-8')
      const parsed = parseAppDataJson(raw)
      assertMinimumAppDataShape(parsed)

      const migrated = migrateAppData(parsed, this.filePath)
      if (migrated.migrated) {
        await this.createBackup('migration')
      }

      this.data = this.normalizeData(migrated.data)
      this.data.appSettings.dataPath = this.filePath

      if (migrated.migrated) {
        await this.saveNow({ skipDailyBackup: true })
      } else if (shouldPersistNormalizedData(parsed, this.data)) {
        this.dirty = true
      }
    } catch (error) {
      if (isNodeError(error, 'ENOENT')) {
        this.data = createDefaultAppData(this.filePath)
        await this.saveNow({ skipDailyBackup: true })
      } else if (isUnsupportedSchemaError(error)) {
        throw error
      } else {
        await this.preserveCorruptData()
        this.data = createDefaultAppData(this.filePath)
        await this.saveNow({ skipDailyBackup: true })
      }
    }

    await this.autoSaveKnownBrowserUsageDays()
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
    await this.updateWidgetPatch(payload)
    return this.getData()
  }

  async updateWidgetPatch(payload: OverlayWidgetUpdatePayload): Promise<AppDataPatch> {
    this.data = applyOverlayWidgetUpdate(this.data, payload)
    this.markDirty()
    return {
      type: 'widget/replace',
      payload: {
        key: payload.key,
        widget: { ...this.data.desktopSettings.widgets[payload.key] },
      },
    }
  }

  async recordBrowserUsage(sample: NormalizedBrowserPageSample, durationSeconds: number): Promise<AppData> {
    await this.recordBrowserUsagePatch(sample, durationSeconds)
    return this.getData()
  }

  async recordBrowserUsagePatch(sample: NormalizedBrowserPageSample, durationSeconds: number): Promise<AppDataPatch> {
    const date = getSampleDateKey(sample.observedAt)
    this.data = recordBrowserUsageSample(this.data, sample, durationSeconds)
    this.markDirty()
    await this.autoSaveBrowserUsageDay(date)
    const day = this.data.browserUsage[date]
    if (!day) {
      throw new Error(`Browser usage day was not recorded: ${date}`)
    }

    return {
      type: 'browserUsage/dayReplace',
      payload: {
        date,
        day: structuredClone(day),
      },
    }
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

  async saveNow(options: SaveOptions = {}): Promise<void> {
    if (!this.data) {
      return
    }

    clearTimeout(this.saveTimer)
    if (!options.skipDailyBackup) {
      await this.ensureDailyBackupBeforeSave()
    }

    this.data = {
      ...this.data,
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      appSettings: {
        ...this.data.appSettings,
        dataPath: this.filePath,
        lastSavedAt: new Date().toISOString(),
      },
    }

    await this.writeJsonFileAtomic(this.filePath, this.data)
    await this.cleanupStaleTempFiles()
    this.dirty = false
  }

  async flush(): Promise<void> {
    if (this.dirty) {
      await this.saveNow()
    }
  }

  async exportData(window?: BrowserWindow): Promise<ExportDataResult> {
    const options = {
      title: 'Export Timetable data',
      defaultPath: 'timetable-backup.json',
      filters: [{ name: 'JSON file', extensions: ['json'] }],
    }
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    await this.writeJsonFileAtomic(result.filePath, this.data)
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

  async listDataBackups(): Promise<DataBackupSummary[]> {
    await fs.mkdir(this.getBackupDir(), { recursive: true })
    const entries = await fs.readdir(this.getBackupDir(), { withFileTypes: true })
    const backups = await Promise.all(entries
      .filter((entry) => entry.isFile())
      .map((entry) => this.getBackupSummary(entry.name)))

    return backups
      .filter((backup): backup is DataBackupSummary => backup !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async restoreDataBackup(id: string): Promise<AppData> {
    const backup = await this.findBackupById(id)
    if (!backup) {
      throw new Error(`Backup not found: ${id}`)
    }

    const raw = await fs.readFile(backup.filePath, 'utf-8')
    const parsed = parseAppDataJson(raw)
    assertMinimumAppDataShape(parsed)

    await this.createBackup('manual')
    const migrated = migrateAppData(parsed, this.filePath)
    this.data = this.normalizeData(migrated.data)
    this.data.appSettings.dataPath = this.filePath
    await this.saveNow({ skipDailyBackup: true })
    return this.getData()
  }

  async saveBrowserUsageDay(date: string, window?: BrowserWindow): Promise<ExportDataResult> {
    const options = {
      title: 'Save daily usage statistics',
      defaultPath: `timetable-usage-${date}.json`,
      filters: [{ name: 'JSON file', extensions: ['json'] }],
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

  private async autoSaveBrowserUsageDay(date: string): Promise<void> {
    try {
      await this.writeBrowserUsageDaySnapshot(date, this.getBrowserUsageAutoSavePath(date))
    } catch (error) {
      console.error('Failed to auto-save browser usage day.', error)
    }
  }

  private async autoSaveKnownBrowserUsageDays(): Promise<void> {
    await Promise.all(Object.keys(this.data.browserUsage).map((date) => this.autoSaveBrowserUsageDay(date)))
  }

  private async writeBrowserUsageDaySnapshot(date: string, filePath: string): Promise<void> {
    await fs.mkdir(dirname(filePath), { recursive: true })
    const snapshot = createBrowserUsageDaySnapshot(this.data, date)
    await this.writeJsonFileAtomic(filePath, snapshot)
  }

  private getBrowserUsageAutoSavePath(date: string): string {
    return join(dirname(this.filePath), 'daily-usage', `timetable-usage-${date}.json`)
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

  private normalizeData(raw: MigratableAppData): AppData {
    const defaults = createDefaultAppData(this.filePath)
    const previousLayoutVersion = raw.appSettings?.desktopLayoutVersion
    const normalized = normalizeCountdownStripWidget(migrateLegacyDesktopScale({
      ...defaults,
      ...raw,
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      courses: raw.courses ?? defaults.courses,
      dailyTasks: raw.dailyTasks ?? defaults.dailyTasks,
      longTermGoals: raw.longTermGoals ?? defaults.longTermGoals,
      memos: raw.memos ?? defaults.memos,
      countdownItems: raw.countdownItems ?? defaults.countdownItems,
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
      browserUsage: raw.browserUsage ?? defaults.browserUsage,
    }))
    const migratedLayout = migrateDesktopThreePieceLayout(normalized, previousLayoutVersion)
    if (previousLayoutVersion && previousLayoutVersion >= 3) {
      return migratedLayout
    }

    const raisedOpacity = raiseOverlayOpacity(migratedLayout)
    return {
      ...raisedOpacity,
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      appSettings: {
        ...raisedOpacity.appSettings,
        desktopLayoutVersion: 3,
      },
    }
  }

  private async preserveCorruptData(): Promise<void> {
    if (!(await fileExists(this.filePath))) {
      return
    }

    const corruptPath = join(dirname(this.filePath), `app-data.corrupt-${createFileTimestamp()}.json`)
    await fs.copyFile(this.filePath, corruptPath)
  }

  private async ensureDailyBackupBeforeSave(): Promise<void> {
    if (!(await fileExists(this.filePath))) {
      return
    }

    try {
      const today = new Date().toISOString().slice(0, 10)
      const backups = await this.listDataBackups()
      const alreadyBackedUpToday = backups.some((backup) => backup.reason === 'daily' && backup.id.includes(today))
      if (!alreadyBackedUpToday) {
        await this.createBackup('daily')
      }
    } catch (error) {
      console.error('Failed to create daily app data backup.', error)
    }
  }

  private async createBackup(reason: DataBackupReason): Promise<DataBackupSummary | null> {
    if (!(await fileExists(this.filePath))) {
      return null
    }

    await fs.mkdir(this.getBackupDir(), { recursive: true })
    const fileName = `app-data.${reason}.${createFileTimestamp()}.json`
    const filePath = join(this.getBackupDir(), fileName)
    await fs.copyFile(this.filePath, filePath)
    await this.pruneBackups()
    return this.getBackupSummary(fileName)
  }

  private async pruneBackups(): Promise<void> {
    const backups = await this.listDataBackups()
    const staleBackups = backups.slice(BACKUP_LIMIT)
    await Promise.all(staleBackups.map((backup) => fs.rm(backup.filePath, { force: true })))
  }

  private async findBackupById(id: string): Promise<DataBackupSummary | null> {
    const backups = await this.listDataBackups()
    return backups.find((backup) => backup.id === id) ?? null
  }

  private async getBackupSummary(fileName: string): Promise<DataBackupSummary | null> {
    const match = fileName.match(BACKUP_FILE_PATTERN)
    if (!match) {
      return null
    }

    const filePath = join(this.getBackupDir(), fileName)
    const stats = await fs.stat(filePath)
    return {
      id: fileName.replace(/\.json$/, ''),
      createdAt: stats.mtime.toISOString(),
      reason: match[1] as DataBackupReason,
      filePath,
      size: stats.size,
    }
  }

  private getBackupDir(): string {
    return join(dirname(this.filePath), 'backups')
  }

  private async writeJsonFileAtomic(filePath: string, value: unknown): Promise<void> {
    await fs.mkdir(dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`

    try {
      await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
      try {
        await fs.rename(tempPath, filePath)
      } catch (error) {
        if (!isRetryableReplaceError(error) || !(await fileExists(filePath))) {
          throw error
        }

        await this.replaceExistingFileWithBackup(tempPath, filePath)
      }
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined)
      throw error
    }
  }

  private async replaceExistingFileWithBackup(tempPath: string, filePath: string): Promise<void> {
    const backupPath = `${filePath}.replace-${process.pid}-${Date.now()}-${randomUUID()}`
    let oldFileMoved = false

    try {
      await fs.rename(filePath, backupPath)
      oldFileMoved = true
      await fs.rename(tempPath, filePath)
      await fs.rm(backupPath, { force: true })
    } catch (error) {
      if (oldFileMoved && (await fileExists(backupPath)) && !(await fileExists(filePath))) {
        await fs.rename(backupPath, filePath).catch(() => undefined)
      }
      throw error
    }
  }

  private async cleanupStaleTempFiles(): Promise<void> {
    const directory = dirname(this.filePath)
    const filePrefix = `${basename(this.filePath)}.tmp-`
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => [])
    await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(filePrefix))
      .map((entry) => fs.rm(join(directory, entry.name), { force: true })))
  }
}

function parseAppDataJson(raw: string): MigratableAppData {
  const parsed = JSON.parse(raw) as unknown
  assertRecord(parsed, 'app data root')
  return parsed as MigratableAppData
}

function assertMinimumAppDataShape(value: MigratableAppData): void {
  assertOptionalArray(value, 'courses')
  assertOptionalArray(value, 'dailyTasks')
  assertOptionalArray(value, 'longTermGoals')
  assertOptionalArray(value, 'memos')
  assertOptionalArray(value, 'countdownItems')
  assertOptionalRecord(value, 'principleCard')
  assertOptionalRecord(value, 'countdownCard')
  assertOptionalRecord(value, 'desktopSettings')
  assertOptionalRecord(value, 'appSettings')
  assertOptionalRecord(value, 'browserUsage')
  if (value.schemaVersion !== undefined && typeof value.schemaVersion !== 'number') {
    throw new Error('Invalid schemaVersion')
  }
}

function assertOptionalArray(value: Record<string, unknown>, key: string): void {
  if (value[key] !== undefined && !Array.isArray(value[key])) {
    throw new Error(`Invalid ${key}`)
  }
}

function assertOptionalRecord(value: Record<string, unknown>, key: string): void {
  if (value[key] !== undefined) {
    assertRecord(value[key], key)
  }
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`)
  }
}

function shouldPersistNormalizedData(raw: MigratableAppData, normalized: AppData): boolean {
  return raw.schemaVersion !== normalized.schemaVersion
    || !Array.isArray(raw.countdownItems)
    || raw.appSettings?.dataPath !== normalized.appSettings.dataPath
    || raw.appSettings?.desktopLayoutVersion !== normalized.appSettings.desktopLayoutVersion
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath)
    return true
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return false
    }
    throw error
  }
}

function isNodeError(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === code
}

function isUnsupportedSchemaError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Unsupported app data schema version:')
}

function isRetryableReplaceError(error: unknown): boolean {
  return isNodeError(error, 'EPERM') || isNodeError(error, 'EBUSY') || isNodeError(error, 'EACCES')
}

function createFileTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function getSampleDateKey(observedAt: string): string {
  const observedDate = new Date(observedAt)
  return formatDateKey(Number.isNaN(observedDate.getTime()) ? new Date() : observedDate)
}
