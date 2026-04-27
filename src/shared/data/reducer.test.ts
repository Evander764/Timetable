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
      changes: { x: 500, y: 600 },
    })

    expect(updatedSettings.desktopSettings.autoHide).toBe(true)
    expect(updatedSettings.appSettings.autoSave).toBe(false)
    expect(updatedWidget.desktopSettings.widgets.memo.x).toBe(500)
  })
})
