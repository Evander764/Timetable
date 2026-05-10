import { describe, expect, it } from 'vitest'
import type { DailyTask } from '@shared/types/app'
import { parseDateKey } from './date'
import { getCompletionRate, getTaskStreak, shouldTaskAppearOnDate } from './tasks'

const baseTask: DailyTask = {
  id: 'task-1',
  title: '背单词 50 个',
  repeatRule: 'daily',
  priority: 'medium',
  completions: {},
  createdAt: '2026-04-20T00:00:00.000Z',
}

describe('task utils', () => {
  it('matches repeat rules against a date', () => {
    expect(shouldTaskAppearOnDate({ ...baseTask, repeatRule: 'daily' }, parseDateKey('2026-04-24'))).toBe(true)
    expect(
      shouldTaskAppearOnDate(
        { ...baseTask, repeatRule: 'weekly', weeklyDays: [5] },
        parseDateKey('2026-04-24'),
      ),
    ).toBe(true)
    expect(shouldTaskAppearOnDate({ ...baseTask, repeatRule: 'holiday' }, parseDateKey('2026-10-01'))).toBe(true)
  })

  it('calculates completion rate and streak from visible tasks', () => {
    const tasks: DailyTask[] = [
      { ...baseTask, id: 'task-1', completions: { '2026-04-24': true, '2026-04-23': true } },
      { ...baseTask, id: 'task-2', completions: { '2026-04-24': true, '2026-04-23': true } },
    ]

    expect(getCompletionRate(tasks, parseDateKey('2026-04-24'))).toBe(100)
    expect(getTaskStreak(tasks, parseDateKey('2026-04-24'))).toBe(2)
  })
})
