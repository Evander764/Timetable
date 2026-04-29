import { describe, expect, it, vi } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'
import type { AppData, Course } from '@shared/types/app'

vi.mock('electron', () => ({
  Notification: {
    isSupported: () => true,
  },
}))

const course: Course = {
  id: 'course-1',
  name: '算法分析',
  teacher: '张老师',
  location: 'A301',
  dayOfWeek: 2,
  startTime: '08:00',
  endTime: '09:40',
  repeatType: 'weekly',
  weekStart: 1,
  weekEnd: 16,
}

function createReminderData(settings: Partial<AppData['appSettings']> = {}): AppData {
  const data = createDefaultAppData('C:/tmp/app-data.json')
  return {
    ...data,
    courses: [course],
    appSettings: {
      ...data.appSettings,
      termStartDate: '2026-03-02',
      termWeekCount: 20,
      courseReminderEnabled: true,
      courseReminderMinutes: 15,
      ...settings,
    },
  }
}

describe('CourseReminderService', () => {
  it('notifies each course only once in one run', async () => {
    const { CourseReminderService } = await import('./courseReminder')
    const notify = vi.fn()
    const service = new CourseReminderService({
      getData: () => createReminderData(),
      notify,
    })

    service.check(new Date('2026-03-10T07:46:00'))
    service.check(new Date('2026-03-10T07:47:00'))

    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0][0].id).toBe('course-1')
  })

  it('does not notify when course reminders are disabled', async () => {
    const { CourseReminderService } = await import('./courseReminder')
    const notify = vi.fn()
    const service = new CourseReminderService({
      getData: () => createReminderData({ courseReminderEnabled: false }),
      notify,
    })

    service.check(new Date('2026-03-10T07:46:00'))

    expect(notify).not.toHaveBeenCalled()
  })
})
