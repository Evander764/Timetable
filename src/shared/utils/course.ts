import { addDays, compareAsc } from 'date-fns'
import type { Course } from '@shared/types/app'
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

export function doesCourseAppear(course: Course, weekNumber: number): boolean {
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

export function getCoursesForDate(courses: Course[], date: Date, termStartDate: string): CourseOccurrence[] {
  const weekNumber = getAcademicWeek(date, termStartDate)
  const weekday = getWeekdayIndex(date)
  return courses
    .filter((course) => course.dayOfWeek === weekday && doesCourseAppear(course, weekNumber))
    .sort((left, right) => parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime))
    .map((course) => ({
      ...course,
      dateKey: formatDateKey(date),
    }))
}

export function getNextCourse(courses: Course[], now: Date, termStartDate: string): CourseOccurrence | null {
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(now, offset)
    const dailyCourses = getCoursesForDate(courses, date, termStartDate)
    const next = dailyCourses.find((course) => combineDateAndTime(date, course.startTime).getTime() > now.getTime())
    if (next) {
      return next
    }
  }

  return null
}

export function getWeekCourses(courses: Course[], anchorDate: Date, termStartDate: string): Map<number, Course[]> {
  const weekStart = getWeekStart(anchorDate)
  const weekCourses = new Map<number, Course[]>()

  for (let day = 1; day <= 7; day += 1) {
    const date = addDays(weekStart, day - 1)
    weekCourses.set(
      day,
      getCoursesForDate(courses, date, termStartDate).sort((left, right) => compareAsc(
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
