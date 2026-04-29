import type {
  AppData,
  AppSettings,
  BrowserUsageDay,
  CountdownCard,
  CountdownItem,
  DesktopSettings,
  PrincipleCard,
  WidgetConfig,
  WidgetKey,
  WidgetPosition,
} from './types/app'

export type DataAction =
  | { type: 'course/upsert'; payload: AppData['courses'][number] }
  | { type: 'course/delete'; payload: { id: string } }
  | { type: 'task/upsert'; payload: AppData['dailyTasks'][number] }
  | { type: 'task/delete'; payload: { id: string } }
  | { type: 'task/toggle'; payload: { id: string; date: string; completed: boolean } }
  | { type: 'goal/upsert'; payload: AppData['longTermGoals'][number] }
  | { type: 'goal/delete'; payload: { id: string } }
  | { type: 'goal/advance'; payload: { id: string } }
  | { type: 'goal/progress'; payload: { id: string; progress: number } }
  | { type: 'memo/upsert'; payload: AppData['memos'][number] }
  | { type: 'memo/delete'; payload: { id: string } }
  | { type: 'memo/end'; payload: { id: string; endedAt: string } }
  | { type: 'countdownItem/upsert'; payload: CountdownItem }
  | { type: 'countdownItem/delete'; payload: { id: string } }
  | { type: 'countdownItem/pin'; payload: { id: string | null } }
  | { type: 'principle/update'; payload: Partial<PrincipleCard> }
  | { type: 'countdown/update'; payload: Partial<CountdownCard> }

export type SettingsUpdatePayload = {
  desktopSettings?: Omit<Partial<DesktopSettings>, 'widgets'> & {
    widgets?: Partial<Record<WidgetKey, Partial<WidgetConfig>>>
  }
  appSettings?: Partial<AppSettings>
  principleCard?: Partial<PrincipleCard>
  countdownCard?: Partial<CountdownCard>
}

export type OverlayWidgetUpdatePayload = {
  key: WidgetKey
  changes: Partial<WidgetConfig>
}

export type AppDataPatch =
  | { type: 'widget/replace'; payload: { key: WidgetKey; widget: WidgetConfig } }
  | { type: 'browserUsage/dayReplace'; payload: { date: string; day: BrowserUsageDay } }

export type OverlaySnapPositionPayload = {
  key: WidgetKey
  position: WidgetPosition
}

export type SelectBackgroundResult = {
  path?: string
  name?: string
  size?: number
}

export type ExportDataResult = {
  canceled: boolean
  filePath?: string
}

export type DataBackupReason = 'daily' | 'migration' | 'manual'

export type DataBackupSummary = {
  id: string
  createdAt: string
  reason: DataBackupReason
  filePath: string
  size: number
}

export type WindowControlAction = 'minimize' | 'maximize' | 'close'

export type WindowStatePayload = {
  isMaximized: boolean
}

export type TimeableApi = {
  loadData: () => Promise<AppData>
  updateData: (action: DataAction) => Promise<AppData>
  updateSettings: (payload: SettingsUpdatePayload) => Promise<AppData>
  updateOverlayWidget: (payload: OverlayWidgetUpdatePayload) => Promise<AppData>
  snapOverlayPosition: (payload: OverlaySnapPositionPayload) => Promise<AppData>
  showOverlay: () => Promise<void>
  hideOverlay: () => Promise<void>
  setStartup: (enabled: boolean) => Promise<AppData>
  selectBackground: () => Promise<SelectBackgroundResult | null>
  exportData: () => Promise<ExportDataResult>
  listDataBackups: () => Promise<DataBackupSummary[]>
  restoreDataBackup: (id: string) => Promise<AppData>
  saveBrowserUsageDay: (date: string) => Promise<ExportDataResult>
  filePathToUrl: (filePath: string) => string
  windowControl: (action: WindowControlAction) => Promise<void>
  overlayHover: (key: WidgetKey, hovering: boolean) => void
  onDataChanged: (listener: (data: AppData) => void) => () => void
  onDataPatched: (listener: (patch: AppDataPatch) => void) => () => void
  onWindowStateChanged: (listener: (payload: WindowStatePayload) => void) => () => void
}
