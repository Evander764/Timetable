import type {
  AppData,
  AppSettings,
  CountdownCard,
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
  | { type: 'principle/update'; payload: Partial<PrincipleCard> }
  | { type: 'countdown/update'; payload: Partial<CountdownCard> }

export type SettingsUpdatePayload = {
  desktopSettings?: Partial<DesktopSettings>
  appSettings?: Partial<AppSettings>
  principleCard?: Partial<PrincipleCard>
  countdownCard?: Partial<CountdownCard>
}

export type OverlayWidgetUpdatePayload = {
  key: WidgetKey
  changes: Partial<WidgetConfig>
}

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
  filePathToUrl: (filePath: string) => string
  windowControl: (action: WindowControlAction) => Promise<void>
  overlayHover: (key: WidgetKey, hovering: boolean) => void
  onDataChanged: (listener: (data: AppData) => void) => () => void
  onWindowStateChanged: (listener: (payload: WindowStatePayload) => void) => () => void
}
