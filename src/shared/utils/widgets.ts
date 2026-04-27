import type { AppData, WidgetConfig, WidgetKey } from '@shared/types/app'

type WidgetSizeBase = {
  width: number
  height: number
  minScale: number
  maxScale: number
}

export const WIDGET_SIZE_BASES: Record<WidgetKey, WidgetSizeBase> = {
  mainPanel: { width: 460, height: 570, minScale: 70, maxScale: 140 },
  dailyTasks: { width: 430, height: 430, minScale: 70, maxScale: 145 },
  memo: { width: 420, height: 380, minScale: 70, maxScale: 145 },
  countdown: { width: 340, height: 240, minScale: 70, maxScale: 155 },
  principle: { width: 400, height: 220, minScale: 70, maxScale: 155 },
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
