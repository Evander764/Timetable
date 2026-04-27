import { describe, expect, it } from 'vitest'
import type { Course } from '@shared/types/app'
import { doesCourseAppear, getCoursesForDate, getNextCourse } from './course'

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
})
