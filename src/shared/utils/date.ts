import { getLunarDate } from 'chinese-days'
import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parse,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatTimeLabel(date: Date): string {
  return format(date, 'HH:mm')
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function combineDateAndTime(date: Date, time: string): Date {
  return parse(time, 'HH:mm', date)
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekDays(date: Date): Date[] {
  const weekStart = getWeekStart(date)
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

export function getWeekdayIndex(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function getAcademicWeek(date: Date, termStartDate: string): number {
  const termStart = getWeekStart(new Date(termStartDate))
  return Math.max(1, differenceInCalendarWeeks(getWeekStart(date), termStart, { weekStartsOn: 1 }) + 1)
}

export function isDateWithinRange(date: Date, startDate?: string, endDate?: string): boolean {
  const current = startOfDay(date)
  if (startDate) {
    const start = startOfDay(new Date(startDate))
    if (isBefore(current, start)) {
      return false
    }
  }

  if (endDate) {
    const end = startOfDay(new Date(endDate))
    if (isAfter(current, end)) {
      return false
    }
  }

  return true
}

export function getDateDiffInDays(from: Date, to: Date): number {
  return differenceInCalendarDays(startOfDay(to), startOfDay(from))
}

export function getChineseWeekdayLabel(date: Date): string {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
}

export function getCompactChineseDate(date: Date): string {
  return format(date, 'yyyy年M月d日')
}

export function getMonthDayLabel(date: Date): string {
  return format(date, 'MM/dd')
}

export function getLunarLabel(date: Date): string {
  const lunar = getLunarDate(date)
  return `${lunar.zodiac}年 ${lunar.lunarMonCN}${lunar.lunarDayCN}`
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return isSameDay(left, right)
}
