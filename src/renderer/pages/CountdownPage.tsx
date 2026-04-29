import { useEffect, useState, type ReactNode } from 'react'
import { Clock3, Eye, Pin, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { CountdownStrip } from '@renderer/components/CountdownStrip'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { PositionPicker } from '@renderer/components/PositionPicker'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { CountdownItem } from '@shared/types/app'
import { getCountdownDisplay, getCountdownItemDisplay, sortCountdownItems } from '@shared/utils/countdown'
import { createId } from '@shared/utils/id'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'
import { getWidgetScalePercent, resizeWidgetByScale, WIDGET_SIZE_BASES } from '@shared/utils/widgets'

const DEFAULT_COLOR = '#2563EB'

type CountdownDraft = {
  id: string
  title: string
  date: string
  time: string
  note: string
  color: string
  createdAt: string
}

function createBlankDraft(): CountdownDraft {
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000)
  target.setSeconds(0, 0)
  return {
    id: createId('countdown'),
    title: '',
    date: toDateInputValue(target),
    time: toTimeInputValue(target),
    note: '',
    color: DEFAULT_COLOR,
    createdAt: new Date().toISOString(),
  }
}

function draftFromItem(item: CountdownItem): CountdownDraft {
  const target = new Date(item.targetAt)
  const safeTarget = Number.isNaN(target.getTime()) ? new Date() : target
  return {
    id: item.id,
    title: item.title,
    date: toDateInputValue(safeTarget),
    time: toTimeInputValue(safeTarget),
    note: item.note ?? '',
    color: item.color ?? DEFAULT_COLOR,
    createdAt: item.createdAt,
  }
}

function itemFromDraft(draft: CountdownDraft): CountdownItem {
  return {
    id: draft.id,
    title: draft.title.trim(),
    targetAt: new Date(`${draft.date}T${draft.time}:00`).toISOString(),
    createdAt: draft.createdAt,
    note: draft.note.trim() || undefined,
    color: draft.color || DEFAULT_COLOR,
  }
}

