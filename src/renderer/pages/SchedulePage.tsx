import type { ReactNode } from 'react'
import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { addDays, subDays } from 'date-fns'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { useAppStore } from '@renderer/store/appStore'
import type { Course, TimetableSlot } from '@shared/types/app'
import { createId } from '@shared/utils/id'
import { defaultTimetableSlots, getCoursesForDate, getNextCourse, getWeekCourses, normalizeCourseTimeSlots, normalizeTermWeekCount } from '@shared/utils/course'
import { getAcademicWeek, getMonthDayLabel, getWeekDays, parseTimeToMinutes } from '@shared/utils/date'

const pixelsPerHour = 68

function createBlankCourse(dayOfWeek = 1): Course {
  return {
    id: createId('course'),
    name: '',
    teacher: '',
    location: '',
    dayOfWeek,
    startTime: defaultTimetableSlots[0].startTime,
    endTime: defaultTimetableSlots[1]?.endTime ?? defaultTimetableSlots[0].endTime,
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
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [repeatFilter, setRepeatFilter] = useState<'all' | 'weekly' | 'odd' | 'even'>('all')
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Course>(() => createBlankCourse(1))

  if (!data) {
    return <LoadingState />
  }

  const timetableSlots = normalizeCourseTimeSlots(data.appSettings.timetableSlots)
  const termWeekCount = normalizeTermWeekCount(data.appSettings.termWeekCount)
  const startHour = Math.floor(parseTimeToMinutes(timetableSlots[0].startTime) / 60)
  const endHour = Math.ceil(parseTimeToMinutes(timetableSlots[timetableSlots.length - 1].endTime) / 60)
  const timeSlots = Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
  const weekNumber = getAcademicWeek(anchorDate, data.appSettings.termStartDate)
  const weekDates = getWeekDays(anchorDate)
  const weekCourses = getWeekCourses(data.courses, anchorDate, data.appSettings.termStartDate, termWeekCount)
  const today = new Date()
  const todayCourses = getCoursesForDate(data.courses, today, data.appSettings.termStartDate, termWeekCount)
  const nextCourse = getNextCourse(data.courses, today, data.appSettings.termStartDate, termWeekCount)
  const filteredWeekCourses = new Map(
    [...weekCourses.entries()].map(([day, courses]) => [
      day,
      courses.filter((course) => repeatFilter === 'all' || course.repeatType === repeatFilter),
    ]),
  )

  const weeklyCourseCount = [...filteredWeekCourses.values()].reduce((total, courses) => total + courses.length, 0)
  const uniqueCourseCount = new Set(data.courses.map((course) => course.name)).size
  const averagePerDay = (weeklyCourseCount / 5).toFixed(1)

  function updateSlot(id: string, changes: Partial<TimetableSlot>) {
    const nextSlots = timetableSlots.map((slot) => (slot.id === id ? { ...slot, ...changes } : slot))
    void updateSettings({ appSettings: { timetableSlots: nextSlots } }, '课表时间已更新。')
  }

  async function saveCourse() {
    await updateData({ type: 'course/upsert', payload: draft }, editingCourseId ? '课程已更新。' : '课程已创建。')
    setEditingCourseId(draft.id)
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

      <div className="grid grid-cols-[1.7fr_340px] gap-4">
        <Card className="overflow-hidden p-0">
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

          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-white/75">
            <div className="border-r border-slate-100 p-4 text-sm text-slate-400">时间</div>
            {weekDates.map((date, index) => (
              <div key={date.toISOString()} className="border-r border-slate-100 px-3 py-4 text-center last:border-r-0">
                <div className="text-xl font-semibold text-slate-900">{['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index]}</div>
                <div className="text-sm text-slate-500">{getMonthDayLabel(date)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
            <div className="relative border-r border-slate-100 bg-slate-50/70">
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="flex h-[68px] items-start justify-center border-b border-slate-100 pt-2 text-sm text-slate-500"
                >
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {weekDates.map((date, dayIndex) => (
              <div key={date.toISOString()} className="relative border-r border-slate-100 last:border-r-0" style={{ height: `${(endHour - startHour) * pixelsPerHour}px` }}>
                {timeSlots.map((hour) => (
                  <div key={hour} className="h-[68px] border-b border-slate-100" />
                ))}

                {filteredWeekCourses.get(dayIndex + 1)?.map((course) => {
                  const startMinutes = parseTimeToMinutes(course.startTime)
                  const endMinutes = parseTimeToMinutes(course.endTime)
                  const top = ((startMinutes - startHour * 60) / 60) * pixelsPerHour
                  const height = ((endMinutes - startMinutes) / 60) * pixelsPerHour
                  return (
                    <button
                      key={course.id}
                      type="button"
                      className="absolute left-2 right-2 rounded-[20px] border p-3 text-left shadow-[0_15px_28px_rgba(51,92,161,0.12)]"
                      style={{
                        top,
                        height,
                        background: `${course.color ?? '#3B82F6'}14`,
                        borderColor: `${course.color ?? '#3B82F6'}66`,
                      }}
                      onClick={() => {
                        setEditingCourseId(course.id)
                        setDraft(course)
                      }}
                    >
                      <div className="text-lg font-semibold" style={{ color: course.color ?? '#2563EB' }}>{course.name}</div>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <UserRound size={14} />
                          <span>{course.teacher}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} />
                          <span>{course.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
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
        </Card>

        <Card>
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
              disabled={!draft.name || !draft.teacher || !draft.location}
            >
              保存修改
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">学期设置</div>
              <div className="text-sm text-slate-500">用于判断单/双周和学期范围。</div>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <Field label="学期开始日期">
              <input
                className="form-input"
                type="date"
                value={data.appSettings.termStartDate}
                onChange={(event) => void updateSettings({ appSettings: { termStartDate: event.target.value } }, '学期开始日期已更新。')}
              />
            </Field>
            <Field label="学期总周数">
              <input
                className="form-input"
                type="number"
                min={1}
                max={40}
                value={termWeekCount}
                onChange={(event) => void updateSettings({ appSettings: { termWeekCount: Number(event.target.value) } }, '学期总周数已更新。')}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">课表时间</div>
              <div className="mt-1 text-sm text-slate-500">上午五节、下午四节，另含傍晚课和晚课；可按个人安排修改。</div>
            </div>
            <Button onClick={() => void updateSettings({ appSettings: { timetableSlots: defaultTimetableSlots } }, '课表时间已恢复默认。')}>恢复默认</Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {timetableSlots.map((slot) => (
              <div key={slot.id} className="rounded-[14px] border border-slate-200/80 bg-white/85 p-3">
                <div className="grid grid-cols-[82px_1fr_1fr] gap-2">
                  <input className="form-input" value={slot.label} onChange={(event) => updateSlot(slot.id, { label: event.target.value })} />
                  <input className="form-input" type="time" value={slot.startTime} onChange={(event) => updateSlot(slot.id, { startTime: event.target.value })} />
                  <input className="form-input" type="time" value={slot.endTime} onChange={(event) => updateSlot(slot.id, { endTime: event.target.value })} />
                </div>
                <input className="form-input mt-2" value={slot.section} onChange={(event) => updateSlot(slot.id, { section: event.target.value })} />
              </div>
            ))}
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
