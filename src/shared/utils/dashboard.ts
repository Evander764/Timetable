import type { AppData, DashboardStats } from '@shared/types/app'
import { getCoursesForDate } from './course'
import { getActiveGoalCount } from './goals'
import { getCompletionRate, getRemainingTaskCount } from './tasks'

export function getDashboardStats(data: AppData, today: Date): DashboardStats {
  return {
    completionRate: getCompletionRate(data.dailyTasks, today),
    pendingTaskCount: getRemainingTaskCount(data.dailyTasks, today),
    todayCourseCount: getCoursesForDate(data.courses, today, data.appSettings.termStartDate, data.appSettings.termWeekCount).length,
    activeGoalCount: getActiveGoalCount(data.longTermGoals),
  }
}
