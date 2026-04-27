import { useEffect, useState } from 'react'
import { Clock3, Eye } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { PositionPicker } from '@renderer/components/PositionPicker'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'

export function CountdownPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const snapWidgetPosition = useAppStore((state) => state.snapWidgetPosition)
  const [now, setNow] = useState(() => new Date())

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
