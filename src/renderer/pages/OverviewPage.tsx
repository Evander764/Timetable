import type { ReactNode } from 'react'
import { CalendarClock, CheckCircle2, FolderClock, GraduationCap, Quote, Target } from 'lucide-react'
import defaultBackground from '@renderer/assets/default-background.svg'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { MetricRing } from '@renderer/components/MetricRing'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { useAppStore } from '@renderer/store/appStore'
import { getCoursesForDate, getNextCourse } from '@shared/utils/course'
import { formatDateKey, getCompactChineseDate, getChineseWeekdayLabel, getLunarLabel } from '@shared/utils/date'
import { getActiveGoalCount } from '@shared/utils/goals'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday, getTaskStreak, getTasksForDate } from '@shared/utils/tasks'

export function OverviewPage() {
  const data = useAppStore((state) => state.data)

  if (!data) {
    return <LoadingState />
  }

  const today = new Date()
  const todayCourses = getCoursesForDate(data.courses, today, data.appSettings.termStartDate)
  const nextCourse = getNextCourse(data.courses, today, data.appSettings.termStartDate)
  const todayTasks = getTasksForDate(data.dailyTasks, today)
  const progress = getDayProgressBreakdown(data.dailyTasks, today)
  const completionRate = getCompletionRate(data.dailyTasks, today)
  const activeGoals = data.longTermGoals.filter((goal) => goal.status === 'active')
  const activeGoalCount = getActiveGoalCount(data.longTermGoals)
  const activeMemos = data.memos.filter((memo) => memo.status === 'active')
  const backgroundPreview = data.desktopSettings.backgroundImage
    ? window.timeable.filePathToUrl(data.desktopSettings.backgroundImage)
    : defaultBackground

  return (
    <div className="space-y-6">
      <PageHeader title="总览" subtitle="把课程、任务、目标、备忘与桌面挂件集中在一个控制中心。" />

      <div className="grid grid-cols-5 gap-4">
        <Card className="flex items-center gap-5">
          <MetricRing value={completionRate} size={98} label="良好" />
          <div>
            <div className="text-sm text-slate-500">今日完成率</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{completionRate}%</div>
          </div>
        </Card>
        <StatBlock icon={<CheckCircle2 className="text-blue-600" />} title="待办数" value={`${progress.pending}`} subtitle="待完成任务" />
        <StatBlock icon={<GraduationCap className="text-violet-600" />} title="课程数" value={`${todayCourses.length}`} subtitle="今日课程" />
        <StatBlock icon={<Target className="text-emerald-600" />} title="进行中目标" value={`${activeGoalCount}`} subtitle="正在推进" />
        <Card className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <CalendarClock size={28} />
          </div>
          <div>
            <div className="text-3xl font-semibold text-slate-900">{getCompactChineseDate(today)}</div>
            <div className="mt-2 text-base text-slate-500">{getChineseWeekdayLabel(today)}</div>
            <div className="mt-1 text-sm text-slate-400">{getLunarLabel(today)}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.06fr_1fr_1.12fr] gap-4">
        <Card>
          <SectionTitle title="今天课程" trailing={todayCourses.length ? `${todayCourses.length} 节` : undefined} />
          <div className="mt-4 space-y-3">
            {todayCourses.length ? (
              todayCourses.slice(0, 4).map((course, index) => (
                <div key={course.id} className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-semibold text-slate-900">{course.startTime}</div>
                    {index === 0 ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-600">下一节课</span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{course.name}</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>{course.endTime}</span>
                    <span>{course.teacher}</span>
                    <span>{course.location}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="今天没有课程" description="当前日期下没有匹配课程，可以去课程表页继续添加安排。" />
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle title="每日任务" trailing={`${completionRate}%`} />
          <div className="mt-5 space-y-4">
            <ProgressBar value={completionRate} className="h-3" />
            <div className="grid grid-cols-[1fr_120px] gap-4">
              <div className="space-y-3">
                {todayTasks.slice(0, 5).map((task) => {
                  const completed = Boolean(task.completions[formatDateKey(today)])
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">
                      <div className={`h-5 w-5 rounded-md border ${completed ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`} />
                      <span className="flex-1 text-lg text-slate-800">{task.title}</span>
                    </div>
                  )
                })}
              </div>
              <div className="rounded-[24px] border border-slate-200/70 bg-white/88 p-4 text-center">
                <div className="text-sm text-slate-500">连续打卡</div>
                <div className="mt-2 text-5xl font-semibold text-slate-900">{getTaskStreak(data.dailyTasks, today)}</div>
                <div className="mt-2 text-base text-slate-500">继续加油</div>
                <div className="mt-4 text-4xl">🔥</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="长期任务" trailing={`${activeGoals.length} 项`} />
          <div className="mt-4 space-y-3">
            {activeGoals.slice(0, 2).map((goal) => (
              <div key={goal.id} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-900">{goal.title}</div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">进行中</span>
                </div>
                <div className="mt-4">
                  <ProgressBar value={goal.progress} className="h-3" accentClassName="bg-emerald-500" />
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  目标日期：{goal.targetDate ?? '未设定'} 当前阶段：
                  {goal.stages.find((stage) => stage.status === 'active')?.title ?? '未开始'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[0.92fr_0.88fr_0.9fr_0.92fr] gap-4">
        <Card>
          <SectionTitle title="备忘录" trailing={`${activeMemos.length} 条`} />
          <div className="mt-4 space-y-3">
            {activeMemos.slice(0, 2).map((memo) => (
              <div key={memo.id} className="rounded-[22px] border border-amber-200/80 bg-amber-50/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xl font-semibold text-slate-900">{memo.title}</div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-amber-700">{memo.showOnDesktop ? '桌面显示' : '仅应用内'}</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{memo.content}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="倒计时卡片" trailing="实时更新" />
          <div className="mt-6 text-center">
            <div className="text-sm text-slate-500">今日剩余时间</div>
            <div className="mt-4 text-6xl font-semibold tracking-tight text-[var(--color-primary)]">{getRemainingTimeToday(today)}</div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <SmallStat label="总任务" value={`${progress.total}`} />
              <SmallStat label="已完成" value={`${progress.completed}`} valueClassName="text-emerald-600" />
              <SmallStat label="待完成" value={`${progress.pending}`} />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionTitle title="道理卡片" trailing={<Quote size={18} className="text-blue-500" />} />
          <div className="flex flex-1 flex-col justify-center px-4 py-3 text-center">
            <div className="text-4xl text-slate-200">“</div>
            <div className="text-[32px] font-semibold leading-[1.45] tracking-tight text-slate-900 whitespace-pre-line">
              {data.principleCard.content}
            </div>
            <div className="mt-4 text-lg text-slate-500">{data.principleCard.author}</div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="背景与设置" trailing="本地保存" />
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 text-sm text-slate-600">
              <StatusRow label="本地存储" value="JSON 格式" active />
              <StatusRow label="自动保存" value={data.appSettings.autoSave ? '已开启' : '已关闭'} active={data.appSettings.autoSave} />
              <StatusRow label="开机启动" value={data.appSettings.launchAtStartup ? '已启用' : '未启用'} active={data.appSettings.launchAtStartup} />
              <StatusRow label="当前背景" value={data.desktopSettings.backgroundMeta?.name ?? '湖光山色'} active />
            </div>
            <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/90">
              <img src={backgroundPreview} alt="背景预览" className="h-32 w-full object-cover" />
            </div>
          </div>
        </Card>
      </div>

      <div className="panel-card flex items-center justify-between px-6 py-5 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <FolderClock size={18} className="text-blue-500" />
          <span>所有数据仅存储在本地，不会上云，也不依赖任何联网服务。</span>
        </div>
        {nextCourse ? <span>下一节：{nextCourse.name} {nextCourse.startTime}</span> : <span>今天暂时没有后续课程安排</span>}
      </div>
    </div>
  )
}

function StatBlock({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: ReactNode
  title: string
  value: string
  subtitle: string
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50">{icon}</div>
      <div>
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-1 text-4xl font-semibold text-slate-900">{value}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>
    </Card>
  )
}

function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[30px] font-semibold tracking-tight text-slate-900">{title}</h2>
      {typeof trailing === 'string' ? <span className="text-sm text-slate-500">{trailing}</span> : trailing}
    </div>
  )
}

function SmallStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-white/85 px-3 py-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold text-slate-900 ${valueClassName ?? ''}`}>{value}</div>
    </div>
  )
}

function StatusRow({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3">
      <span>{label}</span>
      <span className={active ? 'font-medium text-emerald-600' : 'font-medium text-slate-700'}>{value}</span>
    </div>
  )
}
