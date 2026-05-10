import { addDays, compareAsc } from 'date-fns'
import type { Course, TimetableSlot } from '@shared/types/app'
import {
  combineDateAndTime,
  formatDateKey,
  getAcademicWeek,
  getWeekStart,
  getWeekdayIndex,
  parseTimeToMinutes,
} from './date'

export type CourseOccurrence = Course & {
  dateKey: string
}

export type TodayCourseStatus = {
  currentCourse: CourseOccurrence | null
  nextCourse: CourseOccurrence | null
  completedCourses: CourseOccurrence[]
  remainingCourses: CourseOccurrence[]
}

export const DEFAULT_COURSE_REMINDER_MINUTES = 15

export const defaultTimetableSlots: TimetableSlot[] = [
  { id: 'morning-1', section: '上午', label: '第1节', startTime: '08:30', endTime: '09:10' },
  { id: 'morning-2', section: '上午', label: '第2节', startTime: '09:15', endTime: '09:55' },
  { id: 'morning-3', section: '上午', label: '第3节', startTime: '10:15', endTime: '10:55' },
  { id: 'morning-4', section: '上午', label: '第4节', startTime: '11:00', endTime: '11:40' },
  { id: 'morning-5', section: '上午', label: '第5节', startTime: '11:45', endTime: '12:25' },
  { id: 'afternoon-1', section: '下午', label: '第6节', startTime: '14:15', endTime: '14:55' },
  { id: 'afternoon-2', section: '下午', label: '第7节', startTime: '15:00', endTime: '15:40' },
  { id: 'afternoon-3', section: '下午', label: '第8节', startTime: '16:00', endTime: '16:40' },
  { id: 'afternoon-4', section: '下午', label: '第9节', startTime: '16:45', endTime: '17:25' },
  { id: 'dusk', section: '傍晚', label: '傍晚课', startTime: '17:40', endTime: '18:55' },
  { id: 'night', section: '晚上', label: '晚课', startTime: '19:00', endTime: '20:20' },
]

export function normalizeTermWeekCount(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 20
  }
  return Math.min(40, Math.max(1, Math.round(parsed)))
}

export function normalizeCourseReminderMinutes(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_COURSE_REMINDER_MINUTES
  }
  return Math.min(120, Math.max(1, Math.round(parsed)))
}

export function normalizeCourseTimeSlots(slots: unknown): TimetableSlot[] {
  if (!Array.isArray(slots)) {
    return defaultTimetableSlots
  }

  const normalized = slots
    .map((slot, index) => {
      const item = slot as Partial<TimetableSlot>
      if (!item.startTime || !item.endTime) {
        return null
      }

      return {
        id: item.id || `slot-${index + 1}`,
        section: item.section || '自定义',
        label: item.label || `第${index + 1}节`,
        startTime: item.startTime,
        endTime: item.endTime,
      }
    })
    .filter((slot): slot is TimetableSlot => Boolean(slot))
    .sort((left, right) => parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime))

  return normalized.length ? normalized : defaultTimetableSlots
}

export function doesCourseAppear(course: Course, weekNumber: number, termWeekCount = 20): boolean {
  if (weekNumber < 1 || weekNumber > normalizeTermWeekCount(termWeekCount)) {
    return false
  }

  if (course.weekStart && weekNumber < course.weekStart) {
    return false
  }

  if (course.weekEnd && weekNumber > course.weekEnd) {
    return false
  }

  if (course.repeatType === 'odd') {
    return weekNumber % 2 === 1
  }

  if (course.repeatType === 'even') {
    return weekNumber % 2 === 0
  }

  return true
}

export function getCoursesForDate(
  courses: Course[],
  date: Date,
  termStartDate: string,
  termWeekCount = 20,
): CourseOccurrence[] {
  const weekNumber = getAcademicWeek(date, termStartDate)
  const weekday = getWeekdayIndex(date)
  return courses
    .filter((course) => course.dayOfWeek === weekday && doesCourseAppear(course, weekNumber, termWeekCount))
    .sort((left, right) => parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime))
    .map((course) => ({
      ...course,
      dateKey: formatDateKey(date),
    }))
}

export function getNextCourse(courses: Course[], now: Date, termStartDate: string, termWeekCount = 20): CourseOccurrence | null {
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(now, offset)
    const dailyCourses = getCoursesForDate(courses, date, termStartDate, termWeekCount)
    const next = dailyCourses.find((course) => combineDateAndTime(date, course.startTime).getTime() > now.getTime())
    if (next) {
      return next
    }
  }

  return null
}

export function getTodayCourseStatus(courses: Course[], now: Date, termStartDate: string, termWeekCount = 20): TodayCourseStatus {
  const todayCourses = getCoursesForDate(courses, now, termStartDate, termWeekCount)
  const currentCourse = todayCourses.find((course) => {
    const start = combineDateAndTime(now, course.startTime).getTime()
    const end = combineDateAndTime(now, course.endTime).getTime()
    return start <= now.getTime() && now.getTime() < end
  }) ?? null
  const nextCourse = todayCourses.find((course) => combineDateAndTime(now, course.startTime).getTime() > now.getTime()) ?? null
  const completedCourses = todayCourses.filter((course) => combineDateAndTime(now, course.endTime).getTime() <= now.getTime())
  const remainingCourses = todayCourses.filter((course) => combineDateAndTime(now, course.endTime).getTime() > now.getTime())

  return {
    currentCourse,
    nextCourse,
    completedCourses,
    remainingCourses,
  }
}

export function getCourseReminderCandidates(
  courses: Course[],
  now: Date,
  termStartDate: string,
  termWeekCount = 20,
  reminderMinutes = DEFAULT_COURSE_REMINDER_MINUTES,
): CourseOccurrence[] {
  const reminderWindowMs = normalizeCourseReminderMinutes(reminderMinutes) * 60 * 1000
  const nowTime = now.getTime()
  return getCoursesForDate(courses, now, termStartDate, termWeekCount)
    .filter((course) => {
      const startTime = combineDateAndTime(now, course.startTime).getTime()
      const untilStart = startTime - nowTime
      return untilStart > 0 && untilStart <= reminderWindowMs
    })
}

export function getCourseReminderKey(course: CourseOccurrence): string {
  return `${course.dateKey}:${course.id}:${course.startTime}`
}

export function getWeekCourses(
  courses: Course[],
  anchorDate: Date,
  termStartDate: string,
  termWeekCount = 20,
): Map<number, Course[]> {
  const weekStart = getWeekStart(anchorDate)
  const weekCourses = new Map<number, Course[]>()

  for (let day = 1; day <= 7; day += 1) {
    const date = addDays(weekStart, day - 1)
    weekCourses.set(
      day,
      getCoursesForDate(courses, date, termStartDate, termWeekCount).sort((left, right) => compareAsc(
        combineDateAndTime(date, left.startTime),
        combineDateAndTime(date, right.startTime),
      )),
    )
  }

  return weekCourses
}

export function getCourseDurationMinutes(course: Course): number {
  return parseTimeToMinutes(course.endTime) - parseTimeToMinutes(course.startTime)
}
