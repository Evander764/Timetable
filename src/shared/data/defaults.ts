import type { AppData, Course, DailyTask, LongTermGoal, Memo, WidgetConfig } from '@shared/types/app'
import { createId } from '@shared/utils/id'
import { formatDateKey, getWeekStart } from '@shared/utils/date'
import { DEFAULT_COURSE_REMINDER_MINUTES, defaultTimetableSlots } from '@shared/utils/course'
import { DEFAULT_DESKTOP_AUTO_HIDE_DELAY_MS, DEFAULT_OVERLAY_OPACITY, OVERLAY_OPACITY_VERSION } from '@shared/utils/widgets'
import { addDays, format, subDays } from 'date-fns'

const cardBase = {
  enabled: true,
  opacity: DEFAULT_OVERLAY_OPACITY,
}

function widget(x: number, y: number, width: number, height: number, config?: Partial<WidgetConfig>): WidgetConfig {
  return {
    ...cardBase,
    x,
    y,
    width,
    height,
    autoHide: false,
    minimized: false,
    ...config,
  }
}

export function createDefaultDesktopSettings(): AppData['desktopSettings'] {
  return {
    overlayEnabled: true,
    opacity: DEFAULT_OVERLAY_OPACITY,
    scale: 1,
    alwaysOnTop: true,
    autoHide: false,
    dragLocked: false,
    overlayMode: 'floating',
    widgets: {
      mainPanel: widget(40, 42, 560, 640),
      dailyTasks: widget(640, 72, 430, 430, { enabled: false }),
      memo: widget(640, 520, 420, 380, { enabled: false }),
      countdown: widget(40, 710, 390, 54, { minimized: true }),
      principle: widget(640, 42, 400, 190, { enabled: false }),
    },
  }
}

function buildDefaultCourses(): Course[] {
  const common = { weekStart: 1, weekEnd: 20 }
  return [
    {
      id: createId('course'),
      name: '数据结构与算法',
      teacher: '张老师',
      location: '教学楼 A301',
      dayOfWeek: 2,
      startTime: '08:30',
      endTime: '09:55',
      repeatType: 'weekly',
      color: '#3B82F6',
      ...common,
    },
    {
      id: createId('course'),
      name: '数据结构与算法',
      teacher: '张老师',
      location: '教学楼 A301',
      dayOfWeek: 4,
      startTime: '08:30',
      endTime: '09:55',
      repeatType: 'weekly',
      color: '#3B82F6',
      ...common,
    },
    {
      id: createId('course'),
      name: '操作系统原理',
      teacher: '李老师',
      location: '教学楼 B205',
      dayOfWeek: 2,
      startTime: '10:15',
      endTime: '11:40',
      repeatType: 'weekly',
      color: '#14B8A6',
      ...common,
    },
    {
      id: createId('course'),
      name: '英语视听说',
      teacher: '王老师',
      location: '外语楼 305',
      dayOfWeek: 2,
      startTime: '14:15',
      endTime: '15:40',
      repeatType: 'weekly',
      color: '#8B5CF6',
      ...common,
    },
    {
      id: createId('course'),
      name: '英语视听说',
      teacher: '王老师',
      location: '外语楼 305',
      dayOfWeek: 4,
      startTime: '14:15',
      endTime: '15:40',
      repeatType: 'weekly',
      color: '#8B5CF6',
      ...common,
    },
    {
      id: createId('course'),
      name: '高等数学',
      teacher: '刘老师',
      location: '教学楼 A201',
      dayOfWeek: 3,
      startTime: '10:15',
      endTime: '11:40',
      repeatType: 'weekly',
      color: '#F97316',
      ...common,
    },
    {
      id: createId('course'),
      name: '高等数学',
      teacher: '刘老师',
      location: '教学楼 A201',
      dayOfWeek: 5,
      startTime: '10:15',
      endTime: '11:40',
      repeatType: 'weekly',
      color: '#F97316',
      ...common,
    },
    {
      id: createId('course'),
      name: '线性代数',
      teacher: '陈老师',
      location: '教学楼 A102',
      dayOfWeek: 3,
      startTime: '16:00',
      endTime: '17:25',
      repeatType: 'weekly',
      color: '#EAB308',
      ...common,
    },
    {
      id: createId('course'),
      name: '线性代数',
      teacher: '陈老师',
      location: '教学楼 A102',
      dayOfWeek: 5,
      startTime: '16:00',
      endTime: '17:25',
      repeatType: 'weekly',
      color: '#EAB308',
      ...common,
    },
  ]
}

