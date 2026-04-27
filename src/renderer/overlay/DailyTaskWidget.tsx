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

  return (
    <OverlayFrame title="每日任务" dragLocked={data.desktopSettings.dragLocked}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] text-slate-500">今日完成</div>
          <div className="mt-1 text-[34px] font-semibold text-slate-900">
            {tasks.filter((task) => task.completions[dateKey]).length}/{tasks.length}
          </div>
        </div>
        <div className="text-[34px] font-semibold text-slate-900">{completionRate}%</div>
      </div>
      <div className="mt-4">
        <ProgressBar value={completionRate} className="h-3 bg-white/60" />
      </div>

      <div className="mt-5 grid grid-cols-[1fr_108px] gap-4">
        <div className="space-y-3">
          {tasks.slice(0, 6).map((task) => (
            <div key={task.id} className="flex items-center gap-3 text-[16px] text-slate-800">
              <div className={`h-5 w-5 rounded-md border ${task.completions[dateKey] ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white/50'}`} />
              <span>{task.title}</span>
            </div>
          ))}
        </div>
        <div className="border-l border-white/50 pl-4 text-center">
          <div className="text-[15px] text-slate-500">连续打卡</div>
          <div className="mt-2 text-[54px] font-semibold text-slate-900">{getTaskStreak(data.dailyTasks, today)}</div>
          <div className="mt-2 text-[15px] text-slate-500">继续加油</div>
          <div className="mt-4 text-5xl">🔥</div>
        </div>
      </div>
    </OverlayFrame>
  )
}
