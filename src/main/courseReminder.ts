import { Notification } from 'electron'
import type { AppData } from '@shared/types/app'
import { getCourseReminderCandidates, getCourseReminderKey, normalizeCourseReminderMinutes, type CourseOccurrence } from '@shared/utils/course'

type CourseReminderServices = {
  getData: () => AppData
  notify?: (course: CourseOccurrence) => void
  intervalMs?: number
}

export class CourseReminderService {
  private readonly getData: () => AppData
  private readonly notify: (course: CourseOccurrence) => void
  private readonly intervalMs: number
  private readonly notifiedReminderKeys = new Set<string>()
  private timer?: NodeJS.Timeout

  constructor({ getData, notify = showCourseReminderNotification, intervalMs = 30_000 }: CourseReminderServices) {
    this.getData = getData
    this.notify = notify
    this.intervalMs = intervalMs
  }

  start(): void {
    this.stop()
    this.check()
    this.timer = setInterval(() => this.check(), this.intervalMs)
  }

  stop(): void {
    clearInterval(this.timer)
    this.timer = undefined
  }

  check(now = new Date()): void {
    const data = this.getData()
    if (!data.appSettings.courseReminderEnabled) {
      return
    }

    const candidates = getCourseReminderCandidates(
      data.courses,
      now,
      data.appSettings.termStartDate,
      data.appSettings.termWeekCount,
      normalizeCourseReminderMinutes(data.appSettings.courseReminderMinutes),
    )

    for (const course of candidates) {
      const reminderKey = getCourseReminderKey(course)
      if (this.notifiedReminderKeys.has(reminderKey)) {
        continue
      }

      this.notifiedReminderKeys.add(reminderKey)
      try {
        this.notify(course)
      } catch (error) {
        console.error('Failed to show course reminder notification.', error)
      }
    }
  }
}

function showCourseReminderNotification(course: CourseOccurrence): void {
  if (!Notification.isSupported()) {
    return
  }

  const details = [course.location, course.teacher].map((item) => item.trim()).filter(Boolean).join(' · ')
  const body = [`${course.startTime} 开始`, details].filter(Boolean).join(' · ')
  const notification = new Notification({
    title: `课程提醒：${course.name || '未命名课程'}`,
    body,
  })
  notification.show()
}