function buildDefaultTasks(today: Date): DailyTask[] {
  const todayKey = formatDateKey(today)
  return [
    { id: createId('task'), title: '背单词 50 个', repeatRule: 'daily', dueTime: '09:00', priority: 'high', completions: { [todayKey]: true }, createdAt: today.toISOString() },
    { id: createId('task'), title: '阅读 30 分钟', repeatRule: 'daily', dueTime: '10:30', priority: 'medium', completions: { [todayKey]: true }, createdAt: today.toISOString() },
    { id: createId('task'), title: '运动 30 分钟', repeatRule: 'daily', dueTime: '18:00', priority: 'medium', completions: {}, createdAt: today.toISOString() },
    { id: createId('task'), title: '整理课堂笔记', repeatRule: 'workday', dueTime: '19:30', priority: 'medium', completions: {}, createdAt: today.toISOString() },
    {
      id: createId('task'),
      title: '复习数据结构（栈与队列）',
      repeatRule: 'weekly',
      weeklyDays: [2, 4, 6],
      dueTime: '21:00',
      priority: 'high',
      completions: { [todayKey]: true },
      createdAt: today.toISOString(),
    },
    { id: createId('task'), title: '写日记 10 分钟', repeatRule: 'daily', dueTime: '21:30', priority: 'low', completions: {}, createdAt: today.toISOString() },
    { id: createId('task'), title: '睡前冥想 10 分钟', repeatRule: 'daily', dueTime: '22:00', priority: 'low', completions: {}, createdAt: today.toISOString() },
  ]
}

function buildDefaultGoals(today: Date): LongTermGoal[] {
  return [
    {
      id: createId('goal'),
      title: '考研备战（数据结构方向）',
      status: 'active',
      progress: 65,
      targetDate: format(addDays(today, 207), 'yyyy-MM-dd'),
      currentStageId: 'stage-3',
      stages: [
        { id: 'stage-1', title: '基础学习', status: 'completed', startDate: format(subDays(today, 120), 'yyyy-MM-dd') },
        { id: 'stage-2', title: '强化练习', status: 'completed', startDate: format(subDays(today, 60), 'yyyy-MM-dd') },
        { id: 'stage-3', title: '刷题冲刺', status: 'active', startDate: format(subDays(today, 15), 'yyyy-MM-dd') },
        { id: 'stage-4', title: '模拟考试', status: 'pending' },
      ],
      subtasks: [
        { id: createId('subtask'), title: 'LeetCode 每日 2 题', completed: true, progress: 32, total: 100, repeatRule: 'daily' },
        { id: createId('subtask'), title: '算法模板复习与整理', completed: true, progress: 8, total: 12, repeatRule: 'weekly' },
        { id: createId('subtask'), title: '专项题型突破（链表/树/图）', completed: false, progress: 3, total: 8, repeatRule: 'weekly' },
        { id: createId('subtask'), title: '错题重做与总结', completed: false, progress: 1, total: 6, repeatRule: 'weekly' },
      ],
      note: '目标需要拆解，拆解需要行动，行动带来结果。',
      createdAt: today.toISOString(),
    },
    {
      id: createId('goal'),
      title: '英语六级通过',
      status: 'active',
      progress: 40,
      targetDate: format(addDays(today, 18), 'yyyy-MM-dd'),
      currentStageId: 'stage-6',
      stages: [
        { id: 'stage-5', title: '词汇积累', status: 'completed' },
        { id: 'stage-6', title: '真题训练', status: 'active' },
        { id: 'stage-7', title: '模拟考试', status: 'pending' },
        { id: 'stage-8', title: '考前冲刺', status: 'pending' },
      ],
      subtasks: [
        { id: createId('subtask'), title: '真题听力训练', completed: true, progress: 5, total: 8 },
        { id: createId('subtask'), title: '作文模板背诵', completed: false, progress: 2, total: 6 },
      ],
      createdAt: today.toISOString(),
    },
    {
      id: createId('goal'),
      title: '个人作品集完成',
      status: 'paused',
      progress: 20,
      targetDate: format(addDays(today, 64), 'yyyy-MM-dd'),
      currentStageId: 'stage-9',
      stages: [
        { id: 'stage-9', title: '需求梳理', status: 'active' },
        { id: 'stage-10', title: '页面实现', status: 'pending' },
        { id: 'stage-11', title: '内容填充', status: 'pending' },
      ],
      subtasks: [
        { id: createId('subtask'), title: '信息架构整理', completed: false, progress: 1, total: 5 },
      ],
      createdAt: today.toISOString(),
    },
  ]
}

