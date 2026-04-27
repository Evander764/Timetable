import { useEffect, useState } from 'react'
import type { AppData } from '@shared/types/app'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'
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

  return (
    <OverlayFrame title="倒计时卡片" dragLocked={data.desktopSettings.dragLocked}>
      <div className="text-center">
        <div className="text-[15px] text-slate-500">今日剩余时间</div>
        <div className="mt-4 text-[54px] font-semibold tracking-tight text-[var(--color-primary)]">{getRemainingTimeToday(now)}</div>
      </div>
      {!minimized ? (
        <div className="mt-6">
          <div className="text-[15px] text-slate-500">任务完成情况</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[15px] text-slate-500">总任务</div>
              <div className="mt-1 text-[32px] font-semibold text-slate-900">{breakdown.total}</div>
            </div>
            <div>
              <div className="text-[15px] text-slate-500">已完成</div>
              <div className="mt-1 text-[32px] font-semibold text-emerald-600">{breakdown.completed}</div>
            </div>
            <div>
              <div className="text-[15px] text-slate-500">待完成</div>
              <div className="mt-1 text-[32px] font-semibold text-slate-900">{breakdown.pending}</div>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={completionRate} className="h-3 bg-white/60" />
          </div>
          <div className="mt-2 text-right text-sm text-slate-500">{completionRate}%</div>
        </div>
      ) : null}
    </OverlayFrame>
  )
}
