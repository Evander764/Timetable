import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from './defaults'
import { applyDataAction, applyOverlayWidgetUpdate, applySettingsUpdate } from './reducer'

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
})
