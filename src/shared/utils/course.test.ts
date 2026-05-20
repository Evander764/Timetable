import { describe, expect, it } from 'vitest'
import type { Course } from '@shared/types/app'
import { doesCourseAppear, getCourseReminderCandidates, getCoursesForDate, getNextCourse, normalizeCourseReminderMinutes } from './course'

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

describe('course utils', () => {
  it('respects odd/even and week range', () => {
    expect(doesCourseAppear({ ...course, repeatType: 'odd' }, 3)).toBe(true)
    expect(doesCourseAppear({ ...course, repeatType: 'odd' }, 4)).toBe(false)
    expect(doesCourseAppear({ ...course, repeatType: 'even' }, 4)).toBe(true)
    expect(doesCourseAppear({ ...course, weekStart: 5 }, 4)).toBe(false)
    expect(doesCourseAppear({ ...course, weekEnd: 7 }, 8)).toBe(false)
  })

  it('finds courses for a day and falls through to the next upcoming course', () => {
    const termStartDate = '2026-03-02'
    const tuesday = new Date('2026-03-10T07:30:00')
    const thursday = new Date('2026-03-12T09:50:00')
    const courses: Course[] = [
      course,
      { ...course, id: 'course-2', name: '操作系统', dayOfWeek: 4, startTime: '10:00', endTime: '11:40' },
    ]

    expect(getCoursesForDate(courses, tuesday, termStartDate)).toHaveLength(1)
    expect(getNextCourse(courses, thursday, termStartDate)?.name).toBe('操作系统')
  })
  it('normalizes course reminder lead time', () => {
    expect(normalizeCourseReminderMinutes(undefined)).toBe(15)
    expect(normalizeCourseReminderMinutes(0)).toBe(1)
    expect(normalizeCourseReminderMinutes(121)).toBe(120)
    expect(normalizeCourseReminderMinutes(5.4)).toBe(5)
  })

  it('finds reminder candidates only before valid current-day courses', () => {
    const termStartDate = '2026-03-02'
    const now = new Date('2026-03-10T07:46:00')
    const courses: Course[] = [
      course,
      { ...course, id: 'course-2', startTime: '08:30', endTime: '09:10' },
      { ...course, id: 'course-3', repeatType: 'odd' },
    ]

    const candidates = getCourseReminderCandidates(courses, now, termStartDate, 20, 15)
    expect(candidates.map((item) => item.id)).toEqual(['course-1'])
    expect(getCourseReminderCandidates(courses, new Date('2026-03-10T08:00:00'), termStartDate, 20, 15)).toHaveLength(0)
    expect(getCourseReminderCandidates(courses, now, termStartDate, 1, 15)).toHaveLength(0)
  })
})
