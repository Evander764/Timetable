import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/renderer/index.css'), 'utf-8')

function getRuleBody(selectorPattern: RegExp): string {
  const match = css.match(selectorPattern)
  if (!match?.[1]) {
    throw new Error(`CSS rule not found: ${selectorPattern}`)
  }
  return match[1]
}

function hasVisibleBorder(body: string): boolean {
  return body
    .split('\n')
    .some((line) => /^\s*border\s*:/.test(line) && !/:\s*0\s*;/.test(line))
}

function getDeclarationValue(body: string, property: string): string | null {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = body.match(new RegExp(`(?:^|\\n)\\s*${escapedProperty}\\s*:\\s*([^;]+);`))
  return match?.[1]?.trim() ?? null
}

function hasDeclaration(body: string, property: string): boolean {
  return getDeclarationValue(body, property) !== null
}

describe('overlay card edge styles', () => {
  it('keeps desktop card shells visible without an outer frame', () => {
    const glassCard = getRuleBody(/\.glass-card\s*\{([\s\S]*?)\n\}/)

    expect(hasVisibleBorder(glassCard)).toBe(false)
    expect(glassCard).not.toMatch(/(?:^|\n)\s*border-color\s*:/)
    expect(getDeclarationValue(glassCard, 'background')).toMatch(/^rgba\(/)
    expect(getDeclarationValue(glassCard, 'box-shadow')).toBe('none')
    expect(getDeclarationValue(glassCard, 'backdrop-filter')).toBe('none')
    expect(getDeclarationValue(glassCard, 'filter')).toBeNull()
    expect(getDeclarationValue(glassCard, 'outline')).toBeNull()
  })

  it('prevents countdown edge helpers from adding their own frame', () => {
    const countdownEdges = getRuleBody(/\.countdown-card-edge,\s*\n\.countdown-strip-edge\s*\{([\s\S]*?)\n\}/)

    expect(hasVisibleBorder(countdownEdges)).toBe(false)
    expect(countdownEdges).not.toMatch(/(?:^|\n)\s*border-color\s*:/)
    expect(hasDeclaration(countdownEdges, 'background')).toBe(false)
    expect(hasDeclaration(countdownEdges, 'box-shadow')).toBe(false)
    expect(hasDeclaration(countdownEdges, 'backdrop-filter')).toBe(false)
    expect(hasDeclaration(countdownEdges, 'filter')).toBe(false)
  })
})
