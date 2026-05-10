import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from './defaults'
import { applyDataAction, applyOverlayWidgetUpdate, applySettingsUpdate, normalizeAppSettings } from './reducer'

describe('data reducer', () => {
  it('upserts entities and toggles task completion', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const next = applyDataAction(data, {
      type: 'task/toggle',
      payload: {
        id: data.dailyTasks[0].id,
        date: '2026-04-24',
        completed: true,
      },
    })

    expect(next.dailyTasks[0].completions['2026-04-24']).toBe(true)
  })

  it('merges settings and widget updates', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const updatedSettings = applySettingsUpdate(data, {
      desktopSettings: { autoHide: true },
      appSettings: { autoSave: false },
    })
    const updatedWidget = applyOverlayWidgetUpdate(updatedSettings, {
      key: 'memo',
      changes: { x: 500, y: 600, autoHide: true },
    })

    expect(updatedSettings.desktopSettings.autoHide).toBe(true)
    expect(updatedSettings.appSettings.autoSave).toBe(false)
    expect(updatedWidget.desktopSettings.widgets.memo.x).toBe(500)
    expect(updatedWidget.desktopSettings.widgets.memo.autoHide).toBe(true)
  })

  it('upserts and deletes countdown events', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const event = {
      id: 'countdown-event-test',
      title: '考试',
      targetDate: '2026-05-01',
      targetTime: '09:00',
      note: '提前到场',
      color: '#2563EB',
      createdAt: '2026-04-29T08:00:00.000Z',
    }
    const inserted = applyDataAction(data, { type: 'countdownEvent/upsert', payload: event })
    const updated = applyDataAction(inserted, { type: 'countdownEvent/upsert', payload: { ...event, title: '期末考试' } })
    const deleted = applyDataAction(updated, { type: 'countdownEvent/delete', payload: { id: event.id } })

    expect(inserted.countdownEvents[0]).toMatchObject(event)
    expect(updated.countdownEvents.find((item) => item.id === event.id)?.title).toBe('期末考试')
    expect(deleted.countdownEvents.some((item) => item.id === event.id)).toBe(false)
  })

  it('normalizes ritual settings with stable defaults', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const normalized = normalizeAppSettings({
      ...data.appSettings,
      ritualIntroEnabled: false,
      ritualOutroEnabled: false,
      ritualEntryMode: 'workbench' as typeof data.appSettings.ritualEntryMode,
      ritualExitMode: 'moon',
      ritualMusicEnabled: false,
      ritualMusicVolume: 2,
      ritualEntryText: '  ',
      ritualExitLine1: '',
      ritualExitLine2: '',
    })

    expect(normalized.ritualIntroEnabled).toBe(false)
    expect(normalized.ritualOutroEnabled).toBe(false)
    expect(normalized.ritualEntryMode).toBe('door')
    expect(normalized.workRitualMode).toBe('workbench')
    expect(normalized.ritualExitMode).toBe('moon')
    expect(normalized.ritualMusicEnabled).toBe(false)
    expect(normalized.ritualMusicVolume).toBe(0.3)
    expect(normalized.ritualEntryText).toBe('如果今天是最后一天，你打算怎么过？')
    expect(normalized.ritualExitLine1).toBe('明天')
    expect(normalized.ritualExitLine2).toBe('从现在开始')
  })

  it('normalizes legacy ritual music fields when old data does not have them', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const legacySettings = { ...data.appSettings } as Partial<typeof data.appSettings>
    delete legacySettings.ritualMusicEnabled
    delete legacySettings.ritualMusicVolume

    const normalized = normalizeAppSettings(legacySettings as typeof data.appSettings)

    expect(normalized.ritualMusicEnabled).toBe(true)
    expect(normalized.ritualMusicVolume).toBe(0.12)
    expect(normalized.ritualEntryMode).toBe('door')
    expect(normalized.ritualExitMode).toBe('door')
    expect(normalized.workRitualMode).toBe('workbench')
  })

  it('normalizes unsupported ritual animation modes', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const normalized = normalizeAppSettings({
      ...data.appSettings,
      ritualEntryMode: 'bad-entry' as typeof data.appSettings.ritualEntryMode,
      ritualExitMode: 'bad-exit' as typeof data.appSettings.ritualExitMode,
      workRitualMode: 'bad-work' as typeof data.appSettings.workRitualMode,
    })

    expect(normalized.ritualEntryMode).toBe('door')
    expect(normalized.ritualExitMode).toBe('door')
    expect(normalized.workRitualMode).toBe('workbench')
  })
})
