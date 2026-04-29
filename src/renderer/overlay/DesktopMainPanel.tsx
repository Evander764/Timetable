import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen, CheckCircle2, Clock3, StickyNote } from 'lucide-react'
import { ProgressBar } from '@renderer/components/ProgressBar'
import type { AppData, DailyTask } from '@shared/types/app'
import { getCoursesForDate, getNextCourse } from '@shared/utils/course'
import { formatDateKey, getCompactChineseDate, getChineseWeekdayLabel, getLunarLabel } from '@shared/utils/date'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday, getTasksForDate } from '@shared/utils/tasks'
import { OverlayFrame } from './OverlayFrame'

export function DesktopMainPanel({ data }: { data: AppData }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dateKey = formatDateKey(now)
  const todayCourses = getCoursesForDate(data.courses, now, data.appSettings.termStartDate)
  const nextCourse = getNextCourse(data.courses, now, data.appSettings.termStartDate)
  const todayTasks = getTasksForDate(data.dailyTasks, now)
  const taskBreakdown = getDayProgressBreakdown(data.dailyTasks, now)
  const completionRate = getCompletionRate(data.dailyTasks, now)
  const activeMemo = data.memos.find((memo) => memo.status === 'active' && memo.showOnDesktop)
  const showPrinciple = data.principleCard.enabled && data.principleCard.displayMode === 'embedded'

  function toggleTask(task: DailyTask): void {
    void window.timeable.updateData({
      type: 'task/toggle',
      payload: {
        id: task.id,
        date: dateKey,
        completed: !task.completions[dateKey],
      },
    })
  }

  return (
    <OverlayFrame title="今日行动中心" widgetKey="mainPanel" data={data} footer={`今日课程 ${todayCourses.length} 节 · 待完成 ${taskBreakdown.pending} 项`}>
      <div className="grid grid-cols-[1fr_150px] gap-3">
        <div className="rounded-lg border border-white/55 bg-white/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">{getCompactChineseDate(now)}</div>
          <div className="mt-1 text-base text-slate-500">{getChineseWeekdayLabel(now)} · {getLunarLabel(now)}</div>
        </div>
        <div className="rounded-lg border border-white/55 bg-white/48 p-4 text-right">
          <div className="text-xs font-medium text-slate-500">今日剩余</div>
          <div className="mt-2 text-[27px] font-semibold leading-none text-[var(--color-primary)]">{getRemainingTimeToday(now)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1.1fr_0.9fr] gap-3">
        <SectionFrame icon={<BookOpen size={16} />} title="下一节课">
          {nextCourse ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[26px] font-semibold leading-none text-slate-900">{nextCourse.startTime}</div>
                <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs font-medium text-white">{nextCourse.dateKey === dateKey ? '今天' : nextCourse.dateKey}</span>
              </div>
              <div className="mt-2 truncate text-lg font-semibold text-slate-900">{nextCourse.name}</div>
              <div className="mt-1 truncate text-sm text-slate-500">{nextCourse.teacher} {nextCourse.location}</div>
            </div>
          ) : (
            <div className="text-sm leading-6 text-slate-500">未来两周没有匹配课程。</div>
          )}
        </SectionFrame>

        <SectionFrame icon={<CheckCircle2 size={16} />} title="任务进度">
          <div className="flex items-end justify-between gap-3">
            <div className="text-[34px] font-semibold leading-none text-slate-900">{completionRate}%</div>
            <div className="pb-1 text-sm text-slate-500">{taskBreakdown.completed}/{taskBreakdown.total}</div>
          </div>
          <ProgressBar value={completionRate} className="mt-3 h-2 bg-white/60" />
        </SectionFrame>
      </div>

      <SectionFrame className="mt-3" icon={<Clock3 size={16} />} title="当前任务">
        <div className="grid gap-2">
          {todayTasks.slice(0, 5).map((task) => {
            const completed = Boolean(task.completions[dateKey])
            return (
              <button
                key={task.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/55"
                aria-pressed={completed}
                onClick={() => toggleTask(task)}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[11px] font-semibold ${completed ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white/70 text-transparent'}`}>✓</span>
                <span className={completed ? 'min-w-0 flex-1 truncate text-slate-500 line-through' : 'min-w-0 flex-1 truncate text-slate-800'}>{task.title}</span>
                {task.dueTime ? <span className="shrink-0 text-xs text-slate-400">{task.dueTime}</span> : null}
              </button>
            )
          })}
          {todayTasks.length === 0 ? <div className="px-2 py-1 text-sm text-slate-500">今天没有任务。</div> : null}
        </div>
      </SectionFrame>

      {activeMemo ? (
        <SectionFrame className="mt-3" icon={<StickyNote size={16} />} title="当前备忘">
          <div className="truncate text-base font-semibold text-slate-900">{activeMemo.title}</div>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{activeMemo.content}</div>
        </SectionFrame>
      ) : null}

      {showPrinciple ? (
        <div className="mt-3 rounded-lg border border-blue-100/80 bg-blue-50/72 px-4 py-3 text-center">
          <div className="text-base font-semibold leading-7 text-slate-900 whitespace-pre-line">{data.principleCard.content}</div>
          {data.principleCard.author ? <div className="mt-1 text-xs text-slate-500">{data.principleCard.author}</div> : null}
        </div>
      ) : null}
    </OverlayFrame>
  )
}

function SectionFrame({
  title,
  icon,
  className,
  children,
}: {
  title: string
  icon: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-lg border border-white/55 bg-white/44 p-3 shadow-[0_10px_20px_rgba(56,83,133,0.1)] ${className ?? ''}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="text-blue-600">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}
