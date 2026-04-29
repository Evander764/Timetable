import * as fs from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
  },
}))

describe('AppStorage', () => {
  let tempDir: string

  beforeEach(async () => {
    vi.resetModules()
    tempDir = await fs.mkdtemp(join(tmpdir(), 'timeable-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T08:00:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.doUnmock('node:fs/promises')
    vi.restoreAllMocks()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('creates default data with a schema version and auto-saves debounced updates', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)

    const initial = await storage.initialize()
    expect(initial.schemaVersion).toBe(2)
    expect(initial.countdownItems).toEqual([])
    expect(initial.appSettings.dataPath).toBe(filePath)

    await storage.updateWithAction({
      type: 'memo/end',
      payload: {
        id: initial.memos[0].id,
        endedAt: '2026-04-24T01:00:00.000Z',
      },
    })

    await vi.advanceTimersByTimeAsync(600)
    await storage.flush()
    const saved = JSON.parse(await fs.readFile(filePath, 'utf-8')) as typeof initial
    expect(saved.schemaVersion).toBe(2)
    expect(saved.memos[0].status).toBe('ended')
    expect(saved.appSettings.lastSavedAt).toBeTruthy()

    const backups = await storage.listDataBackups()
    expect(backups).toHaveLength(1)
    expect(backups[0].reason).toBe('daily')
  })

  it('keeps the original file when an atomic rename fails', async () => {
    const actualFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    let failNextRename = false
    const renameMock = vi.fn<typeof actualFs.rename>(async (oldPath, newPath) => {
      if (failNextRename) {
        failNextRename = false
        throw new Error('simulated rename failure')
      }
      return actualFs.rename(oldPath, newPath)
    })
    vi.doMock('node:fs/promises', () => ({
      ...actualFs,
      rename: renameMock,
    }))
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const original = createDefaultAppData(filePath)
    await actualFs.writeFile(filePath, `${JSON.stringify(original, null, 2)}\n`, 'utf-8')
    const storage = new AppStorage(filePath)
    await storage.initialize()

    failNextRename = true
    await storage.updateWithAction({
      type: 'memo/end',
      payload: {
        id: original.memos[0].id,
        endedAt: '2026-04-29T08:01:00.000Z',
      },
    })

    await expect(storage.flush()).rejects.toThrow('simulated rename failure')
    const saved = JSON.parse(await actualFs.readFile(filePath, 'utf-8')) as typeof original
    expect(saved.memos[0].status).toBe('active')
    expect(renameMock).toHaveBeenCalled()
    vi.doUnmock('node:fs/promises')
  })

  it('returns a widget patch and still persists widget changes through debounce', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)

    await storage.initialize()
    const patch = await storage.updateWidgetPatch({
      key: 'memo',
      changes: {
        x: 640,
        y: 360,
        width: 420,
      },
    })

    expect(patch).toMatchObject({
      type: 'widget/replace',
      payload: {
        key: 'memo',
        widget: {
          x: 640,
          y: 360,
          width: 420,
        },
      },
    })
    if (patch.type !== 'widget/replace') {
      throw new Error('Expected widget patch')
    }
    expect(patch.payload.widget.height).toBeGreaterThan(0)

    await vi.advanceTimersByTimeAsync(600)
    await storage.flush()
    const saved = JSON.parse(await fs.readFile(filePath, 'utf-8')) as ReturnType<typeof createDefaultAppData>
    expect(saved.desktopSettings.widgets.memo).toMatchObject({
      x: 640,
      y: 360,
      width: 420,
    })
  })

  it('preserves corrupt JSON and recreates default data', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    await fs.writeFile(filePath, '{ broken json', 'utf-8')
    const storage = new AppStorage(filePath)

    const data = await storage.initialize()
    expect(data.schemaVersion).toBe(2)
    const saved = JSON.parse(await fs.readFile(filePath, 'utf-8')) as typeof data
    expect(saved.schemaVersion).toBe(2)

    const files = await fs.readdir(tempDir)
    const corruptFiles = files.filter((file) => file.startsWith('app-data.corrupt-') && file.endsWith('.json'))
    expect(corruptFiles).toHaveLength(1)
    await expect(fs.readFile(join(tempDir, corruptFiles[0]), 'utf-8')).resolves.toBe('{ broken json')
  })

  it('backs up and normalizes legacy data through the migration path', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const legacy = createDefaultAppData(filePath)
    const {
      schemaVersion: _schemaVersion,
      browserUsage: _browserUsage,
      countdownItems: _countdownItems,
      ...legacyWithoutVersionUsageAndCountdowns
    } = legacy
    await fs.writeFile(filePath, `${JSON.stringify(legacyWithoutVersionUsageAndCountdowns, null, 2)}\n`, 'utf-8')
    const storage = new AppStorage(filePath)

    const data = await storage.initialize()
    expect(data.schemaVersion).toBe(2)
    expect(data.browserUsage).toEqual({})
    expect(data.countdownItems).toEqual([])

    const saved = JSON.parse(await fs.readFile(filePath, 'utf-8')) as typeof data
    expect(saved.schemaVersion).toBe(2)
    expect(saved.browserUsage).toEqual({})
    expect(saved.countdownItems).toEqual([])

    const backups = await storage.listDataBackups()
    expect(backups).toHaveLength(1)
    expect(backups[0].reason).toBe('migration')
  })

  it('migrates schema v1 data to v2 with countdown items', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const { countdownItems: _countdownItems, ...v1Data } = createDefaultAppData(filePath)
    await fs.writeFile(filePath, `${JSON.stringify({ ...v1Data, schemaVersion: 1 }, null, 2)}\n`, 'utf-8')

    const storage = new AppStorage(filePath)
    const data = await storage.initialize()

    expect(data.schemaVersion).toBe(2)
    expect(data.countdownItems).toEqual([])

    const saved = JSON.parse(await fs.readFile(filePath, 'utf-8')) as typeof data
    expect(saved.schemaVersion).toBe(2)
    expect(saved.countdownItems).toEqual([])

    const backups = await storage.listDataBackups()
    expect(backups.some((backup) => backup.reason === 'migration')).toBe(true)
  })

  it('lists backups and restores a selected backup', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)
    const initial = await storage.initialize()
    await storage.updateWithAction({
      type: 'memo/end',
      payload: {
        id: initial.memos[0].id,
        endedAt: '2026-04-29T08:02:00.000Z',
      },
    })
    await storage.flush()

    const backups = await storage.listDataBackups()
    const dailyBackup = backups.find((backup) => backup.reason === 'daily')
    expect(dailyBackup).toBeTruthy()

    const restored = await storage.restoreDataBackup(dailyBackup!.id)
    expect(restored.memos[0].status).toBe('active')

    const afterRestoreBackups = await storage.listDataBackups()
    expect(afterRestoreBackups.some((backup) => backup.reason === 'manual')).toBe(true)
  })

  it('auto-saves daily browser usage snapshots when usage is recorded', async () => {
    const { AppStorage } = await import('./storage')
    const { normalizeBrowserPageSample } = await import('@shared/utils/browserUsage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)

    await storage.initialize()
    const sample = normalizeBrowserPageSample({
      url: 'https://chatgpt.com/c/private-conversation',
      title: 'Private conversation title',
      browser: 'Google Chrome',
      observedAt: '2026-04-25T09:00:00',
    })

    expect(sample).not.toBeNull()
    await storage.recordBrowserUsage(sample!, 75)

    const snapshotPath = join(tempDir, 'daily-usage', 'timetable-usage-2026-04-25.json')
    const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf-8')) as {
      date: string
      totalSeconds: number
      aiSeconds: number
      entries: Array<{ title: string; url?: string }>
    }

    expect(snapshot.date).toBe('2026-04-25')
    expect(snapshot.totalSeconds).toBe(75)
    expect(snapshot.aiSeconds).toBe(75)
    expect(snapshot.entries[0].title).toBe('ChatGPT')
    expect(snapshot.entries[0]).not.toHaveProperty('url')
  })

  it('returns a browser usage day patch while auto-saving the daily snapshot', async () => {
    const { AppStorage } = await import('./storage')
    const { normalizeBrowserPageSample } = await import('@shared/utils/browserUsage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)

    await storage.initialize()
    const sample = normalizeBrowserPageSample({
      url: 'https://example.com/docs',
      title: 'Docs',
      browser: 'Microsoft Edge',
      observedAt: '2026-04-25T09:00:00.000Z',
    })

    expect(sample).not.toBeNull()
    const patch = await storage.recordBrowserUsagePatch(sample!, 45)

    expect(patch).toMatchObject({
      type: 'browserUsage/dayReplace',
      payload: {
        date: '2026-04-25',
        day: {
          date: '2026-04-25',
          totalSeconds: 45,
        },
      },
    })
    if (patch.type !== 'browserUsage/dayReplace') {
      throw new Error('Expected browser usage patch')
    }
    expect(patch.payload.day.pages['https://example.com/docs']).toMatchObject({
      title: 'Docs',
      totalSeconds: 45,
    })

    const snapshotPath = join(tempDir, 'daily-usage', 'timetable-usage-2026-04-25.json')
    const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf-8')) as { totalSeconds: number }
    expect(snapshot.totalSeconds).toBe(45)
  })
})
