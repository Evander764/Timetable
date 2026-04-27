import type { AppData, WidgetConfig, WidgetKey } from '@shared/types/app'

type WidgetSizeBase = {
  width: number
  height: number
  minScale: number
  maxScale: number
}

export const WIDGET_SIZE_BASES: Record<WidgetKey, WidgetSizeBase> = {
  mainPanel: { width: 560, height: 640, minScale: 70, maxScale: 140 },
  dailyTasks: { width: 430, height: 430, minScale: 70, maxScale: 145 },
  memo: { width: 420, height: 380, minScale: 70, maxScale: 145 },
  countdown: { width: 390, height: 54, minScale: 70, maxScale: 125 },
  principle: { width: 400, height: 190, minScale: 70, maxScale: 155 },
}

export function getWidgetScalePercent(key: WidgetKey, config: WidgetConfig): number {
  const base = WIDGET_SIZE_BASES[key]
  const widthScale = config.width / base.width
  const heightScale = config.height / base.height
  return clamp(Math.round(((widthScale + heightScale) / 2) * 100), base.minScale, base.maxScale)
}

export function resizeWidgetByScale(key: WidgetKey, scalePercent: number): Pick<WidgetConfig, 'width' | 'height'> {
  const base = WIDGET_SIZE_BASES[key]
  const scale = clamp(scalePercent, base.minScale, base.maxScale) / 100
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
  }
}

export function migrateLegacyDesktopScale(data: AppData): AppData {
  const scale = data.desktopSettings.scale
  if (!scale || Math.abs(scale - 1) < 0.001) {
    return data
  }

  const widgets = Object.fromEntries(
    (Object.entries(data.desktopSettings.widgets) as Array<[WidgetKey, WidgetConfig]>).map(([key, config]) => [
      key,
      {
        ...config,
        width: Math.round(config.width * scale),
        height: Math.round(config.height * scale),
      },
    ]),
  ) as Record<WidgetKey, WidgetConfig>

  return {
    ...data,
    desktopSettings: {
      ...data.desktopSettings,
      scale: 1,
      widgets,
    },
  }
}

export function normalizeCountdownStripWidget(data: AppData): AppData {
  const countdown = data.desktopSettings.widgets.countdown
  const base = WIDGET_SIZE_BASES.countdown
  const maxHeight = Math.round(base.height * (base.maxScale / 100))
  if (countdown.height <= maxHeight) {
    return data
  }

  return {
    ...data,
    desktopSettings: {
      ...data.desktopSettings,
      widgets: {
        ...data.desktopSettings.widgets,
        countdown: {
          ...countdown,
          width: base.width,
          height: base.height,
          minimized: true,
        },
      },
    },
    countdownCard: {
      ...data.countdownCard,
      minimized: true,
    },
  }
}

export function migrateOverlayOpacity(data: AppData, previousOpacityVersion?: number): AppData {
  if (previousOpacityVersion && previousOpacityVersion >= 2) {
    return data
  }

  const widgets = Object.fromEntries(
    (Object.entries(data.desktopSettings.widgets) as Array<[WidgetKey, WidgetConfig]>).map(([key, config]) => [
      key,
      {
        ...config,
        opacity: Math.max(config.opacity ?? 0, key === 'countdown' ? 0.96 : 0.94),
      },
    ]),
  ) as Record<WidgetKey, WidgetConfig>

  return {
    ...data,
    principleCard: {
      ...data.principleCard,
      opacity: Math.max(data.principleCard.opacity ?? 0, 0.94),
    },
    countdownCard: {
      ...data.countdownCard,
      opacity: Math.max(data.countdownCard.opacity ?? 0, 0.96),
    },
    desktopSettings: {
      ...data.desktopSettings,
      opacity: Math.max(data.desktopSettings.opacity ?? 0, 0.96),
      widgets,
    },
    appSettings: {
      ...data.appSettings,
      opacityVersion: 2,
    },
  }
}

export function migrateDesktopThreePieceLayout(data: AppData, previousLayoutVersion?: number): AppData {
  if (previousLayoutVersion && previousLayoutVersion >= 2) {
    return data
  }

  const principleMode = data.principleCard.displayMode ?? 'embedded'
  return {
    ...data,
    principleCard: {
      ...data.principleCard,
      displayMode: principleMode,
    },
    desktopSettings: {
      ...data.desktopSettings,
      widgets: {
        ...data.desktopSettings.widgets,
        mainPanel: {
          ...data.desktopSettings.widgets.mainPanel,
          width: WIDGET_SIZE_BASES.mainPanel.width,
          height: WIDGET_SIZE_BASES.mainPanel.height,
        },
        countdown: {
          ...data.desktopSettings.widgets.countdown,
          width: WIDGET_SIZE_BASES.countdown.width,
          height: WIDGET_SIZE_BASES.countdown.height,
          minimized: true,
        },
        principle: {
          ...data.desktopSettings.widgets.principle,
          enabled: principleMode === 'standalone' && data.principleCard.enabled,
          width: WIDGET_SIZE_BASES.principle.width,
          height: WIDGET_SIZE_BASES.principle.height,
        },
      },
    },
    appSettings: {
      ...data.appSettings,
      desktopLayoutVersion: 2,
    },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
