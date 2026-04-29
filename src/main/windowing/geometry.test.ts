import { describe, expect, it } from 'vitest'
import {
  AUTO_HIDE_STRIP,
  AUTO_HIDE_THRESHOLD,
  clampOpacity,
  constrainBoundsToDisplay,
  getCollapsedBounds,
  getCollapsibleEdge,
  getDefaultMainWindowSize,
  sameBounds,
  snapBoundsToEdge,
  type WindowBounds,
} from './geometry'

const display: WindowBounds = { x: 0, y: 0, width: 1000, height: 700 }

describe('window geometry', () => {
  it('sizes the main window within large and small work areas', () => {
    expect(getDefaultMainWindowSize({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({
      width: 1180,
      height: 760,
      minWidth: 1024,
      minHeight: 660,
    })

    expect(getDefaultMainWindowSize({ x: 0, y: 0, width: 800, height: 500 })).toEqual({
      width: 800,
      height: 500,
      minWidth: 800,
      minHeight: 500,
    })
  })

  it('constrains overlay bounds to the display work area', () => {
    expect(constrainBoundsToDisplay({ x: -50, y: -20, width: 1200, height: 900 }, display)).toEqual(display)
    expect(constrainBoundsToDisplay({ x: 950.8, y: 680.2, width: 100.2, height: 80.8 }, display)).toEqual({
      x: 900,
      y: 619,
      width: 100,
      height: 81,
    })
  })

  it('detects collapsible edges near each display side', () => {
    expect(getCollapsibleEdge({ x: 20, y: 200, width: 160, height: 120 }, display, AUTO_HIDE_THRESHOLD)).toBe('left')
    expect(getCollapsibleEdge({ x: 820, y: 200, width: 160, height: 120 }, display, AUTO_HIDE_THRESHOLD)).toBe('right')
    expect(getCollapsibleEdge({ x: 300, y: 20, width: 160, height: 120 }, display, AUTO_HIDE_THRESHOLD)).toBe('top')
    expect(getCollapsibleEdge({ x: 300, y: 560, width: 160, height: 120 }, display, AUTO_HIDE_THRESHOLD)).toBe('bottom')
    expect(getCollapsibleEdge({ x: 300, y: 300, width: 160, height: 120 }, display, AUTO_HIDE_THRESHOLD)).toBeUndefined()
  })

  it('snaps expanded bounds to an edge and keeps only a strip while collapsed', () => {
    const bounds = { x: 16, y: 20, width: 200, height: 100 }
    const expanded = snapBoundsToEdge(bounds, display, 'left')
    expect(expanded).toEqual({ x: 0, y: 20, width: 200, height: 100 })
    expect(getCollapsedBounds(expanded, display, 'left')).toEqual({
      x: -200 + AUTO_HIDE_STRIP,
      y: 20,
      width: 200,
      height: 100,
    })

    const rightExpanded = snapBoundsToEdge({ x: 820, y: 20, width: 200, height: 100 }, display, 'right')
    expect(rightExpanded.x).toBe(800)
    expect(getCollapsedBounds(rightExpanded, display, 'right').x).toBe(1000 - AUTO_HIDE_STRIP)
  })

  it('clamps opacity and compares bounds exactly', () => {
    expect(clampOpacity(0)).toBe(0.2)
    expect(clampOpacity(0.75)).toBe(0.75)
    expect(clampOpacity(2)).toBe(1)
    expect(sameBounds(display, { ...display })).toBe(true)
    expect(sameBounds(display, { ...display, x: 1 })).toBe(false)
  })
})
