import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Check, ChevronRight, Clock, Menu, X } from 'lucide-react'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { useAppStore } from '@renderer/store/appStore'
import type { CourseOccurrence, TodayCourseStatus } from '@shared/utils/course'
import { getCoursesForDate, getNextCourse, getTodayCourseStatus } from '@shared/utils/course'
import { formatDateKey, getCompactChineseDate, getChineseWeekdayLabel, getLunarLabel } from '@shared/utils/date'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday, getTasksForDate } from '@shared/utils/tasks'

type TimelineItem = {
  time: string
  title: string
  meta: string
  active?: boolean
}

const sectionLabels = ['开场问题', '下一节点', '执行队列', '今日归档']

const commandLinks = [
  { to: '/schedule', label: '课程账本' },
  { to: '/daily-tasks', label: '执行队列' },
  { to: '/long-term-goals', label: '目标档案' },
  { to: '/memos', label: '备忘档案' },
]

export function OverviewPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const [now, setNow] = useState(() => new Date())
  const [commandOpen, setCommandOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])

  const goToSection = useCallback((index: number) => {
    const nextIndex = Math.min(sectionLabels.length - 1, Math.max(0, index))
    setActiveSection(nextIndex)
    sectionRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const sections = sectionRefs.current.filter((section): section is HTMLElement => Boolean(section))
    if (!sections.length) {
      return
    }

    const root = sections[0].closest('main')
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
        const index = Number((visibleEntry?.target as HTMLElement | undefined)?.dataset.sectionIndex)
        if (Number.isFinite(index)) {
          setActiveSection(index)
        }
      },
      {
        root,
        rootMargin: '-12% 0px -58% 0px',
        threshold: [0.18, 0.34, 0.5, 0.68],
      },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [data])

  if (!data) {
    return <LoadingState />
  }

  const todayKey = formatDateKey(now)
  const todayCourses = getCoursesForDate(data.courses, now, data.appSettings.termStartDate, data.appSettings.termWeekCount)
  const courseStatus = getTodayCourseStatus(data.courses, now, data.appSettings.termStartDate, data.appSettings.termWeekCount)
  const nextAnyCourse = getNextCourse(data.courses, now, data.appSettings.termStartDate, data.appSettings.termWeekCount)
  const todayTasks = getTasksForDate(data.dailyTasks, now)
  const completionRate = getCompletionRate(data.dailyTasks, now)
  const taskProgress = getDayProgressBreakdown(data.dailyTasks, now)
  const pendingTasks = todayTasks.filter((task) => !task.completions[todayKey])
  const activeGoals = data.longTermGoals.filter((goal) => goal.status === 'active')
  const activeMemos = data.memos.filter((memo) => memo.status === 'active')
  const featuredCourse = courseStatus.currentCourse ?? courseStatus.nextCourse ?? nextAnyCourse
  const featuredLabel = getFeaturedCourseLabel(courseStatus, featuredCourse)
  const featuredCountdown = getFeaturedCourseCountdown(now, courseStatus, featuredCourse)
  const timelineItems = buildTimelineItems(now, todayCourses, todayTasks, todayKey, courseStatus)

  async function toggleTask(taskId: string, completed: boolean) {
    await updateData({ type: 'task/toggle', payload: { id: taskId, date: todayKey, completed } })
  }

  return (
    <div className="timetable-calibration-page">
      <header className="calibration-ledger-bar">
        <div>
          <span className="calibration-dot" />
          <strong>TIMETABLE.OS</strong>
          <em>DAY_LEDGER // {todayKey}</em>
        </div>
        <div className="calibration-chapter">
          <span>{String(activeSection + 1).padStart(2, '0')}</span>
          <em>/ 04</em>
          <strong>{sectionLabels[activeSection]}</strong>
        </div>
      </header>

      <div className="calibration-layout">
        <div className="calibration-sections">
          <section
            ref={(node) => {
              sectionRefs.current[0] = node
            }}
            className="calibration-section calibration-hero-section"
            data-section-index="0"
          >
            <div className="calibration-hero-copy">
              <div className="calibration-tag">OPENING QUESTION // LOCAL DAY</div>
              <h1>如果今天是最后一天，你打算怎么过？</h1>
              <p>先校准方向，再进入任务。今天只追踪真正能推动生活向前的节点。</p>
            </div>
            <div className="calibration-date-card">
              <span>{getCompactChineseDate(now)}</span>
              <strong>{getChineseWeekdayLabel(now)}</strong>
              <em>{getLunarLabel(now)}</em>
              <small>{getRemainingTimeToday(now)} left</small>
            </div>
          </section>

          <section
            ref={(node) => {
              sectionRefs.current[1] = node
            }}
            className="calibration-section calibration-section-dark calibration-node-section"
            data-section-index="1"
          >
            <div className="calibration-node-copy">
              <div className="calibration-tag">{featuredLabel}</div>
              <h2>{featuredCourse ? featuredCourse.name : '今天没有课程压迫'}</h2>
              <p>
                {featuredCourse
                  ? `${featuredCourse.startTime}-${featuredCourse.endTime} · ${compactText(featuredCourse.teacher, featuredCourse.location)}`
                  : '把注意力集中在执行队列、目标档案和今晚的归档。'}
              </p>
            </div>
            <div className="calibration-meter">
              <span>{featuredCourse ? '距离节点' : '剩余今日'}</span>
              <strong>{featuredCourse ? featuredCountdown : getRemainingTimeToday(now)}</strong>
              <em>完成率 {completionRate}% · 待办 {taskProgress.pending}</em>
            </div>
            <div className="calibration-timeline-grid">
              {timelineItems.slice(0, 6).map((item) => (
                <TimelineLedgerItem key={`${item.time}-${item.title}`} item={item} />
              ))}
            </div>
          </section>

          <section
            ref={(node) => {
              sectionRefs.current[2] = node
            }}
            className="calibration-section calibration-queue-section"
            data-section-index="2"
          >
            <div className="calibration-section-title">
              <span>EXECUTION QUEUE</span>
              <strong>
                {taskProgress.completed}/{taskProgress.total}
              </strong>
            </div>
            <div className="calibration-progress-track" aria-label={`今日任务完成率 ${completionRate}%`}>
              <span style={{ width: `${completionRate}%` }} />
            </div>
            <div className="calibration-task-list">
              {todayTasks.length ? (
                todayTasks.slice(0, 10).map((task, index) => {
                  const completed = Boolean(task.completions[todayKey])
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className={`calibration-task-row ${completed ? 'done' : ''}`}
                      onClick={() => void toggleTask(task.id, !completed)}
                    >
                      <span className="calibration-task-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="calibration-task-check">{completed ? <Check size={15} strokeWidth={2.7} /> : null}</span>
                      <span className="calibration-task-body">
                        <strong>{task.title || '未命名任务'}</strong>
                        <em>{task.dueTime ? `${task.dueTime} · ${task.priority}` : task.priority}</em>
                      </span>
                      <span className="calibration-task-stamp">{completed ? 'DONE' : ''}</span>
                    </button>
                  )
                })
              ) : (
                <EmptyState title="今天没有执行项" description="可以前往执行队列添加一项真正重要的任务。" />
              )}
            </div>
          </section>

          <section
            ref={(node) => {
              sectionRefs.current[3] = node
            }}
            className="calibration-section calibration-section-dark calibration-archive-section"
            data-section-index="3"
          >
            <div className="calibration-archive-copy">
              <div className="calibration-tag">ARCHIVE POINT // EVENING</div>
              <h2>把今天收进账本。</h2>
              <p>归档不是退出程序，而是正式结束今天。它会播放结束仪式，并记录今日已归档。</p>
              <button type="button" className="calibration-archive-button" onClick={() => void window.timeable.windowControl('archive')}>
                <Archive size={18} />
                结束今日
              </button>
            </div>
            <div className="calibration-audit-stack">
              <AuditPanel title="系统状态" meta="LOCAL ONLY">
                <AuditRow label="今日课程" value={`${todayCourses.length}`} />
                <AuditRow label="待执行" value={`${pendingTasks.length}`} />
                <AuditRow label="进行中目标" value={`${activeGoals.length}`} />
                <AuditRow label="备忘记录" value={`${activeMemos.length}`} />
              </AuditPanel>
              <AuditPanel title="目标档案" meta={`${activeGoals.length} 个进行中`}>
                {activeGoals.length ? (
                  activeGoals.slice(0, 3).map((goal) => <AuditRow key={goal.id} label={goal.title} value={`${goal.progress}%`} />)
                ) : (
                  <div className="calibration-empty-line">暂无进行中的长期目标。</div>
                )}
              </AuditPanel>
              <AuditPanel title="备忘档案" meta={`${activeMemos.length} 条记录`}>
                {activeMemos.length ? (
                  activeMemos.slice(0, 3).map((memo) => <AuditRow key={memo.id} label={memo.title} value={memo.showOnDesktop ? '桌面' : '应用'} />)
                ) : (
                  <div className="calibration-empty-line">暂无进行中的备忘。</div>
                )}
              </AuditPanel>
            </div>
          </section>
        </div>

        <nav className="calibration-section-index" aria-label="今日校准台章节索引">
          {sectionLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index === activeSection ? 'active' : ''}
              onClick={() => goToSection(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </nav>
      </div>

      <div className="os-floating-menu">
        {commandOpen ? (
          <div className="os-command-list">
            {commandLinks.map((item, index) => (
              <Link key={item.to} to={item.to} className="os-command-item" onClick={() => setCommandOpen(false)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.label}</strong>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className={`os-command-trigger ${commandOpen ? 'open' : ''}`}
          aria-label={commandOpen ? '关闭快捷菜单' : '打开快捷菜单'}
          onClick={() => setCommandOpen((open) => !open)}
        >
          {commandOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </div>
  )
}

function TimelineLedgerItem({ item }: { item: TimelineItem }) {
  return (
    <div className={`calibration-timeline-row ${item.active ? 'active' : ''}`}>
      <Clock size={15} />
      <time>{item.time}</time>
      <span>
        <strong>{item.title}</strong>
        <em>{item.meta}</em>
      </span>
    </div>
  )
}

function AuditPanel({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section className="calibration-audit-panel">
      <div className="calibration-section-title">
        <span>{title}</span>
        <strong>{meta}</strong>
      </div>
      <div className="calibration-audit-body">{children}</div>
    </section>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="calibration-audit-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getFeaturedCourseLabel(status: TodayCourseStatus, featuredCourse: CourseOccurrence | null): string {
  if (!featuredCourse) {
    return 'CURRENT_SLOT // FREE'
  }
  return status.currentCourse ? 'CURRENT_COURSE // LIVE' : 'NEXT_COURSE // READY'
}

function getFeaturedCourseCountdown(now: Date, status: TodayCourseStatus, featuredCourse: CourseOccurrence | null): string {
  if (!featuredCourse) {
    return '--:--'
  }
  const targetTime = status.currentCourse === featuredCourse ? featuredCourse.endTime : featuredCourse.startTime
  return formatDurationToClock(getTimeDifference(now, targetTime))
}

function buildTimelineItems(
  now: Date,
  courses: CourseOccurrence[],
  tasks: ReturnType<typeof getTasksForDate>,
  dateKey: string,
  status: TodayCourseStatus,
): TimelineItem[] {
  const courseItems = courses.map((course) => ({
    time: course.startTime,
    title: course.name,
    meta: compactText(course.teacher, course.location),
    active: course.id === status.currentCourse?.id || course.id === status.nextCourse?.id,
  }))
  const taskItems = tasks
    .filter((task) => task.dueTime)
    .map((task) => ({
      time: task.dueTime ?? '18:00',
      title: task.title || '未命名任务',
      meta: task.completions[dateKey] ? '已完成' : '待执行',
      active: !task.completions[dateKey] && Math.abs(getTimeDifference(now, task.dueTime ?? '18:00')) < 30 * 60 * 1000,
    }))

  return [
    { time: '08:00', title: '晨间校准', meta: '启动日程' },
    ...courseItems,
    ...taskItems,
    { time: '23:30', title: '今日归档', meta: '收束与复盘' },
  ]
    .sort((left, right) => toMinutes(left.time) - toMinutes(right.time))
    .slice(0, 9)
}

function getTimeDifference(date: Date, time: string): number {
  const [hour = 0, minute = 0] = time.split(':').map((part) => Number(part))
  const target = new Date(date)
  target.setHours(hour, minute, 0, 0)
  return target.getTime() - date.getTime()
}

function formatDurationToClock(diffMs: number): string {
  const safeDiff = Math.max(0, diffMs)
  const hours = Math.floor(safeDiff / 3_600_000)
  const minutes = Math.floor((safeDiff % 3_600_000) / 60_000)
  const seconds = Math.floor((safeDiff % 60_000) / 1000)
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function toMinutes(time: string): number {
  const [hour = 0, minute = 0] = time.split(':').map((part) => Number(part))
  return hour * 60 + minute
}

function compactText(...parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ') || '未记录'
}
