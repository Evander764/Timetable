import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
  },
}))

describe('AppStorage', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'timetable-'))
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('creates default data on first boot and auto-saves debounced updates', async () => {
    const { AppStorage } = await import('./storage')
    const filePath = join(tempDir, 'app-data.json')
    const storage = new AppStorage(filePath)

    const initial = await storage.initialize()
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
    const saved = JSON.parse(await readFile(filePath, 'utf-8')) as typeof initial
    expect(saved.memos[0].status).toBe('ended')
    expect(saved.appSettings.lastSavedAt).toBeTruthy()
  })

  it('normalizes old data without countdown events', async () => {
    const { AppStorage } = await import('./storage')
    const { createDefaultAppData } = await import('@shared/data/defaults')
    const filePath = join(tempDir, 'legacy-app-data.json')
    const legacyData = createDefaultAppData(filePath)
    const legacyWithoutEvents: Partial<typeof legacyData> = { ...legacyData }
    delete legacyWithoutEvents.countdownEvents
    await writeFile(filePath, JSON.stringify(legacyWithoutEvents), 'utf-8')

    const storage = new AppStorage(filePath)
    const initial = await storage.initialize()

    expect(initial.countdownEvents).toEqual([])
  })

  it('migrates legacy global auto hide into widget settings', async () => {
    const { AppStorage } = await import('./storage')
    const { createDefaultAppData } = await import('@shared/data/defaults')
    const filePath = join(tempDir, 'legacy-auto-hide.json')
    const legacyData = createDefaultAppData(filePath)
    legacyData.desktopSettings.autoHide = true
    Object.values(legacyData.desktopSettings.widgets).forEach((widget) => {
      delete widget.autoHide
    })
    await writeFile(filePath, JSON.stringify(legacyData), 'utf-8')

    const storage = new AppStorage(filePath)
    const initial = await storage.initialize()

    expect(initial.desktopSettings.autoHide).toBe(false)
    expect(Object.values(initial.desktopSettings.widgets).every((widget) => widget.autoHide === true)).toBe(true)
  })
})
