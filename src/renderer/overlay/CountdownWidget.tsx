import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { AppData } from '@shared/types/app'
import { getCountdownEventStatus, getNextCountdownEvent } from '@shared/utils/countdownEvents'
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
  const nextEvent = getNextCountdownEvent(data.countdownEvents, now)
  const nextEventStatus = nextEvent ? getCountdownEventStatus(nextEvent, now) : null

  if (minimized) {
    return (
      <CountdownStrip
        className="glass-card countdown-strip-edge no-drag"
        label={nextEvent ? '最近事件' : '今日剩余'}
        value={nextEventStatus?.remainingLabel ?? getRemainingTimeToday(now)}
        meta={nextEvent ? nextEvent.title : `${completionRate}% · ${breakdown.completed}/${breakdown.total}任务`}
      />
    )
  }

  return (
    <OverlayFrame title="倒计时卡片" widgetKey="countdown" data={data} className="countdown-card-edge">
      {nextEvent && nextEventStatus ? (
        <div className="text-center">
          <div className="text-[15px] text-slate-500">最近事件</div>
          <div className="mt-2 truncate text-[22px] font-semibold text-slate-900">{nextEvent.title}</div>
          <div className="mt-3 text-[46px] font-semibold tracking-tight text-[var(--color-primary)]">{nextEventStatus.remainingLabel}</div>
          <div className="mt-3 truncate text-sm text-slate-500">{nextEventStatus.targetLabel}</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-[15px] text-slate-500">今日剩余时间</div>
          <div className="mt-4 text-[54px] font-semibold tracking-tight text-[var(--color-primary)]">{getRemainingTimeToday(now)}</div>
          <div className="mt-4 text-sm text-slate-500">任务 {breakdown.completed}/{breakdown.total} · 完成率 {completionRate}%</div>
        </div>
      )}
    </OverlayFrame>
  )
}

function CountdownStrip({ className, label, value, meta }: { className?: string; label: string; value: string; meta: string }) {
  return (
    <button
      type="button"
      className={cn('countdown-strip-button flex h-full items-center gap-3 overflow-hidden px-4 py-2', className)}
      onClick={() => void window.timeable.windowControl('show')}
      title="打开主窗口"
    >
      <div className="countdown-strip-drag-handle drag-region grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-blue-600" title="拖动倒计时卡片">
        <Clock3 size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        <div className="truncate text-[20px] font-semibold leading-tight text-slate-900">{value}</div>
      </div>
      <div className="max-w-[142px] shrink-0 truncate rounded-full bg-white/70 px-2.5 py-1 text-xs text-slate-500">{meta}</div>
    </button>
  )
}
