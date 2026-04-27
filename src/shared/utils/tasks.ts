import { endOfDay, startOfDay, subDays } from 'date-fns'
import type { DailyTask, Priority } from '@shared/types/app'
import { formatDateKey, getWeekdayIndex, isDateWithinRange } from './date'
import { isHolidayDate, isWorkdayDate } from './holidays'

export function shouldTaskAppearOnDate(task: DailyTask, date: Date): boolean {
  if (!isDateWithinRange(date, task.startDate, task.endDate)) {
    return false
  }

  if (task.repeatRule === 'once') {
    return task.startDate ? formatDateKey(new Date(task.startDate)) === formatDateKey(date) : false
  }

  if (task.repeatRule === 'daily') {
    return true
  }

  if (task.repeatRule === 'weekly') {
    return task.weeklyDays?.includes(getWeekdayIndex(date)) ?? false
  }

  if (task.repeatRule === 'workday') {
    return isWorkdayDate(date)
  }

  if (task.repeatRule === 'holiday') {
    return isHolidayDate(date)
  }

  return false
}

export function getTasksForDate(tasks: DailyTask[], date: Date): DailyTask[] {
  return tasks
    .filter((task) => shouldTaskAppearOnDate(task, date))
    .sort((left, right) => {
      if (left.dueTime && right.dueTime) {
        return left.dueTime.localeCompare(right.dueTime)
      }
      if (left.dueTime) {
        return -1
      }
      if (right.dueTime) {
        return 1
      }
      return priorityWeight(right.priority) - priorityWeight(left.priority)
    })
}

export function getCompletedCount(tasks: DailyTask[], date: Date): number {
  const dateKey = formatDateKey(date)
  return getTasksForDate(tasks, date).filter((task) => task.completions[dateKey]).length
}

export function getCompletionRate(tasks: DailyTask[], date: Date): number {
  const visibleTasks = getTasksForDate(tasks, date)
  if (visibleTasks.length === 0) {
    return 0
  }

  return Math.round((visibleTasks.filter((task) => task.completions[formatDateKey(date)]).length / visibleTasks.length) * 100)
}

export function getTaskStreak(tasks: DailyTask[], today: Date): number {
  let streak = 0
  let cursor = startOfDay(today)

  while (true) {
    const visibleTasks = getTasksForDate(tasks, cursor)
    if (visibleTasks.length === 0 || getCompletionRate(tasks, cursor) < 100) {
      return streak
    }

    streak += 1
    cursor = subDays(cursor, 1)
  }
}

export function getTaskHeatmap(tasks: DailyTask[], date: Date): { dateKey: string; rate: number }[] {
  return Array.from({ length: 7 }, (_, index) => {
    const target = subDays(date, 6 - index)
    return {
      dateKey: formatDateKey(target),
      rate: getCompletionRate(tasks, target),
    }
  })
}

export function getRemainingTaskCount(tasks: DailyTask[], date: Date): number {
  return getTasksForDate(tasks, date).filter((task) => !task.completions[formatDateKey(date)]).length
}

export function estimateRemainingMinutes(tasks: DailyTask[], date: Date): number {
  return getTasksForDate(tasks, date)
    .filter((task) => !task.completions[formatDateKey(date)])
    .reduce((total, task) => total + estimateMinutesByPriority(task.priority), 0)
}

export function getDayProgressBreakdown(tasks: DailyTask[], date: Date): {
  total: number
  completed: number
  pending: number
} {
  const visibleTasks = getTasksForDate(tasks, date)
  const completed = visibleTasks.filter((task) => task.completions[formatDateKey(date)]).length
  return {
    total: visibleTasks.length,
    completed,
    pending: visibleTasks.length - completed,
  }
}

export function getRemainingTimeToday(now: Date): string {
  const dayEnd = endOfDay(now)
  const diff = Math.max(0, dayEnd.getTime() - now.getTime())
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

function priorityWeight(priority: Priority): number {
  if (priority === 'high') {
    return 3
  }
  if (priority === 'medium') {
    return 2
  }
  return 1
}

function estimateMinutesByPriority(priority: Priority): number {
  if (priority === 'high') {
    return 25
  }
  if (priority === 'medium') {
    return 15
  }
  return 10
}
