export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type CollapsibleEdge = 'left' | 'right' | 'top' | 'bottom'

export const AUTO_HIDE_THRESHOLD = 40
export const AUTO_HIDE_STRIP = 22
export const AUTO_HIDE_DELAY_MS = 180
export const PROGRAMMATIC_BOUNDS_SUPPRESS_MS = 180

const MAIN_WINDOW_DEFAULT_WIDTH = 1180
const MAIN_WINDOW_DEFAULT_HEIGHT = 760
const MAIN_WINDOW_MIN_WIDTH = 1024
const MAIN_WINDOW_MIN_HEIGHT = 660
const MAIN_WINDOW_SCREEN_MARGIN = 64

export function clampOpacity(value: number): number {
  return Math.max(0.2, Math.min(1, value))
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min
  }
  return Math.max(min, Math.min(max, value))
}

export function getDefaultMainWindowSize(workArea: WindowBounds): {
  width: number
  height: number
  minWidth: number
  minHeight: number
} {
  const widthFloor = Math.min(MAIN_WINDOW_MIN_WIDTH, workArea.width)
  const heightFloor = Math.min(MAIN_WINDOW_MIN_HEIGHT, workArea.height)
  const width = Math.min(MAIN_WINDOW_DEFAULT_WIDTH, Math.max(widthFloor, workArea.width - MAIN_WINDOW_SCREEN_MARGIN))
  const height = Math.min(MAIN_WINDOW_DEFAULT_HEIGHT, Math.max(heightFloor, workArea.height - MAIN_WINDOW_SCREEN_MARGIN))

  return {
    width,
    height,
    minWidth: Math.min(MAIN_WINDOW_MIN_WIDTH, width),
    minHeight: Math.min(MAIN_WINDOW_MIN_HEIGHT, height),
  }
}

export function constrainBoundsToDisplay(bounds: WindowBounds, display: WindowBounds): WindowBounds {
  const width = Math.min(Math.max(1, Math.round(bounds.width)), display.width)
  const height = Math.min(Math.max(1, Math.round(bounds.height)), display.height)
  return {
    x: clamp(Math.round(bounds.x), display.x, display.x + display.width - width),
    y: clamp(Math.round(bounds.y), display.y, display.y + display.height - height),
    width,
    height,
  }
}

export function sameBounds(a: WindowBounds, b: WindowBounds): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

export function pointInBounds(point: { x: number; y: number }, bounds: WindowBounds, margin = 0): boolean {
  return point.x >= bounds.x - margin
    && point.x <= bounds.x + bounds.width + margin
    && point.y >= bounds.y - margin
    && point.y <= bounds.y + bounds.height + margin
}

export function snapBoundsToEdge(bounds: WindowBounds, display: WindowBounds, edge: CollapsibleEdge): WindowBounds {
  const snapped = constrainBoundsToDisplay(bounds, display)
  if (edge === 'left') {
    return { ...snapped, x: display.x }
  }
  if (edge === 'right') {
    return { ...snapped, x: display.x + display.width - snapped.width }
  }
  if (edge === 'top') {
    return { ...snapped, y: display.y }
  }
  return { ...snapped, y: display.y + display.height - snapped.height }
}

export function getCollapsedBounds(bounds: WindowBounds, display: WindowBounds, edge: CollapsibleEdge): WindowBounds {
  const collapsed = { ...bounds }
  if (edge === 'left') {
    collapsed.x = display.x - bounds.width + AUTO_HIDE_STRIP
  } else if (edge === 'right') {
    collapsed.x = display.x + display.width - AUTO_HIDE_STRIP
  } else if (edge === 'top') {
    collapsed.y = display.y - bounds.height + AUTO_HIDE_STRIP
  } else {
    collapsed.y = display.y + display.height - AUTO_HIDE_STRIP
  }
  return collapsed
}

export function getCollapsibleEdge(bounds: WindowBounds, display: WindowBounds, threshold: number): CollapsibleEdge | undefined {
  if (Math.abs(bounds.x - display.x) <= threshold) {
    return 'left'
  }
  if (Math.abs(display.x + display.width - (bounds.x + bounds.width)) <= threshold) {
    return 'right'
  }
  if (Math.abs(bounds.y - display.y) <= threshold) {
    return 'top'
  }
  if (Math.abs(display.y + display.height - (bounds.y + bounds.height)) <= threshold) {
    return 'bottom'
  }
  return undefined
}
