import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, Eye, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { PositionPicker } from '@renderer/components/PositionPicker'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { CountdownEvent } from '@shared/types/app'
import {
  createBlankCountdownEvent,
  getCountdownEventStatus,
  getNextCountdownEvent,
  getSortedCountdownEvents,
  normalizeCountdownEventDraft,
} from '@shared/utils/countdownEvents'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'

export function CountdownPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const snapWidgetPosition = useAppStore((state) => state.snapWidgetPosition)
  const [now, setNow] = useState(() => new Date())
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventDraft, setEventDraft] = useState<CountdownEvent>(() => createBlankCountdownEvent())
  const [eventError, setEventError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!data) {
    return <LoadingState />
  }

  const countdownConfig = data.desktopSettings.widgets.countdown
  const breakdown = getDayProgressBreakdown(data.dailyTasks, now)
  const completionRate = getCompletionRate(data.dailyTasks, now)
  const sortedEvents = getSortedCountdownEvents(data.countdownEvents, now)
  const nextEvent = getNextCountdownEvent(data.countdownEvents, now)
  const nextEventStatus = nextEvent ? getCountdownEventStatus(nextEvent, now) : null
  const canSaveEvent = Boolean(eventDraft.title.trim() && eventDraft.targetDate.trim())
  const fieldError = eventError ?? ((eventDraft.title || eventDraft.note) && !canSaveEvent ? '事件名称和目标日期都不能为空。' : null)

  function startNewEvent() {
    setSelectedEventId(null)
    setEventDraft(createBlankCountdownEvent(now))
    setEventError(null)
  }

  function selectEvent(event: CountdownEvent) {
    setSelectedEventId(event.id)
    setEventDraft(event)
    setEventError(null)
  }

  async function saveEvent() {
    if (!data) {
      return
    }

    const result = normalizeCountdownEventDraft(eventDraft)
    if (!result.event) {
      setEventError(result.error)
      return
    }

    const payload = result.event
    await updateData({ type: 'countdownEvent/upsert', payload }, selectedEventId ? '倒计时事件已更新。' : '倒计时事件已创建。')
    if (!countdownConfig.enabled) {
      await updateWidget({ key: 'countdown', changes: { enabled: true } })
      await updateData({ type: 'countdown/update', payload: { enabled: true } })
    }
    setEventDraft(payload)
    setSelectedEventId(payload.id)
    setEventError(null)
  }

  async function deleteEvent() {
    if (!selectedEventId) {
      startNewEvent()
      return
    }

    await updateData({ type: 'countdownEvent/delete', payload: { id: selectedEventId } }, '倒计时事件已删除。')
    startNewEvent()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="倒计时卡片" subtitle="显示今日剩余时间、任务完成情况，并同步到桌面倒计时挂件。" />

      <div className="grid grid-cols-[460px_1fr] gap-4">
        <Card className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,255,0.85))]">
          <div className="absolute right-6 top-6 rounded-full bg-blue-50 p-3 text-blue-600">
            <Clock3 size={24} />
          </div>
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">倒计时预览</div>
          <div className="mt-8 text-center">
            <div className="text-sm text-slate-500">今日剩余时间</div>
            <div className="mt-4 text-7xl font-semibold tracking-tight text-[var(--color-primary)]">{getRemainingTimeToday(now)}</div>
          </div>
          <div className="mt-8">
            <div className="text-sm text-slate-500">任务完成情况</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatCell label="总任务" value={`${breakdown.total}`} />
              <StatCell label="已完成" value={`${breakdown.completed}`} valueClassName="text-emerald-600" />
              <StatCell label="待完成" value={`${breakdown.pending}`} />
            </div>
            <div className="mt-4">
              <ProgressBar value={completionRate} />
            </div>
            <div className="mt-2 text-right text-sm text-slate-500">{completionRate}%</div>
          </div>
          <div className="mt-5 rounded-[18px] border border-blue-100 bg-blue-50/70 px-4 py-3">
            <div className="text-sm text-blue-600">最近事件</div>
            {nextEvent && nextEventStatus ? (
              <div className="mt-2 min-w-0">
                <div className="truncate text-xl font-semibold text-slate-900">{nextEvent.title}</div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm text-slate-500">
                  <span className="truncate">{nextEventStatus.targetLabel}</span>
                  <span className="shrink-0 font-semibold text-blue-600">{nextEventStatus.remainingLabel}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">暂无未完成事件，桌面卡片将显示今日剩余时间。</div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">卡片行为</div>
            <div className="mt-5 space-y-4">
              <ToggleRow
                label="显示倒计时卡片"
                description="关闭后桌面倒计时窗口会被销毁。"
                checked={countdownConfig.enabled}
                onChange={(checked) => {
                  void updateWidget({ key: 'countdown', changes: { enabled: checked } })
                  void updateData({ type: 'countdown/update', payload: { enabled: checked } })
                }}
              />
              <ToggleRow
                label="最小化状态"
                description="只保留主要信息，减少桌面占位。"
                checked={Boolean(countdownConfig.minimized)}
                onChange={(checked) => {
                  void updateWidget({ key: 'countdown', changes: { minimized: checked } })
                  void updateData({ type: 'countdown/update', payload: { minimized: checked } })
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">显示设置</div>
            <div className="mt-5 space-y-5">
              <SliderRow
                label="透明度"
                value={Math.round(countdownConfig.opacity * 100)}
                onChange={(value) => {
                  void updateWidget({ key: 'countdown', changes: { opacity: value / 100 } })
                  void updateData({ type: 'countdown/update', payload: { opacity: value / 100 } })
                }}
              />
              <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4 text-sm text-slate-500">
                当前窗口位置：{Math.round(countdownConfig.x)}, {Math.round(countdownConfig.y)} 尺寸：{Math.round(countdownConfig.width)} × {Math.round(countdownConfig.height)}
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
                <div className="mb-3 text-lg font-semibold text-slate-900">预设位置</div>
                <PositionPicker
                  value={data.countdownCard.position}
                  onChange={(position) => void snapWidgetPosition({ key: 'countdown', position }, '倒计时卡片位置已更新。')}
                />
              </div>
              <Button variant="primary" onClick={() => void window.timeable.showOverlay()}>
                <Eye size={18} />
                在桌面上查看
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[30px] font-semibold tracking-tight text-slate-900">其他事件</div>
              <div className="mt-1 text-sm text-slate-500">未完成事件优先显示，桌面卡片取最近一项。</div>
            </div>
            <Button size="sm" variant="primary" onClick={startNewEvent}>
              <Plus size={16} />
              新建
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            {sortedEvents.length ? sortedEvents.map((event) => {
              const status = getCountdownEventStatus(event, now)
              return (
                <button
                  key={event.id}
                  type="button"
                  className={`w-full min-w-0 rounded-[18px] border p-4 text-left transition ${selectedEventId === event.id ? 'border-blue-300 bg-blue-50/85' : 'border-slate-200/80 bg-white/88 hover:border-blue-200'}`}
                  onClick={() => selectEvent(event)}
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-lg font-semibold text-slate-900">{event.title}</div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status.expired ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {status.expired ? '已过期' : '未完成'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span className="min-w-0 truncate">{status.targetLabel}</span>
                    <span className="shrink-0 font-medium text-blue-600">{status.remainingLabel}</span>
                  </div>
                </button>
              )
            }) : (
              <EmptyState title="暂无其他事件" description="可以添加考试、项目节点、生日等倒计时。" />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-slate-500">事件详情</div>
              <div className="mt-1 truncate text-3xl font-semibold tracking-tight text-slate-900">{eventDraft.title || '未命名事件'}</div>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={22} />
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <Field label="事件名称">
              <input className="form-input" value={eventDraft.title} onChange={(event) => {
                setEventError(null)
                setEventDraft({ ...eventDraft, title: event.target.value })
              }} placeholder="例如：期末考试" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="目标日期">
                <input className="form-input" type="date" value={eventDraft.targetDate} onChange={(event) => {
                  setEventError(null)
                  setEventDraft({ ...eventDraft, targetDate: event.target.value })
                }} />
              </Field>
              <Field label="目标时间（可选）">
                <input className="form-input" type="time" value={eventDraft.targetTime ?? ''} onChange={(event) => {
                  setEventError(null)
                  setEventDraft({ ...eventDraft, targetTime: event.target.value || undefined })
                }} />
              </Field>
            </div>
            <Field label="颜色">
              <input className="form-input h-12" type="color" value={eventDraft.color ?? '#2563EB'} onChange={(event) => setEventDraft({ ...eventDraft, color: event.target.value })} />
            </Field>
            <Field label="备注">
              <textarea className="form-textarea min-h-[120px]" value={eventDraft.note ?? ''} onChange={(event) => {
                setEventError(null)
                setEventDraft({ ...eventDraft, note: event.target.value })
              }} placeholder="例如：提前 30 分钟到场" />
            </Field>
          </div>

          {fieldError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {fieldError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="flex-1" onClick={startNewEvent}>重置</Button>
            <Button variant="primary" className="flex-1" onClick={() => void saveEvent()} disabled={!canSaveEvent}>保存事件</Button>
            <Button variant="danger" onClick={() => void deleteEvent()}>
              <Trash2 size={18} />
            </Button>
          </div>
        </Card>
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div>
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="text-2xl font-semibold text-slate-900">{value}%</div>
      </div>
      <input className="mt-4 w-full accent-[var(--color-primary)]" type="range" min={20} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function StatCell({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-white/88 px-3 py-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-4xl font-semibold text-slate-900 ${valueClassName ?? ''}`}>{value}</div>
    </div>
  )
}
