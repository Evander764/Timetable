export const PRINCIPLE_LAYOUT_DEFAULTS = {
  contentFontSize: 22,
  authorFontSize: 16,
  contentLineHeight: 1.55,
  authorLineHeight: 1.35,
  authorMarginTop: 16,
  heightUpdateThreshold: 4,
  screenMargin: 16,
  minWidgetHeight: 128,
  minFontScale: 0.3,
} as const

export type PrincipleMeasuredLayoutInput = {
  cardHeights: number[]
  headerHeight: number
  verticalPadding: number
  currentHeight: number
  viewportHeight: number
  heightUpdateThreshold?: number
}

export type PrincipleMeasuredLayout = {
  longestCardHeight: number
  targetHeight: number
  fontScale: number
  contentFontSize: number
  authorFontSize: number
  shouldUpdateHeight: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function calculatePrincipleMeasuredLayout(input: PrincipleMeasuredLayoutInput): PrincipleMeasuredLayout {
  const longestCardHeight = Math.ceil(Math.max(0, ...input.cardHeights))
  const headerHeight = Math.max(0, Math.ceil(input.headerHeight))
  const verticalPadding = Math.max(0, Math.ceil(input.verticalPadding))
  const maxWidgetHeight = Math.max(
    PRINCIPLE_LAYOUT_DEFAULTS.minWidgetHeight,
    Math.floor(input.viewportHeight - PRINCIPLE_LAYOUT_DEFAULTS.screenMargin),
  )
  const availableCardHeight = Math.max(1, maxWidgetHeight - headerHeight - verticalPadding)
  const requiredScale = longestCardHeight > availableCardHeight ? availableCardHeight / longestCardHeight : 1
  const fontScale = clamp(requiredScale, PRINCIPLE_LAYOUT_DEFAULTS.minFontScale, 1)
  const targetCardHeight = Math.ceil(longestCardHeight * fontScale)
  const targetHeight = clamp(
    Math.ceil(headerHeight + verticalPadding + targetCardHeight),
    PRINCIPLE_LAYOUT_DEFAULTS.minWidgetHeight,
    maxWidgetHeight,
  )
  const updateThreshold = input.heightUpdateThreshold ?? PRINCIPLE_LAYOUT_DEFAULTS.heightUpdateThreshold

  return {
    longestCardHeight,
    targetHeight,
    fontScale,
    contentFontSize: Math.max(1, Math.round(PRINCIPLE_LAYOUT_DEFAULTS.contentFontSize * fontScale * 10) / 10),
    authorFontSize: Math.max(1, Math.round(PRINCIPLE_LAYOUT_DEFAULTS.authorFontSize * fontScale * 10) / 10),
    shouldUpdateHeight: Math.abs(targetHeight - input.currentHeight) > updateThreshold,
  }
}
