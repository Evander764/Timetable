import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { AppData } from '@shared/types/app'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'
import { cn } from '@renderer/utils/cn'
import { OverlayFrame } from './OverlayFrame'

export function CountdownWidget({ data }: { data: AppData }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const breakdown = getDayProgressBreakdown(data.dailyTasks, now)
  const completionRate = getCompletionRate(data.dailyTasks, now)
  const minimized = Boolean(data.desktopSettings.widgets.countdown.minimized)

  if (minimized) {
    return (
      <CountdownStrip
        className="glass-card drag-region"
        label="今日剩余"
        value={getRemainingTimeToday(now)}
        meta={`${completionRate}% · ${breakdown.completed}/${breakdown.total}任务`}
      />
    )
  }

  return (
    <OverlayFrame title="倒计时卡片" widgetKey="countdown" data={data}>
      <div className="text-center">
        <div className="text-[15px] text-slate-500">今日剩余时间</div>
        <div className="mt-4 text-[54px] font-semibold tracking-tight text-[var(--color-primary)]">{getRemainingTimeToday(now)}</div>
        <div className="mt-4 text-sm text-slate-500">任务 {breakdown.completed}/{breakdown.total} · 完成率 {completionRate}%</div>
      </div>
    </OverlayFrame>
  )
}

function CountdownStrip({ className, label, value, meta }: { className?: string; label: string; value: string; meta: string }) {
  return (
    <div className={cn('flex h-full items-center gap-3 overflow-hidden px-4 py-2', className)}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-blue-600">
        <Clock3 size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-[20px] font-semibold leading-tight text-slate-900">{value}</div>
      </div>
      <div className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs text-slate-500">{meta}</div>
    </div>
  )
}
