import { describe, expect, it } from 'vitest'
import type { LongTermGoal } from '@shared/types/app'
import { advanceGoalStage } from './goals'

describe('goal utils', () => {
  it('advances active stage and completes the goal when stages end', () => {
    const goal: LongTermGoal = {
      id: 'goal-1',
      title: '作品集',
      status: 'active',
      progress: 60,
      currentStageId: 'stage-2',
      stages: [
        { id: 'stage-1', title: '梳理结构', status: 'completed' },
        { id: 'stage-2', title: '实现页面', status: 'active' },
        { id: 'stage-3', title: '内容填充', status: 'pending' },
      ],
      subtasks: [],
      createdAt: '2026-04-24T00:00:00.000Z',
    }

    const next = advanceGoalStage(goal)
    expect(next.stages[1].status).toBe('completed')
    expect(next.stages[2].status).toBe('active')
    expect(next.currentStageId).toBe('stage-3')

    const final = advanceGoalStage({
      ...goal,
      currentStageId: 'stage-3',
      stages: [
        { id: 'stage-1', title: '梳理结构', status: 'completed' },
        { id: 'stage-2', title: '实现页面', status: 'completed' },
        { id: 'stage-3', title: '内容填充', status: 'active' },
      ],
    })
    expect(final.status).toBe('completed')
    expect(final.progress).toBe(100)
  })
})
