import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { AppData } from '@shared/types/app'
import { getCoursesForDate, getTodayCourseStatus } from '@shared/utils/course'
import { getCompactChineseDate, getChineseWeekdayLabel, getLunarLabel } from '@shared/utils/date'
import { getTasksForDate } from '@shared/utils/tasks'
import { getActivePrincipleCard } from '@shared/utils/principle'
import { OverlayFrame } from './OverlayFrame'

export function DesktopMainPanel({ data }: { data: AppData }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const todayCourses = getCoursesForDate(data.courses, now, data.appSettings.termStartDate, data.appSettings.termWeekCount)
  const courseStatus = getTodayCourseStatus(data.courses, now, data.appSettings.termStartDate, data.appSettings.termWeekCount)
  const statusCourse = courseStatus.currentCourse ?? courseStatus.nextCourse
  const courseStatusLabel = courseStatus.currentCourse ? '进行中' : '下一节'
  const courseStatusTime = courseStatus.currentCourse ? `${courseStatus.currentCourse.startTime}-${courseStatus.currentCourse.endTime}` : statusCourse?.startTime
  const todayTasks = getTasksForDate(data.dailyTasks, now)
  const pendingTasks = todayTasks.filter((task) => !task.completions[formatDateForTask(now)])
  const showPrinciple = (data.principleCard.displayMode ?? 'embedded') === 'embedded' && data.principleCard.enabled
  const activePrincipleCard = getActivePrincipleCard(data.principleCard, now)

  return (
    <OverlayFrame
      title="流的搭建"
      widgetKey="mainPanel"
      data={data}
      footer={`课程 ${todayCourses.length} · 已完 ${courseStatus.completedCourses.length} · 剩余 ${courseStatus.remainingCourses.length} · 待办 ${pendingTasks.length}`}
    >
      <div className="rounded-[18px] border border-white/55 bg-white/48 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="text-4xl font-semibold tracking-tight text-slate-900">{getCompactChineseDate(now)}</div>
        <div className="mt-2 text-2xl text-slate-600">{getChineseWeekdayLabel(now)}</div>
        <div className="mt-2 text-lg text-slate-400">{getLunarLabel(now)}</div>
      </div>

      <SectionFrame title="课程状态">
        {statusCourse ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-semibold text-slate-900">{courseStatusTime}</div>
              <span className={`rounded-full px-3 py-1 text-sm text-white ${courseStatus.currentCourse ? 'bg-emerald-500' : 'bg-blue-500'}`}>{courseStatusLabel}</span>
            </div>
            <div className="mt-2 text-[18px] font-semibold text-slate-900">{statusCourse.name}</div>
            <div className="mt-2 text-sm text-slate-500">{statusCourse.teacher} {statusCourse.location}</div>
          </div>
        ) : (
          <div className="text-sm leading-6 text-slate-500">{todayCourses.length ? '今天课程已结束。' : '今天没有课程安排。'}</div>
        )}
      </SectionFrame>

      {showPrinciple ? (
        <SectionFrame title="最重要的道理">
          <div className="whitespace-pre-line text-[18px] font-semibold leading-[1.5] text-slate-900">{activePrincipleCard.content}</div>
          {activePrincipleCard.author ? <div className="mt-3 text-sm text-slate-500">{activePrincipleCard.author}</div> : null}
        </SectionFrame>
      ) : null}
    </OverlayFrame>
  )
}

function SectionFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[18px] border border-white/55 bg-white/42 p-4 shadow-[0_12px_26px_rgba(56,83,133,0.12)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <BookOpen size={16} />
        {title}
      </div>
      {children}
    </div>
  )
}

function formatDateForTask(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
