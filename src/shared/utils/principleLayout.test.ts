import { describe, expect, it } from 'vitest'
import { calculatePrincipleMeasuredLayout, PRINCIPLE_LAYOUT_DEFAULTS } from './principleLayout'

describe('calculatePrincipleMeasuredLayout', () => {
  it('uses the tallest measured principle card as the height baseline', () => {
    const layout = calculatePrincipleMeasuredLayout({
      cardHeights: [48, 132, 84],
      headerHeight: 60,
      verticalPadding: 32,
      currentHeight: 190,
      viewportHeight: 900,
    })

    expect(layout.longestCardHeight).toBe(132)
    expect(layout.targetHeight).toBe(224)
    expect(layout.fontScale).toBe(1)
    expect(layout.shouldUpdateHeight).toBe(true)
  })

  it('does not request a height update inside the threshold', () => {
    const targetHeight = 60 + 32 + 132
    const layout = calculatePrincipleMeasuredLayout({
      cardHeights: [132],
      headerHeight: 60,
      verticalPadding: 32,
      currentHeight: targetHeight + PRINCIPLE_LAYOUT_DEFAULTS.heightUpdateThreshold,
      viewportHeight: 900,
    })

    expect(layout.targetHeight).toBe(targetHeight)
    expect(layout.shouldUpdateHeight).toBe(false)
  })

  it('shrinks text when the tallest card would exceed the available screen height', () => {
    const layout = calculatePrincipleMeasuredLayout({
      cardHeights: [900],
      headerHeight: 60,
      verticalPadding: 32,
      currentHeight: 190,
      viewportHeight: 520,
    })

    expect(layout.targetHeight).toBe(504)
    expect(layout.fontScale).toBeLessThan(1)
    expect(layout.contentFontSize).toBeLessThan(PRINCIPLE_LAYOUT_DEFAULTS.contentFontSize)
    expect(layout.authorFontSize).toBeLessThan(PRINCIPLE_LAYOUT_DEFAULTS.authorFontSize)
  })
})
