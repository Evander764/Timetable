import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from './defaults'
import { applyDataAction, applyDataPatch, applyOverlayWidgetUpdate, applySettingsUpdate } from './reducer'

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

  it('deep-merges partial widget settings without replacing the widget map', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const next = applySettingsUpdate(data, {
      desktopSettings: {
        widgets: {
          memo: { enabled: true },
        },
      },
    })

    expect(next.desktopSettings.widgets.memo.enabled).toBe(true)
    expect(next.desktopSettings.widgets.memo.x).toBe(data.desktopSettings.widgets.memo.x)
    expect(next.desktopSettings.widgets.mainPanel).toEqual(data.desktopSettings.widgets.mainPanel)
  })

  it('preserves all widgets when updating non-widget desktop settings', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const next = applySettingsUpdate(data, {
      desktopSettings: {
        opacity: 0.5,
      },
    })

    expect(next.desktopSettings.opacity).toBe(0.5)
    expect(next.desktopSettings.widgets).toEqual(data.desktopSettings.widgets)
  })

  it('upserts countdown items without duplicating existing ids', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const item = {
      id: 'countdown-1',
      title: 'Exam',
      targetAt: '2026-05-01T09:00:00.000Z',
      createdAt: '2026-04-29T08:00:00.000Z',
    }
    const created = applyDataAction(data, { type: 'countdownItem/upsert', payload: item })
    const updated = applyDataAction(created, {
      type: 'countdownItem/upsert',
      payload: {
        ...item,
        title: 'Final exam',
      },
    })

    expect(created.countdownItems).toHaveLength(1)
    expect(updated.countdownItems).toHaveLength(1)
    expect(updated.countdownItems[0].title).toBe('Final exam')
  })

  it('pins and clears countdown items', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const pinned = applyDataAction(data, { type: 'countdownItem/pin', payload: { id: 'countdown-1' } })
    const cleared = applyDataAction(pinned, { type: 'countdownItem/pin', payload: { id: null } })

    expect(pinned.countdownCard.pinnedItemId).toBe('countdown-1')
    expect(cleared.countdownCard.pinnedItemId).toBeUndefined()
  })

  it('clears the pinned countdown when deleting that item only', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const first = {
      id: 'countdown-1',
      title: 'Exam',
      targetAt: '2026-05-01T09:00:00.000Z',
      createdAt: '2026-04-29T08:00:00.000Z',
    }
    const second = {
      id: 'countdown-2',
      title: 'Project',
      targetAt: '2026-05-02T09:00:00.000Z',
      createdAt: '2026-04-29T08:01:00.000Z',
    }
    const withItems = applyDataAction(applyDataAction(data, { type: 'countdownItem/upsert', payload: first }), {
      type: 'countdownItem/upsert',
      payload: second,
    })
    const pinned = applyDataAction(withItems, { type: 'countdownItem/pin', payload: { id: first.id } })
    const deletedOther = applyDataAction(pinned, { type: 'countdownItem/delete', payload: { id: second.id } })
    const deletedPinned = applyDataAction(deletedOther, { type: 'countdownItem/delete', payload: { id: first.id } })

    expect(deletedOther.countdownCard.pinnedItemId).toBe(first.id)
    expect(deletedPinned.countdownCard.pinnedItemId).toBeUndefined()
    expect(deletedPinned.countdownItems).toHaveLength(0)
  })

  it('applies a widget patch without replacing other widgets', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const widget = {
      ...data.desktopSettings.widgets.memo,
      x: 720,
      y: 380,
    }
    const next = applyDataPatch(data, {
      type: 'widget/replace',
      payload: {
        key: 'memo',
        widget,
      },
    })

    expect(next.desktopSettings.widgets.memo).toEqual(widget)
    expect(next.desktopSettings.widgets.mainPanel).toEqual(data.desktopSettings.widgets.mainPanel)
    expect(next.desktopSettings.autoHide).toBe(data.desktopSettings.autoHide)
  })

  it('applies a browser usage day patch without replacing other days', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    data.browserUsage['2026-04-24'] = {
      date: '2026-04-24',
      totalSeconds: 30,
      pages: {},
    }
    const day = {
      date: '2026-04-25',
      totalSeconds: 90,
      pages: {
        'https://example.com/docs': {
          url: 'https://example.com/docs',
          title: 'Docs',
          domain: 'example.com',
          browser: 'Microsoft Edge',
          totalSeconds: 90,
          firstSeenAt: '2026-04-25T09:00:00.000Z',
          lastSeenAt: '2026-04-25T09:01:30.000Z',
        },
      },
    }

    const next = applyDataPatch(data, {
      type: 'browserUsage/dayReplace',
      payload: {
        date: '2026-04-25',
        day,
      },
    })

    expect(next.browserUsage['2026-04-25']).toEqual(day)
    expect(next.browserUsage['2026-04-24']).toEqual(data.browserUsage['2026-04-24'])
  })
})
