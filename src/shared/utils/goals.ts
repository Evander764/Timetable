import type { LongTermGoal } from '@shared/types/app'

export function advanceGoalStage(goal: LongTermGoal): LongTermGoal {
  const activeIndex = goal.stages.findIndex((stage) => stage.status === 'active')
  if (activeIndex === -1) {
    return goal
  }

  const stages = goal.stages.map((stage, index) => {
    if (index < activeIndex) {
      return { ...stage, status: 'completed' as const }
    }
    if (index === activeIndex) {
      return { ...stage, status: 'completed' as const, endDate: stage.endDate ?? new Date().toISOString() }
    }
    if (index === activeIndex + 1) {
      return { ...stage, status: 'active' as const, startDate: stage.startDate ?? new Date().toISOString() }
    }
    return { ...stage, status: 'pending' as const }
  })

  const nextActive = stages.find((stage) => stage.status === 'active')
  return {
    ...goal,
    status: nextActive ? goal.status : 'completed',
    currentStageId: nextActive?.id,
    progress: nextActive ? goal.progress : 100,
    stages,
  }
}

export function getActiveGoalCount(goals: LongTermGoal[]): number {
  return goals.filter((goal) => goal.status === 'active').length
}
