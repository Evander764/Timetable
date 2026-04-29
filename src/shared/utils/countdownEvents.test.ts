import { describe, expect, it } from 'vitest'
import type { CountdownEvent } from '@shared/types/app'
import {
  getCountdownEventStatus,
  getNextCountdownEvent,
  getSortedCountdownEvents,
  normalizeCountdownEventDraft,
} from './countdownEvents'

const baseEvent: CountdownEvent = {
  id: 'event-1',
  title: '  期末考试  ',
  targetDate: '2026-05-01',
  targetTime: undefined,
  note: '  带准考证  ',
  color: '#2563EB',
  createdAt: '2026-04-29T08:00:00.000Z',
}

describe('countdown event utils', () => {
  it('normalizes title, note and optional time', () => {
    expect(normalizeCountdownEventDraft({ ...baseEvent, targetTime: '09:30' })).toMatchObject({
      event: {
        title: '期末考试',
        targetDate: '2026-05-01',
        targetTime: '09:30',
        note: '带准考证',
      },
      error: null,
    })

    expect(normalizeCountdownEventDraft({ ...baseEvent, targetTime: '' })).toMatchObject({
      event: {
        targetTime: undefined,
      },
      error: null,
    })
  })

  it('rejects empty title, invalid date and invalid time', () => {
    expect(normalizeCountdownEventDraft({ ...baseEvent, title: '   ' }).error).toBe('请输入事件名称。')
    expect(normalizeCountdownEventDraft({ ...baseEvent, targetDate: '2026-13-01' }).error).toBe('请选择有效的目标日期。')
    expect(normalizeCountdownEventDraft({ ...baseEvent, targetTime: '25:00' }).error).toBe('请输入有效的目标时间。')
  })

  it('keeps all-day events active through the target day', () => {
    expect(getCountdownEventStatus(baseEvent, new Date('2026-05-01T23:00:00')).expired).toBe(false)
    expect(getCountdownEventStatus(baseEvent, new Date('2026-05-02T00:00:00')).expired).toBe(true)
  })

  it('expires precise time events after their target time', () => {
    const timedEvent = { ...baseEvent, targetTime: '10:00' }
    expect(getCountdownEventStatus(timedEvent, new Date('2026-05-01T09:59:00')).expired).toBe(false)
    expect(getCountdownEventStatus(timedEvent, new Date('2026-05-01T10:00:00')).expired).toBe(true)
  })

  it('sorts active events first and picks the nearest active event', () => {
    const now = new Date('2026-04-29T12:00:00')
    const expired = { ...baseEvent, id: 'expired', title: '已过期', targetDate: '2026-04-28' }
    const later = { ...baseEvent, id: 'later', title: '后天', targetDate: '2026-05-01' }
    const sooner = { ...baseEvent, id: 'sooner', title: '明天', targetDate: '2026-04-30' }

    expect(getSortedCountdownEvents([expired, later, sooner], now).map((event) => event.id)).toEqual(['sooner', 'later', 'expired'])
    expect(getNextCountdownEvent([expired, later, sooner], now)?.id).toBe('sooner')
  })
})
