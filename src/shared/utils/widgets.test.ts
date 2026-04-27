import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'
import {
  DEFAULT_OVERLAY_OPACITY,
  getEffectiveOverlayOpacity,
  migrateOverlayOpacity,
  OVERLAY_OPACITY_VERSION,
} from './widgets'

describe('overlay widget opacity', () => {
  it('keeps card opacity from being compounded by global opacity', () => {
    expect(getEffectiveOverlayOpacity(0.98, 0.98)).toBe(0.98)
    expect(getEffectiveOverlayOpacity(0.9, 0.98)).toBe(0.9)
  })

  it('raises older desktop card opacity values to the current baseline', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const migrated = migrateOverlayOpacity({
      ...data,
      desktopSettings: {
        ...data.desktopSettings,
        opacity: 0.72,
        widgets: {
          ...data.desktopSettings.widgets,
          countdown: { ...data.desktopSettings.widgets.countdown, opacity: 0.68 },
          principle: { ...data.desktopSettings.widgets.principle, opacity: 0.7 },
        },
      },
      appSettings: {
        ...data.appSettings,
        opacityVersion: 2,
      },
    }, 2)

    expect(migrated.desktopSettings.opacity).toBe(DEFAULT_OVERLAY_OPACITY)
    expect(migrated.desktopSettings.widgets.countdown.opacity).toBe(DEFAULT_OVERLAY_OPACITY)
    expect(migrated.desktopSettings.widgets.principle.opacity).toBe(DEFAULT_OVERLAY_OPACITY)
    expect(migrated.appSettings.opacityVersion).toBe(OVERLAY_OPACITY_VERSION)
  })
})
