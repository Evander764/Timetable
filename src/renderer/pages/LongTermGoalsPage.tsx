import type { ReactNode } from 'react'
import { useState } from 'react'
import { ArrowRight, Plus, RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { useAppStore } from '@renderer/store/appStore'
import type { GoalStage, GoalSubtask, LongTermGoal } from '@shared/types/app'
import { createId } from '@shared/utils/id'

function createBlankGoal(): LongTermGoal {
  const stageId = createId('stage')
  return {
    id: createId('goal'),
    title: '',
    status: 'active',
    progress: 0,
    targetDate: '',
    currentStageId: stageId,
    stages: [{ id: stageId, title: '阶段一', status: 'active' }],
    subtasks: [{ id: createId('subtask'), title: '子任务 1', completed: false, progress: 0, total: 1 }],
    note: '',
    createdAt: new Date().toISOString(),
  }
}

export function LongTermGoalsPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [draft, setDraft] = useState<LongTermGoal>(createBlankGoal)

  if (!data) {
    return <LoadingState />
  }

  const activeMemos = data.memos.filter((memo) => memo.status === 'active')
  const completedMemos = data.memos.filter((memo) => memo.status === 'ended')

  async function saveGoal() {
    await updateData({ type: 'goal/upsert', payload: draft }, selectedGoalId ? '目标已更新。' : '目标已创建。')
    setSelectedGoalId(draft.id)
  }

  async function deleteGoal() {
    if (!selectedGoalId) {
      setDraft(createBlankGoal())
      return
    }
    await updateData({ type: 'goal/delete', payload: { id: selectedGoalId } }, '目标已删除。')
    setSelectedGoalId(null)
    setDraft(createBlankGoal())
  }

  async function advanceStage() {
    if (!selectedGoalId) {
      return
    }
    await updateData({ type: 'goal/advance', payload: { id: selectedGoalId } }, '已推进到下一阶段。')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="长期任务管理"
        subtitle="制定目标、拆解阶段、持续推进，让长期成长变得清晰可执行。"
        actions={
          <>
            <Button variant="primary" onClick={() => {
              const blank = createBlankGoal()
              setDraft(blank)
              setSelectedGoalId(null)
            }}>
              <Plus size={18} />
              新建目标
            </Button>
            <Button onClick={() => void advanceStage()}>
              <RotateCw size={18} />
              更新进度
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[320px_1.25fr_330px] gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">目标列表</div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">{data.longTermGoals.length}</span>
          </div>
          <div className="mt-5 space-y-3">
            {data.longTermGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                    className={`w-full rounded-[24px] border p-4 text-left transition ${selectedGoalId === goal.id ? 'border-blue-300 bg-blue-50/80 shadow-[0_18px_35px_rgba(47,116,255,0.14)]' : 'border-slate-200/80 bg-white/88'}`}
                onClick={() => {
                  setSelectedGoalId(goal.id)
                  setDraft(goal)
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-900">{goal.title}</div>
                  <span className={`rounded-full px-3 py-1 text-sm ${goal.status === 'active' ? 'bg-emerald-50 text-emerald-600' : goal.status === 'paused' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                    {goal.status === 'active' ? '进行中' : goal.status === 'paused' ? '暂停' : '已完成'}
                  </span>
                </div>
                <div className="mt-4">
                  <ProgressBar value={goal.progress} accentClassName="bg-emerald-500" />
                </div>
                <div className="mt-3 text-sm text-slate-500">目标日期：{goal.targetDate || '未设置'} 剩余 {goal.subtasks.length} 个子任务</div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-4xl font-semibold tracking-tight text-slate-900">{draft.title || '未命名目标'}</div>
              <div className="mt-2 text-base text-slate-500">目标日期：{draft.targetDate || '未设置'} 当前阶段：{draft.stages.find((stage) => stage.status === 'active')?.title ?? '未开始'}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm ${draft.status === 'active' ? 'bg-emerald-50 text-emerald-600' : draft.status === 'paused' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
              {draft.status === 'active' ? '进行中' : draft.status === 'paused' ? '暂停' : '已完成'}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="目标名称">
              <input className="form-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：考研备战（数据结构方向）" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="目标状态">
                <select className="form-select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LongTermGoal['status'] })}>
                  <option value="active">进行中</option>
                  <option value="paused">暂停</option>
                  <option value="completed">已完成</option>
                </select>
              </Field>
              <Field label="目标日期">
                <input className="form-input" type="date" value={draft.targetDate ?? ''} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} />
              </Field>
            </div>
            <Field label={`整体进度 ${draft.progress}%`}>
              <input className="w-full accent-[var(--color-primary)]" type="range" min={0} max={100} value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} />
            </Field>

            <div>
              <div className="mb-3 text-sm font-medium text-slate-500">阶段进度</div>
              <div className="grid grid-cols-4 gap-3">
                {draft.stages.map((stage, index) => (
                  <div key={stage.id} className={`rounded-[24px] border p-4 text-center ${stage.status === 'active' ? 'border-blue-300 bg-blue-50/80' : stage.status === 'completed' ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/70'}`}>
                    <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-lg font-semibold ${stage.status === 'active' ? 'bg-blue-500 text-white' : stage.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>
                      {index + 1}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-slate-900">{stage.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{stageStatusLabel(stage.status)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => void advanceStage()}>
                推进到下一阶段
                <ArrowRight size={18} />
              </Button>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">阶段列表</div>
                <Button size="sm" onClick={() => setDraft({ ...draft, stages: [...draft.stages, createStage(draft.stages.length + 1)] })}>
                  <Plus size={16} />
                  添加阶段
                </Button>
              </div>
              <div className="space-y-3">
                {draft.stages.map((stage) => (
                  <div key={stage.id} className="rounded-[20px] border border-slate-200/80 bg-white/88 p-4">
                    <div className="grid grid-cols-[1fr_120px_44px] gap-3">
                      <input className="form-input" value={stage.title} onChange={(event) => updateStage(stage.id, { title: event.target.value })} />
                      <select className="form-select" value={stage.status} onChange={(event) => updateStage(stage.id, { status: event.target.value as GoalStage['status'] })}>
                        <option value="completed">已完成</option>
                        <option value="active">进行中</option>
                        <option value="pending">待开始</option>
                      </select>
                      <button type="button" className="rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-red-600" onClick={() => removeStage(stage.id)}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">子任务清单</div>
                <Button size="sm" onClick={() => setDraft({ ...draft, subtasks: [...draft.subtasks, createSubtask(draft.subtasks.length + 1)] })}>
                  <Plus size={16} />
                  添加子任务
                </Button>
              </div>
              <div className="space-y-3">
                {draft.subtasks.map((subtask) => (
                  <div key={subtask.id} className="rounded-[20px] border border-slate-200/80 bg-white/88 p-4">
                    <div className="grid grid-cols-[28px_1fr_110px_110px_44px] items-center gap-3">
                      <input type="checkbox" checked={subtask.completed} onChange={(event) => updateSubtask(subtask.id, { completed: event.target.checked })} />
                      <input className="form-input" value={subtask.title} onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })} />
                      <input className="form-input" type="number" min={0} value={subtask.progress ?? 0} onChange={(event) => updateSubtask(subtask.id, { progress: Number(event.target.value) })} />
                      <input className="form-input" type="number" min={1} value={subtask.total ?? 1} onChange={(event) => updateSubtask(subtask.id, { total: Number(event.target.value) })} />
                      <button type="button" className="rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-red-600" onClick={() => removeSubtask(subtask.id)}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Field label="目标备注">
              <textarea className="form-textarea" value={draft.note ?? ''} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </Field>
          </div>

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={() => setDraft(createBlankGoal())}>重置</Button>
            <Button variant="primary" className="flex-1" onClick={() => void saveGoal()} disabled={!draft.title}>保存目标</Button>
            <Button variant="danger" onClick={() => void deleteGoal()}>
              <Trash2 size={18} />
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-[28px] font-semibold tracking-tight text-slate-900">备忘录</div>
              <Button size="sm">新建备忘</Button>
            </div>
            <div className="mt-5">
              <div className="text-sm font-medium text-blue-600">进行中（{activeMemos.length}）</div>
              <div className="mt-3 space-y-3">
                {activeMemos.length ? (
                  activeMemos.map((memo) => (
                    <div key={memo.id} className="rounded-[20px] border border-amber-200/80 bg-amber-50/85 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xl font-semibold text-slate-900">{memo.title}</div>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-amber-700">{memo.showOnDesktop ? '显示中' : '未展示'}</span>
                      </div>
                      <div className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{memo.content}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="暂无进行中备忘" description="去备忘录页面添加一些正在推进的笔记。" />
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">已结束</div>
            <div className="mt-4 space-y-3">
              {completedMemos.length ? (
                completedMemos.map((memo) => (
                  <div key={memo.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 text-slate-500">
                    <div className="text-xl font-semibold">{memo.title}</div>
                    <div className="mt-2 text-sm">{memo.endedAt ? `结束于 ${new Date(memo.endedAt).toLocaleString()}` : '已结束，不再展示'}</div>
                  </div>
                ))
              ) : (
                <EmptyState title="暂无已结束备忘" description="完成的内容会在这里归档显示。" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )

  function updateStage(id: string, changes: Partial<GoalStage>) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.id === id ? { ...stage, ...changes } : stage)),
    }))
  }

  function removeStage(id: string) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.filter((stage) => stage.id !== id),
    }))
  }

  function updateSubtask(id: string, changes: Partial<GoalSubtask>) {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...changes } : subtask)),
    }))
  }

  function removeSubtask(id: string) {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.filter((subtask) => subtask.id !== id),
    }))
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      {children}
    </label>
  )
}

function stageStatusLabel(status: GoalStage['status']): string {
  if (status === 'completed') return '已完成'
  if (status === 'active') return '进行中'
  return '待开始'
}

function createStage(index: number): GoalStage {
  return {
    id: createId('stage'),
    title: `阶段 ${index}`,
    status: 'pending',
  }
}

function createSubtask(index: number): GoalSubtask {
  return {
    id: createId('subtask'),
    title: `子任务 ${index}`,
    completed: false,
    progress: 0,
    total: 1,
  }
}