export function CountdownPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const snapWidgetPosition = useAppStore((state) => state.snapWidgetPosition)
  const [now, setNow] = useState(() => new Date())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CountdownDraft>(createBlankDraft)

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
  const countdownSizeBase = WIDGET_SIZE_BASES.countdown
  const countdownSizePercent = getWidgetScalePercent('countdown', countdownConfig)
  const sortedItems = sortCountdownItems(data.countdownItems)
  const pinnedDisplay = getCountdownDisplay(data.countdownItems, data.countdownCard.pinnedItemId, now)
  const shouldPinNewCountdown = !data.countdownCard.pinnedItemId

  async function saveCountdownItem() {
    const item = itemFromDraft(draft)
    await updateData({ type: 'countdownItem/upsert', payload: item }, selectedItemId ? 'Countdown updated.' : 'Countdown created.')
    if (shouldPinNewCountdown) {
      await updateData({ type: 'countdownItem/pin', payload: { id: item.id } })
    }
    setSelectedItemId(item.id)
  }

  async function deleteCountdownItem() {
    if (!selectedItemId) {
      setDraft(createBlankDraft())
      return
    }

    if (!window.confirm('Delete this countdown?')) {
      return
    }

    await updateData({ type: 'countdownItem/delete', payload: { id: selectedItemId } }, 'Countdown deleted.')
    setSelectedItemId(null)
    setDraft(createBlankDraft())
  }

  async function pinCountdownItem(id: string | null) {
    await updateData({ type: 'countdownItem/pin', payload: { id } }, id ? 'Shown on desktop.' : 'Desktop countdown cleared.')
  }

  function resetDraft() {
    setSelectedItemId(null)
    setDraft(createBlankDraft())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Countdowns"
        subtitle="Create custom countdowns and choose one to show on the desktop countdown strip."
        actions={
          <Button variant="primary" onClick={resetDraft}>
            <Plus size={18} />
            New countdown
          </Button>
        }
      />

      <div className="grid grid-cols-[430px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,255,0.85))]">
            <div className="absolute right-6 top-6 rounded-full bg-blue-50 p-3 text-blue-600">
              <Clock3 size={24} />
            </div>
            <div className="text-[26px] font-semibold tracking-tight text-slate-900">Desktop preview</div>
            {pinnedDisplay ? (
              <CountdownStrip
                className="mt-7 h-12 rounded-xl border border-slate-200/80 bg-white/88 shadow-sm"
                icon={<Clock3 size={16} />}
                label={pinnedDisplay.label}
                value={pinnedDisplay.value}
                meta={pinnedDisplay.meta}
                iconClassName="bg-blue-50"
                valueClassName={pinnedDisplay.expired ? 'text-rose-600' : undefined}
              />
            ) : (
              <CountdownStrip
                className="mt-7 h-12 rounded-xl border border-slate-200/80 bg-white/88 shadow-sm"
                icon={<Clock3 size={16} />}
                label="Today"
                value={getRemainingTimeToday(now)}
                meta={`${completionRate}% - ${breakdown.completed}/${breakdown.total} tasks`}
                iconClassName="bg-blue-50"
              />
            )}
            <div className="mt-6">
              <div className="text-sm text-slate-500">Task completion</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatCell label="Total" value={`${breakdown.total}`} />
                <StatCell label="Done" value={`${breakdown.completed}`} valueClassName="text-emerald-600" />
                <StatCell label="Open" value={`${breakdown.pending}`} />
              </div>
              <div className="mt-4">
                <ProgressBar value={completionRate} />
              </div>
              <div className="mt-2 text-right text-sm text-slate-500">{completionRate}%</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[26px] font-semibold tracking-tight text-slate-900">Countdown list</div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">{sortedItems.length}</span>
            </div>
            <div className="mt-5 space-y-3">
              {sortedItems.length ? (
                sortedItems.map((item) => {
                  const display = getCountdownItemDisplay(item, now)
                  const pinned = data.countdownCard.pinnedItemId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full rounded-[22px] border p-4 text-left transition ${
                        selectedItemId === item.id ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200/80 bg-white/88'
                      }`}
                      onClick={() => {
                        setSelectedItemId(item.id)
                        setDraft(draftFromItem(item))
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xl font-semibold tracking-tight text-slate-900">{item.title}</div>
                          <div className="mt-1 text-sm text-slate-500">{display.meta}</div>
                        </div>
                        {pinned ? <Pin size={18} className="shrink-0 text-blue-600" /> : null}
                      </div>
                      <div className={`mt-3 text-3xl font-semibold ${display.expired ? 'text-rose-600' : 'text-[var(--color-primary)]'}`}>
                        {display.value}
                      </div>
                    </button>
                  )
                })
              ) : (
                <EmptyState
                  title="No custom countdowns"
                  description="Create a countdown for an exam, deadline, event, or milestone."
                  action={<Button onClick={resetDraft}>Create one</Button>}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Countdown details</div>
                <div className="mt-1 text-[30px] font-semibold tracking-tight text-slate-900">{draft.title || 'Untitled countdown'}</div>
              </div>
              {selectedItemId && data.countdownCard.pinnedItemId === selectedItemId ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">Desktop</span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5">
              <Field label="Title">
                <input
                  className="form-input"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Example: final exam"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Target date">
                  <input
                    className="form-input"
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  />
                </Field>
                <Field label="Target time">
                  <input
                    className="form-input"
                    type="time"
                    value={draft.time}
                    onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="Accent color">
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-2"
                  type="color"
                  value={draft.color}
                  onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                />
              </Field>
              <Field label="Note">
                <textarea
                  className="form-textarea min-h-[110px]"
                  value={draft.note}
                  onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                  placeholder="Optional context for this countdown."
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="flex-1" onClick={resetDraft}>Reset</Button>
              <Button variant="primary" className="flex-1" onClick={() => void saveCountdownItem()} disabled={!draft.title || !draft.date || !draft.time}>
                Save countdown
              </Button>
              <Button variant="danger" onClick={() => void deleteCountdownItem()}>
                <Trash2 size={18} />
              </Button>
            </div>
            <div className="mt-3 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => selectedItemId && void pinCountdownItem(selectedItemId)}
                disabled={!selectedItemId}
              >
                <Pin size={18} />
                Show on desktop
              </Button>
              <Button className="flex-1" onClick={() => void pinCountdownItem(null)} disabled={!data.countdownCard.pinnedItemId}>
                Clear desktop item
              </Button>
            </div>
          </Card>

          <Card>
            <div className="text-[26px] font-semibold tracking-tight text-slate-900">Card behavior</div>
            <div className="mt-5 space-y-4">
              <ToggleRow
                label="Show countdown card"
                description="When disabled, the desktop countdown window is destroyed."
                checked={countdownConfig.enabled}
                onChange={(checked) => {
                  void updateWidget({ key: 'countdown', changes: { enabled: checked } })
                  void updateData({ type: 'countdown/update', payload: { enabled: checked } })
                }}
              />
            </div>
          </Card>

          <Card>
            <div className="text-[26px] font-semibold tracking-tight text-slate-900">Display settings</div>
            <div className="mt-5 space-y-5">
              <SliderRow
                label="Strip size"
                value={countdownSizePercent}
                min={countdownSizeBase.minScale}
                max={countdownSizeBase.maxScale}
                onChange={(value) => {
                  void updateWidget({ key: 'countdown', changes: resizeWidgetByScale('countdown', value) })
                }}
              />
              <SliderRow
                label="Opacity"
                value={Math.round(countdownConfig.opacity * 100)}
                onChange={(value) => {
                  void updateWidget({ key: 'countdown', changes: { opacity: value / 100 } })
                  void updateData({ type: 'countdown/update', payload: { opacity: value / 100 } })
                }}
              />
              <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4 text-sm text-slate-500">
                Window: {Math.round(countdownConfig.x)}, {Math.round(countdownConfig.y)} / {Math.round(countdownConfig.width)} x {Math.round(countdownConfig.height)}
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
                <div className="mb-3 text-lg font-semibold text-slate-900">Preset position</div>
                <PositionPicker
                  value={data.countdownCard.position}
                  onChange={(position) => void snapWidgetPosition({ key: 'countdown', position }, 'Countdown position updated.')}
                />
              </div>
              <Button variant="primary" onClick={() => void window.timeable.showOverlay()}>
                <Eye size={18} />
                Show on desktop
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div>
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min = 20,
  max = 100,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="text-2xl font-semibold text-slate-900">{value}%</div>
      </div>
      <input className="mt-4 w-full accent-[var(--color-primary)]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      {children}
    </label>
  )
}

function toDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function toTimeInputValue(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':')
}
