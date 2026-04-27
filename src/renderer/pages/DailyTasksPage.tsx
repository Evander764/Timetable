import type { ReactNode } from 'react'
import { useState } from 'react'
import { CalendarDays, Flame, PencilLine, Plus } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { MetricRing } from '@renderer/components/MetricRing'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { useAppStore } from '@renderer/store/appStore'
import type { DailyTask } from '@shared/types/app'
import { createId } from '@shared/utils/id'
import { formatDateKey, getMonthDayLabel } from '@shared/utils/date'
import {
  estimateRemainingMinutes,
  getCompletionRate,
  getDayProgressBreakdown,
  getTaskHeatmap,
  getTaskStreak,
  getTasksForDate,
} from '@shared/utils/tasks'

function createBlankTask(today: Date): DailyTask {
  return {
    id: createId('task'),
    title: '',
    repeatRule: 'daily',
    dueTime: '18:00',
    priority: 'medium',
    completions: {},
    createdAt: today.toISOString(),
    startDate: formatDateKey(today),
  }
}

export function DailyTasksPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const [filter, setFilter] = useState<'all' | DailyTask['repeatRule']>('all')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DailyTask>(() => createBlankTask(new Date()))

  if (!data) {
    return <LoadingState />
  }

  const today = new Date()
  const dateKey = formatDateKey(today)
  const todayTasks = getTasksForDate(data.dailyTasks, today)
  const visibleTasks = filter === 'all' ? todayTasks : todayTasks.filter((task) => task.repeatRule === filter)
  const completionRate = getCompletionRate(data.dailyTasks, today)
  const breakdown = getDayProgressBreakdown(data.dailyTasks, today)
  const streak = getTaskStreak(data.dailyTasks, today)
  const remainingMinutes = estimateRemainingMinutes(data.dailyTasks, today)
  const heatmap = getTaskHeatmap(data.dailyTasks, today)

  async function saveTask() {
    await updateData({ type: 'task/upsert', payload: draft }, editingTaskId ? '任务已更新。' : '任务已创建。')
    setEditingTaskId(draft.id)
  }

  async function toggleTask(task: DailyTask, completed: boolean) {
    await updateData({ type: 'task/toggle', payload: { id: task.id, date: dateKey, completed } })
  }

  async function deleteTask() {
    if (!editingTaskId) {
      setDraft(createBlankTask(today))
      return
    }

    await updateData({ type: 'task/delete', payload: { id: editingTaskId } }, '任务已删除。')
    setEditingTaskId(null)
    setDraft(createBlankTask(today))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="每日任务管理"
        subtitle="管理日常重复任务，培养稳定的节奏与长期习惯。"
        actions={
          <>
            <Button variant="primary" onClick={() => {
              setEditingTaskId(null)
              setDraft(createBlankTask(today))
            }}>
              <Plus size={18} />
              新建任务
            </Button>
            <Button>
              <PencilLine size={18} />
              批量编辑
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[1.2fr_1.4fr_1.1fr] gap-4">
        <Card className="flex items-center gap-5">
          <MetricRing value={completionRate} label="今日完成率" />
          <div>
            <div className="text-sm text-slate-500">已完成 / 总数</div>
            <div className="mt-2 text-5xl font-semibold text-slate-900">
              {breakdown.completed}
              <span className="text-2xl text-slate-400"> / {breakdown.total}</span>
            </div>
            <div className="mt-2 text-sm text-emerald-600">较昨日稳定推进</div>
          </div>
        </Card>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">连续打卡</div>
            <div className="mt-2 text-6xl font-semibold text-slate-900">{streak}</div>
            <div className="mt-2 text-base text-slate-500">最长连续：{streak} 天</div>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-orange-50 text-5xl">🔥</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">今日预计完成时间</div>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={28} />
            </div>
            <div className="text-4xl font-semibold text-slate-900">约 {remainingMinutes} 分钟</div>
          </div>
          <div className="mt-3 text-base text-slate-500">剩余待完成：{breakdown.pending} 项</div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.35fr_300px_320px] gap-4">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[30px] font-semibold tracking-tight text-slate-900">今日任务（{visibleTasks.length}）</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', '全部'],
                ['once', '单次'],
                ['daily', '每天'],
                ['weekly', '每周指定日'],
                ['workday', '工作日'],
                ['holiday', '节假日'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium ${filter === value ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  onClick={() => setFilter(value as typeof filter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/85">
            <div className="grid grid-cols-[46px_1.4fr_0.7fr_0.7fr_0.8fr_48px] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span />
              <span>任务名称</span>
              <span>状态</span>
              <span>截止时间</span>
              <span>重复规则</span>
              <span />
            </div>
            <div className="divide-y divide-slate-100">
              {visibleTasks.length ? (
                visibleTasks.map((task) => {
                  const completed = Boolean(task.completions[dateKey])
                  return (
                    <div key={task.id} className="grid grid-cols-[46px_1.4fr_0.7fr_0.7fr_0.8fr_48px] items-center gap-3 px-4 py-4">
                      <button
                        type="button"
                        className={`h-7 w-7 rounded-lg border ${completed ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}
                        onClick={() => void toggleTask(task, !completed)}
                      >
                        ✓
                      </button>
                      <div>
                        <div className="text-xl font-semibold text-slate-900">{task.title}</div>
                        {task.note ? <div className="mt-1 text-sm text-slate-500">{task.note}</div> : null}
                      </div>
                      <span className={completed ? 'text-emerald-600' : 'text-amber-500'}>{completed ? '已完成' : '待完成'}</span>
                      <span className="text-slate-600">{task.dueTime ?? '--:--'}</span>
                      <span className="text-slate-600">{repeatRuleLabel(task.repeatRule)}</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-blue-600"
                        onClick={() => {
                          setEditingTaskId(task.id)
                          setDraft(task)
                        }}
                      >
                        <PencilLine size={18} />
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="p-6">
                  <EmptyState title="今天没有符合条件的任务" description="切换筛选条件，或者创建一个新的每日任务。" />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[28px] font-semibold tracking-tight text-slate-900">编辑任务</div>
          <div className="mt-5 space-y-4">
            <Field label="任务名称">
              <input className="form-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：运动 30 分钟" />
            </Field>
            <Field label="重复规则">
              <select className="form-select" value={draft.repeatRule} onChange={(event) => setDraft({ ...draft, repeatRule: event.target.value as DailyTask['repeatRule'] })}>
                <option value="once">单次</option>
                <option value="daily">每天</option>
                <option value="weekly">每周指定日</option>
                <option value="workday">工作日</option>
                <option value="holiday">节假日</option>
              </select>
            </Field>
            {draft.repeatRule === 'weekly' ? (
              <Field label="每周重复日">
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const checked = draft.weeklyDays?.includes(day) ?? false
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`rounded-2xl border px-3 py-2 text-sm ${checked ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-600'}`}
                        onClick={() => {
                          const days = new Set(draft.weeklyDays ?? [])
                          if (days.has(day)) {
                            days.delete(day)
                          } else {
                            days.add(day)
                          }
                          setDraft({ ...draft, weeklyDays: [...days].sort() })
                        }}
                      >
                        {['一', '二', '三', '四', '五', '六', '日'][day - 1]}
                      </button>
                    )
                  })}
                </div>
              </Field>
            ) : null}
            <Field label="提醒时间">
              <input className="form-input" type="time" value={draft.dueTime ?? ''} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} />
            </Field>
            <Field label="开始日期">
              <input className="form-input" type="date" value={draft.startDate ?? ''} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
            </Field>
            <Field label="结束日期">
              <input className="form-input" type="date" value={draft.endDate ?? ''} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
            </Field>
            <Field label="优先级">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['low', '低'],
                  ['medium', '中'],
                  ['high', '高'],
                ].map(([priority, label]) => (
                  <button
                    key={priority}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-sm ${draft.priority === priority ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-slate-200 bg-white text-slate-600'}`}
                    onClick={() => setDraft({ ...draft, priority: priority as DailyTask['priority'] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="备注">
              <textarea className="form-textarea" value={draft.note ?? ''} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="可选，添加备注信息..." />
            </Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={() => {
              setEditingTaskId(null)
              setDraft(createBlankTask(today))
            }}>
              取消
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => void saveTask()} disabled={!draft.title}>
              保存
            </Button>
          </div>
          <Button variant="danger" className="mt-3 w-full" onClick={() => void deleteTask()}>
            删除当前任务
          </Button>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-[28px] font-semibold tracking-tight text-slate-900">今日完成情况</div>
              <Flame className="text-orange-500" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <MetricRing value={completionRate} size={108} />
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> 已完成 {breakdown.completed}</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> 待完成 {breakdown.pending}</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-300" /> 总数 {breakdown.total}</div>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={completionRate} accentClassName="bg-emerald-500" />
            </div>
          </Card>

          <Card>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">连续打卡记录</div>
            <div className="mt-4 text-6xl font-semibold text-slate-900">{streak}</div>
            <div className="mt-2 text-base text-slate-500">当前连续</div>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              <div className="rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">最长连续 {streak} 天</div>
              <div className="rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">保持节奏，明天继续打卡。</div>
            </div>
          </Card>

          <Card>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">本周完成热力图</div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {heatmap.map((entry) => (
                <div key={entry.dateKey} className="text-center">
                  <div className="mb-2 text-xs text-slate-400">{getMonthDayLabel(new Date(entry.dateKey))}</div>
                  <div
                    className="mx-auto h-6 w-6 rounded-full border border-white/70"
                    style={{
                      background:
                        entry.rate >= 100
                          ? '#18B059'
                          : entry.rate > 0
                            ? '#F6A035'
                            : '#F1F5F9',
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      {children}
    </label>
  )
}

function repeatRuleLabel(rule: DailyTask['repeatRule']): string {
  if (rule === 'once') return '单次'
  if (rule === 'daily') return '每天'
  if (rule === 'weekly') return '每周指定日'
  if (rule === 'workday') return '工作日'
  return '节假日'
}
