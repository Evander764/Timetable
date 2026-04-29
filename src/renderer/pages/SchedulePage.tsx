import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { addDays, subDays } from 'date-fns'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { useAppStore } from '@renderer/store/appStore'
import type { Course } from '@shared/types/app'
import { createId } from '@shared/utils/id'
import { doesCourseAppear, getCoursesForDate, getNextCourse } from '@shared/utils/course'
import { getAcademicWeek, getMonthDayLabel, getWeekDays, parseTimeToMinutes } from '@shared/utils/date'

const slotHeight = 58
const courseTimeSlots = [
  { id: 'morning-1', section: '上午', label: '第1节', startTime: '08:30', endTime: '09:10' },
  { id: 'morning-2', section: '上午', label: '第2节', startTime: '09:15', endTime: '09:55' },
  { id: 'morning-3', section: '上午', label: '第3节', startTime: '10:15', endTime: '10:55' },
  { id: 'morning-4', section: '上午', label: '第4节', startTime: '11:00', endTime: '11:40' },
  { id: 'morning-5', section: '上午', label: '第5节', startTime: '11:45', endTime: '12:25' },
  { id: 'afternoon-1', section: '下午', label: '第6节', startTime: '14:15', endTime: '14:55' },
  { id: 'afternoon-2', section: '下午', label: '第7节', startTime: '15:00', endTime: '15:40' },
  { id: 'afternoon-3', section: '下午', label: '第8节', startTime: '16:00', endTime: '16:40' },
  { id: 'afternoon-4', section: '下午', label: '第9节', startTime: '16:45', endTime: '17:25' },
  { id: 'dusk', section: '傍晚', label: '傍晚课', startTime: '17:40', endTime: '18:55' },
  { id: 'night-1', section: '晚上', label: '晚1', startTime: '19:00', endTime: '19:40' },
  { id: 'night-2', section: '晚上', label: '晚2', startTime: '19:40', endTime: '20:20' },
] as const
const timetableHeight = courseTimeSlots.length * slotHeight
const scheduleStartMinutes = parseTimeToMinutes(courseTimeSlots[0].startTime)
const scheduleEndMinutes = parseTimeToMinutes(courseTimeSlots[courseTimeSlots.length - 1].endTime)
const repeatLabels: Record<Course['repeatType'], string> = {
  weekly: '每周',
  odd: '单周',
  even: '双周',
}

function getCourseBlock(course: Course): { top: number; height: number } {
  const startMinutes = parseTimeToMinutes(course.startTime)
  const endMinutes = Math.max(parseTimeToMinutes(course.endTime), startMinutes + 10)
  const startSlotIndex = courseTimeSlots.findIndex((slot) => {
    const slotStart = parseTimeToMinutes(slot.startTime)
    const slotEnd = parseTimeToMinutes(slot.endTime)
    return startMinutes >= slotStart && startMinutes < slotEnd
  })
  const endSlotIndex = courseTimeSlots.findIndex((slot) => {
    const slotStart = parseTimeToMinutes(slot.startTime)
    const slotEnd = parseTimeToMinutes(slot.endTime)
    return endMinutes > slotStart && endMinutes <= slotEnd
  })

  if (startSlotIndex >= 0 && endSlotIndex >= startSlotIndex) {
    return {
      top: startSlotIndex * slotHeight + 4,
      height: (endSlotIndex - startSlotIndex + 1) * slotHeight - 8,
    }
  }

  const clampedStart = Math.min(Math.max(startMinutes, scheduleStartMinutes), scheduleEndMinutes)
  const clampedEnd = Math.min(Math.max(endMinutes, clampedStart + 10), scheduleEndMinutes)
  const top = ((clampedStart - scheduleStartMinutes) / (scheduleEndMinutes - scheduleStartMinutes)) * timetableHeight
  const height = ((clampedEnd - clampedStart) / (scheduleEndMinutes - scheduleStartMinutes)) * timetableHeight
  return { top: top + 4, height: Math.max(44, height - 8) }
}

