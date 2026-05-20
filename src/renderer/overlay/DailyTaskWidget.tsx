import type { AppData } from '@shared/types/app'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { getCompletionRate, getTaskStreak, getTasksForDate } from '@shared/utils/tasks'
import { formatDateKey } from '@shared/utils/date'
import { OverlayFrame } from './OverlayFrame'

export function DailyTaskWidget({ data }: { data: AppData }) {
  const today = new Date()
  const tasks = getTasksForDate(data.dailyTasks, today)
  const dateKey = formatDateKey(today)
  const completionRate = getCompletionRate(data.dailyTasks, today)
  const completedCount = tasks.filter((task) => task.completions[dateKey]).length
  const streak = getTaskStreak(data.dailyTasks, today)
  const visibleTasks = tasks.slice(0, 5)
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length)

  return (
    <OverlayFrame title="执行浮窗" dragLocked={data.desktopSettings.dragLocked}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] text-slate-500">今日完成</div>
            <div className="mt-1 text-[32px] font-semibold leading-none text-slate-900">
              {completedCount}/{tasks.length}
            </div>
          </div>
          <div className="text-[32px] font-semibold leading-none text-slate-900">{completionRate}%</div>
        </div>
        <div className="mt-3">
          <ProgressBar value={completionRate} className="h-3 bg-white/60" />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_96px] gap-3 overflow-hidden">
          <div className="min-h-0 space-y-2 overflow-hidden">
            {visibleTasks.map((task) => (
              <div key={task.id} className="flex min-w-0 items-center gap-2.5 text-[15px] leading-tight text-slate-800">
                <div className={`h-4 w-4 shrink-0 rounded-[var(--radius-sm)] border ${task.completions[dateKey] ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white/50'}`} />
                <span className="min-w-0 truncate">{task.title}</span>
              </div>
            ))}
            {hiddenTaskCount > 0 ? (
              <div className="inline-flex w-fit rounded-full bg-white/60 px-2.5 py-1 text-xs text-slate-500">还有 {hiddenTaskCount} 项在任务页查看</div>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-col justify-center border-l border-[var(--surface-border-light)] pl-3 text-center">
            <div className="text-[13px] text-slate-500">连续打卡</div>
            <div className="mt-1 text-[44px] font-semibold leading-none text-slate-900">{streak}</div>
            <div className="mt-2 text-[13px] leading-tight text-slate-500">当前连续</div>
          </div>
        </div>
      </div>
    </OverlayFrame>
  )
}
