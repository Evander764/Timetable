import type { AppData } from '@shared/types/app'
import { getCoursesForDate } from '@shared/utils/course'
import { getCompactChineseDate, getChineseWeekdayLabel, getLunarLabel } from '@shared/utils/date'
import { OverlayFrame } from './OverlayFrame'

export function DesktopMainPanel({ data }: { data: AppData }) {
  const today = new Date()
  const todayCourses = getCoursesForDate(data.courses, today, data.appSettings.termStartDate)

  return (
    <OverlayFrame title="流的搭建" dragLocked={data.desktopSettings.dragLocked} footer={`今日课程 ${todayCourses.length} 节`}>
      <div className="rounded-[22px] border border-white/55 bg-white/48 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="text-4xl font-semibold tracking-tight text-slate-900">{getCompactChineseDate(today)}</div>
        <div className="mt-2 text-2xl text-slate-600">{getChineseWeekdayLabel(today)}</div>
        <div className="mt-2 text-lg text-slate-400">{getLunarLabel(today)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">今天课程</div>
      </div>
      <div className="mt-3 space-y-3">
        {todayCourses.slice(0, 3).map((course, index) => (
          <div key={course.id} className="rounded-[20px] border border-white/55 bg-white/42 p-4 shadow-[0_12px_26px_rgba(56,83,133,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-semibold text-slate-900">{course.startTime}</div>
              {index === 0 ? <span className="rounded-full bg-blue-500 px-3 py-1 text-sm text-white">下一节课</span> : null}
            </div>
            <div className="mt-2 text-[18px] font-semibold text-slate-900">{course.name}</div>
            <div className="mt-2 text-sm text-slate-500">{course.teacher} {course.location}</div>
          </div>
        ))}
      </div>
    </OverlayFrame>
  )
}
