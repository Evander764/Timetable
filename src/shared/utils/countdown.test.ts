import { describe, expect, it } from 'vitest'
import type { CountdownItem } from '@shared/types/app'
import {
  getCountdownDisplay,
  getCountdownItemDisplay,
  getPinnedCountdownItem,
  sortCountdownItems,
} from './countdown'

const now = new Date('2026-04-29T08:00:00.000Z')

function item(id: string, targetAt: string): CountdownItem {
  return {
    id,
    title: id,
    targetAt,
    createdAt: '2026-04-29T07:00:00.000Z',
  }
}

describe('countdown utils', () => {
  it('formats a future target with days, hours, and minutes', () => {
    const display = getCountdownItemDisplay(item('exam', '2026-05-01T10:30:00.000Z'), now)

    expect(display).toMatchObject({
      label: 'exam',
      value: '2d 2h 30m',
      expired: false,
    })
  })

  it('marks expired targets as reached', () => {
    const display = getCountdownItemDisplay(item('deadline', '2026-04-29T07:59:00.000Z'), now)

    expect(display.value).toBe('Reached')
    expect(display.expired).toBe(true)
  })

  it('returns null when pinned item is missing', () => {
    const items = [item('one', '2026-04-30T08:00:00.000Z')]

    expect(getPinnedCountdownItem(items, 'missing')).toBeNull()
    expect(getCountdownDisplay(items, 'missing', now)).toBeNull()
  })

  it('sorts countdown items by target time', () => {
    const later = item('later', '2026-05-02T08:00:00.000Z')
    const earlier = item('earlier', '2026-04-30T08:00:00.000Z')

    expect(sortCountdownItems([later, earlier]).map((value) => value.id)).toEqual(['earlier', 'later'])
  })
})
