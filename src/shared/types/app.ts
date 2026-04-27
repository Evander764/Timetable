export type RepeatType = 'weekly' | 'odd' | 'even'
export type TaskRepeatRule = 'once' | 'daily' | 'weekly' | 'workday' | 'holiday'
export type Priority = 'low' | 'medium' | 'high'
export type GoalStatus = 'active' | 'paused' | 'completed'
export type GoalStageStatus = 'completed' | 'active' | 'pending'
export type MemoStatus = 'active' | 'ended'
export type OverlayMode = 'floating' | 'desktop'
export type CloseButtonAction = 'exit' | 'hide'
export type UsageEntryType = 'web' | 'ai'
export type PrincipleDisplayMode = 'embedded' | 'standalone'

export type WidgetPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type WidgetKey = 'mainPanel' | 'dailyTasks' | 'memo' | 'countdown' | 'principle'

export type Course = {
  id: string
  name: string
  teacher: string
  location: string
  dayOfWeek: number
  startTime: string
  endTime: string
  repeatType: RepeatType
  weekStart?: number
  weekEnd?: number
  color?: string
  note?: string
}

export type TimetableSlot = {
  id: string
  section: string
  label: string
  startTime: string
  endTime: string
}

export type BrowserUsagePage = {
  url: string
  title: string
  domain: string
  browser: string
  usageType: UsageEntryType
  processName?: string
  totalSeconds: number
  firstSeenAt: string
  lastSeenAt: string
}

export type BrowserUsageDay = {
  date: string
  totalSeconds: number
  pages: Record<string, BrowserUsagePage>
}

export type BrowserPageSample = {
  url: string
  title: string
  browser: string
  usageType?: UsageEntryType
  processName?: string
  observedAt: string
}

export type DailyTask = {
  id: string
  title: string
  repeatRule: TaskRepeatRule
  weeklyDays?: number[]
  dueTime?: string
  startDate?: string
  endDate?: string
  priority: Priority
  completions: Record<string, boolean>
  note?: string
  createdAt: string
}

export type GoalStage = {
  id: string
  title: string
  status: GoalStageStatus
  startDate?: string
  endDate?: string
}

export type GoalSubtask = {
  id: string
  title: string
  completed: boolean
  progress?: number
  total?: number
  repeatRule?: string
}

export type LongTermGoal = {
  id: string
  title: string
  status: GoalStatus
  progress: number
  targetDate?: string
  currentStageId?: string
  stages: GoalStage[]
  subtasks: GoalSubtask[]
  note?: string
  createdAt: string
}

export type Memo = {
  id: string
  title: string
  content: string
  status: MemoStatus
  showOnDesktop: boolean
  createdAt: string
  endedAt?: string
}

export type WidgetConfig = {
  enabled: boolean
  x: number
  y: number
  width: number
  height: number
  opacity: number
  minimized?: boolean
  autoHide?: boolean
  dragLocked?: boolean
}

export type PrincipleCardEntry = {
  id: string
  content: string
  author?: string
}

export type PrincipleCard = {
  enabled: boolean
  content: string
  author?: string
  cards?: PrincipleCardEntry[]
  activeCardId?: string
  autoRotate?: boolean
  rotateIntervalSeconds?: number
  displayMode?: PrincipleDisplayMode
  position: WidgetPosition
  opacity: number
  autoHide: boolean
}

export type CountdownCard = {
  enabled: boolean
  minimized: boolean
  position: WidgetPosition
  opacity: number
}

export type BackgroundMeta = {
  path: string
  name: string
  size?: number
  updatedAt: string
}

export type DesktopSettings = {
  overlayEnabled: boolean
  opacity: number
  scale: number
  alwaysOnTop: boolean
  autoHide: boolean
  dragLocked: boolean
  overlayMode: OverlayMode
  backgroundImage?: string
  backgroundMeta?: BackgroundMeta
  widgets: Record<WidgetKey, WidgetConfig>
}

export type AppSettings = {
  autoSave: boolean
  launchAtStartup: boolean
  closeButtonAction: CloseButtonAction
  trayOnlyQuitEnabled: boolean
  browserTrackingEnabled: boolean
  browserTrackingIntervalSeconds: number
  dataPath: string
  termStartDate: string
  termWeekCount: number
  timetableSlots: TimetableSlot[]
  desktopLayoutVersion?: number
  opacityVersion?: number
  autoBackupEnabled: boolean
  autoCheckForUpdates: boolean
  lastBackupAt?: string
  lastBackupPath?: string
  lastAutoBackupDate?: string
  lastUpdateCheckAt?: string
  lastSavedAt?: string
  lastExportedAt?: string
}

export type AppData = {
  courses: Course[]
  dailyTasks: DailyTask[]
  longTermGoals: LongTermGoal[]
  memos: Memo[]
  principleCard: PrincipleCard
  countdownCard: CountdownCard
  desktopSettings: DesktopSettings
  appSettings: AppSettings
  browserUsage: Record<string, BrowserUsageDay>
}

export type DashboardStats = {
  completionRate: number
  pendingTaskCount: number
  todayCourseCount: number
  activeGoalCount: number
}
