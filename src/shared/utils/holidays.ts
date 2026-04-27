import { isHoliday, isWorkday } from 'chinese-days'

export function isHolidayDate(date: Date): boolean {
  return isHoliday(date)
}

export function isWorkdayDate(date: Date): boolean {
  return isWorkday(date)
}
