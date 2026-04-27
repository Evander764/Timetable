import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
    tempDir = await mkdtemp(join(tmpdir(), 'timeable-'))
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
})