function createBlankCourse(dayOfWeek = 1): Course {
  return {
    id: createId('course'),
    name: '',
    teacher: '',
    location: '',
    dayOfWeek,
    startTime: '08:30',
    endTime: '09:55',
    repeatType: 'weekly',
    weekStart: 1,
    weekEnd: 20,
    color: '#3B82F6',
    note: '',
  }
}

export function SchedulePage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [repeatFilter, setRepeatFilter] = useState<'all' | 'weekly' | 'odd' | 'even'>('all')
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Course>(() => createBlankCourse(1))

  if (!data) {
    return <LoadingState />
  }

  const weekNumber = getAcademicWeek(anchorDate, data.appSettings.termStartDate)
  const weekDates = getWeekDays(anchorDate)
  const today = new Date()
  const todayCourses = getCoursesForDate(data.courses, today, data.appSettings.termStartDate)
  const nextCourse = getNextCourse(data.courses, today, data.appSettings.termStartDate)
  const filteredWeekCourses = new Map<number, Course[]>(
    Array.from({ length: 7 }, (_, index): [number, Course[]] => {
      const day = index + 1
      return [
      day,
        data.courses
          .filter((course) => course.dayOfWeek === day && (repeatFilter === 'all' || course.repeatType === repeatFilter))
          .sort((left, right) => parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime)),
      ]
    }),
  )

  const weeklyCourseCount = [...filteredWeekCourses.values()].reduce((total, courses) => total + courses.length, 0)
  const uniqueCourseCount = new Set(data.courses.map((course) => course.name)).size
  const averagePerDay = (weeklyCourseCount / 5).toFixed(1)
  const draftStartMinutes = parseTimeToMinutes(draft.startTime)
  const draftEndMinutes = parseTimeToMinutes(draft.endTime)
  const isDraftTimeValid = Number.isFinite(draftStartMinutes)
    && Number.isFinite(draftEndMinutes)
    && draftEndMinutes > draftStartMinutes
  const isDraftValid = draft.name.trim().length > 0 && isDraftTimeValid

  async function saveCourse() {
    if (!isDraftValid) {
      return
    }

    const courseToSave: Course = {
      ...draft,
      name: (draft.name ?? '').trim(),
      teacher: (draft.teacher ?? '').trim(),
      location: (draft.location ?? '').trim(),
      note: draft.note?.trim() ?? '',
    }
    await updateData({ type: 'course/upsert', payload: courseToSave }, editingCourseId ? '课程已更新。' : '课程已创建。')
    setDraft(courseToSave)
    setEditingCourseId(courseToSave.id)
  }

  async function deleteCourse() {
    if (!editingCourseId) {
      setDraft(createBlankCourse(draft.dayOfWeek))
      return
    }

    await updateData({ type: 'course/delete', payload: { id: editingCourseId } }, '课程已删除。')
    setEditingCourseId(null)
    setDraft(createBlankCourse(1))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="课程表管理"
        subtitle={`第 ${weekNumber} 周（${getMonthDayLabel(weekDates[0])} 至 ${getMonthDayLabel(weekDates[6])}）`}
        actions={
          <>
            <Button variant="primary" onClick={() => {
              const nextDraft = createBlankCourse(1)
              setEditingCourseId(null)
              setDraft(nextDraft)
            }}>
              <Plus size={18} />
              添加课程
            </Button>
            <Button onClick={() => setRepeatFilter('all')}>重置筛选</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="order-2 min-w-0 overflow-hidden p-0 2xl:order-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <Button onClick={() => setAnchorDate(subDays(anchorDate, 7))}>
              <ChevronLeft size={18} />
              上一周
            </Button>
            <div className="text-4xl font-semibold tracking-tight text-slate-900">第 {weekNumber} 周</div>
            <Button onClick={() => setAnchorDate(addDays(anchorDate, 7))}>
              下一周
              <ChevronRight size={18} />
            </Button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <div className="flex gap-2">
              {[
                { key: 'all', label: '全部' },
                { key: 'weekly', label: '每周' },
                { key: 'odd', label: '单周' },
                { key: 'even', label: '双周' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    repeatFilter === item.key ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  onClick={() => setRepeatFilter(item.key as typeof repeatFilter)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-slate-500">当前周类型：{weekNumber % 2 === 0 ? '双周' : '单周'}</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-white/75">
                <div className="border-r border-slate-100 p-4 text-sm text-slate-400">时间</div>
                {weekDates.map((date, index) => (
                  <div key={date.toISOString()} className="border-r border-slate-100 px-3 py-4 text-center last:border-r-0">
                    <div className="text-xl font-semibold text-slate-900">{['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index]}</div>
                    <div className="text-sm text-slate-500">{getMonthDayLabel(date)}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))]">
                <div className="relative border-r border-slate-100 bg-slate-50/70">
                  {courseTimeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex h-[58px] flex-col justify-center border-b border-slate-100 px-2 text-center text-slate-500"
                    >
                      <div className="text-[11px] font-semibold text-slate-700">{slot.section} {slot.label}</div>
                      <div className="mt-1 text-[10px] leading-none">{slot.startTime}-{slot.endTime}</div>
                    </div>
                  ))}
                </div>

                {weekDates.map((date, dayIndex) => (
                  <div key={date.toISOString()} className="relative border-r border-slate-100 last:border-r-0" style={{ height: timetableHeight }}>
                    {courseTimeSlots.map((slot) => (
                      <div key={slot.id} className="h-[58px] border-b border-slate-100" />
                    ))}

                    {filteredWeekCourses.get(dayIndex + 1)?.map((course) => {
                      const block = getCourseBlock(course)
                      const activeInWeek = doesCourseAppear(course, weekNumber)
                      const compact = block.height < 82
                      return (
                        <button
                          key={course.id}
                          type="button"
                          className={`absolute left-2 right-2 overflow-hidden rounded-[16px] border px-3 py-2 text-left shadow-[0_15px_28px_rgba(51,92,161,0.12)] transition hover:-translate-y-0.5 ${
                            activeInWeek ? 'opacity-100' : 'opacity-55 saturate-50'
                          }`}
                          style={{
                            top: block.top,
                            height: block.height,
                            background: activeInWeek ? `${course.color ?? '#3B82F6'}14` : 'rgba(248, 250, 252, 0.95)',
                            borderColor: activeInWeek ? `${course.color ?? '#3B82F6'}66` : '#CBD5E1',
                          }}
                          onClick={() => {
                            setEditingCourseId(course.id)
                            setDraft({ ...course })
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className={`${compact ? 'text-sm' : 'text-base'} min-w-0 flex-1 truncate font-semibold`}
                              style={{ color: activeInWeek ? course.color ?? '#2563EB' : '#64748B' }}
                            >
                              {course.name}
                            </div>
                            <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              {activeInWeek ? repeatLabels[course.repeatType] : `${repeatLabels[course.repeatType]}非本周`}
                            </span>
                          </div>
                          <div className={`${compact ? 'mt-1' : 'mt-2'} flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600`}>
                            {course.teacher ? (
                            <div className="flex min-w-0 items-center gap-1">
                              <UserRound size={14} />
                              <span className="truncate">{course.teacher}</span>
                            </div>
                            ) : null}
                            {course.location ? (
                            <div className="flex min-w-0 items-center gap-1">
                              <MapPin size={14} />
                              <span className="truncate">{course.location}</span>
                            </div>
                            ) : null}
                            <div className="flex items-center gap-1">
                              <Clock3 size={14} />
                              <span>{course.startTime}-{course.endTime}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="order-1 2xl:order-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">课程详情</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{editingCourseId ? '编辑课程' : '新增课程'}</div>
            </div>
            <Button variant="danger" size="sm" onClick={() => void deleteCourse()}>
              <Trash2 size={16} />
              删除
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="课程名称">
              <input className="form-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：数据结构与算法" />
            </Field>
            <Field label="教师">
              <input className="form-input" value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} placeholder="张老师" />
            </Field>
            <Field label="地点">
              <input className="form-input" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="教学楼 A301" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="开始时间">
                <input className="form-input" type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} />
              </Field>
              <Field label="结束时间">
                <input className="form-input" type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} />
              </Field>
            </div>
            {!isDraftTimeValid ? <div className="text-sm text-red-500">结束时间必须晚于开始时间。</div> : null}
            <Field label="星期">
              <select className="form-select" value={draft.dayOfWeek} onChange={(event) => setDraft({ ...draft, dayOfWeek: Number(event.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    {['周一', '周二', '周三', '周四', '周五', '周六', '周日'][day - 1]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="重复规则">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['weekly', '每周'],
                  ['odd', '单周'],
                  ['even', '双周'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-sm font-medium ${draft.repeatType === value ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-600'}`}
                    onClick={() => setDraft({ ...draft, repeatType: value as Course['repeatType'] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="起始周">
                <input className="form-input" type="number" min={1} max={30} value={draft.weekStart ?? 1} onChange={(event) => setDraft({ ...draft, weekStart: Number(event.target.value) })} />
              </Field>
              <Field label="结束周">
                <input className="form-input" type="number" min={1} max={30} value={draft.weekEnd ?? 20} onChange={(event) => setDraft({ ...draft, weekEnd: Number(event.target.value) })} />
              </Field>
            </div>
            <Field label="颜色">
              <input className="form-input h-12" type="color" value={draft.color ?? '#3B82F6'} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
            </Field>
            <Field label="备注">
              <textarea className="form-textarea" value={draft.note ?? ''} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="例如：提前预习第 5 章内容" />
            </Field>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => {
              setEditingCourseId(null)
              setDraft(createBlankCourse(1))
            }}>
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => void saveCourse()}
              disabled={!isDraftValid}
            >
              保存修改
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_1fr_280px] gap-4">
        <Card>
          <div className="text-2xl font-semibold text-slate-900">今天课程</div>
          <div className="mt-4 flex items-end gap-6">
            <div className="text-6xl font-semibold text-slate-900">{todayCourses.length}</div>
            <div className="pb-2 text-slate-500">节</div>
          </div>
          <div className="mt-4 space-y-3">
            {todayCourses.length ? (
              todayCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{course.startTime} {course.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{course.teacher} {course.location}</div>
                  </div>
                  <span className="text-sm text-slate-400">{course.endTime}</span>
                </div>
              ))
            ) : (
              <EmptyState title="今日暂无课程" description="你可以在右侧面板中创建新课程，或切换到其他周查看安排。" />
            )}
          </div>
        </Card>

        <Card>
          <div className="text-2xl font-semibold text-slate-900">下一节课</div>
          {nextCourse ? (
            <div className="mt-5">
              <div className="text-6xl font-semibold text-slate-900">{nextCourse.startTime}</div>
              <div className="mt-3 text-2xl font-semibold text-emerald-600">{nextCourse.name}</div>
              <div className="mt-2 text-base text-slate-500">{nextCourse.teacher} {nextCourse.location}</div>
            </div>
          ) : (
            <EmptyState title="没有即将开始的课程" description="未来两周内都没有匹配的课程安排，可能需要调整学期起始日期或补充课程。" />
          )}
        </Card>

        <Card>
          <div className="text-2xl font-semibold text-slate-900">本周统计</div>
          <div className="mt-5 space-y-4">
            <StatRow label="课程总数" value={`${weeklyCourseCount} 节`} />
            <StatRow label="不同课程" value={`${uniqueCourseCount} 门`} />
            <StatRow label="平均每天" value={`${averagePerDay} 节`} />
            <ProgressBar value={(weeklyCourseCount / Math.max(1, data.courses.length)) * 100} accentClassName="bg-violet-500" />
          </div>
        </Card>
      </div>
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-900">{value}</span>
    </div>
  )
}