function buildDefaultMemos(today: Date): Memo[] {
  return [
    {
      id: createId('memo'),
      title: '毕业设计思路整理',
      content: '主要功能模块：用户管理、数据分析、可视化展示与交互优化。',
      status: 'active',
      showOnDesktop: true,
      createdAt: today.toISOString(),
    },
    {
      id: createId('memo'),
      title: '考研专业课复习要点',
      content: '重点在数据结构的时间复杂度分析、图的遍历、动态规划常见模型。',
      status: 'active',
      showOnDesktop: false,
      createdAt: subDays(today, 7).toISOString(),
    },
  ]
}

export function createDefaultAppData(dataPath: string): AppData {
  const today = new Date()
  const currentWeekStart = getWeekStart(today)
  const termStartDate = format(subDays(currentWeekStart, 7 * 11), 'yyyy-MM-dd')

  return {
    courses: buildDefaultCourses(),
    dailyTasks: buildDefaultTasks(today),
    longTermGoals: buildDefaultGoals(today),
    memos: buildDefaultMemos(today),
    countdownEvents: [],
    principleCard: {
      enabled: true,
      content: '真正的自由，不是随心所欲，\n而是自我主宰。',
      author: '—— 斯多葛学派',
      displayMode: 'embedded',
      position: 'bottom-center',
      opacity: DEFAULT_OVERLAY_OPACITY,
      autoHide: false,
      autoRotate: false,
      rotateIntervalSeconds: 60,
    },
    countdownCard: {
      enabled: true,
      minimized: true,
      position: 'bottom-left',
      opacity: DEFAULT_OVERLAY_OPACITY,
    },
    desktopSettings: createDefaultDesktopSettings(),
    appSettings: {
      autoSave: true,
      launchAtStartup: false,
      closeButtonAction: 'exit',
      trayOnlyQuitEnabled: true,
      browserTrackingEnabled: true,
      browserTrackingIntervalSeconds: 10,
      desktopLayoutVersion: 2,
      opacityVersion: OVERLAY_OPACITY_VERSION,
      dataPath,
      termStartDate,
      termWeekCount: 20,
      timetableSlots: defaultTimetableSlots,
      courseReminderEnabled: true,
      courseReminderMinutes: DEFAULT_COURSE_REMINDER_MINUTES,
      desktopAutoHideDelayMs: DEFAULT_DESKTOP_AUTO_HIDE_DELAY_MS,
      desktopLayoutLockEnabled: false,
      autoBackupEnabled: true,
      autoCheckForUpdates: true,
    },
    browserUsage: {},
  }
}
