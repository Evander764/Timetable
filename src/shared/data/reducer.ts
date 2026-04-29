import type { AppData, WidgetKey } from '@shared/types/app'
import type { AppDataPatch, DataAction, OverlayWidgetUpdatePayload, SettingsUpdatePayload } from '@shared/ipc'
import { advanceGoalStage } from '@shared/utils/goals'

type WidgetUpdateMap = Partial<Record<WidgetKey, Partial<AppData['desktopSettings']['widgets'][WidgetKey]>>>

function upsertById<T extends { id: string }>(items: T[], value: T): T[] {
  const index = items.findIndex((item) => item.id === value.id)
  if (index === -1) {
    return [value, ...items]
  }

  return items.map((item, currentIndex) => (currentIndex === index ? value : item))
}

function mergeWidgets(
  current: AppData['desktopSettings']['widgets'],
  updates: WidgetUpdateMap | undefined,
): AppData['desktopSettings']['widgets'] {
  if (!updates) {
    return current
  }

  const next = { ...current }
  for (const [key, value] of Object.entries(updates)) {
    const widgetKey = key as WidgetKey
    const currentWidget = next[widgetKey]
    if (!currentWidget || !value) {
      continue
    }
    next[widgetKey] = {
      ...currentWidget,
      ...value,
    }
  }

  return next
}

export function applyDataAction(data: AppData, action: DataAction): AppData {
  switch (action.type) {
    case 'course/upsert':
      return { ...data, courses: upsertById(data.courses, action.payload) }
    case 'course/delete':
      return { ...data, courses: data.courses.filter((course) => course.id !== action.payload.id) }
    case 'task/upsert':
      return { ...data, dailyTasks: upsertById(data.dailyTasks, action.payload) }
    case 'task/delete':
      return { ...data, dailyTasks: data.dailyTasks.filter((task) => task.id !== action.payload.id) }
    case 'task/toggle':
      return {
        ...data,
        dailyTasks: data.dailyTasks.map((task) =>
          task.id === action.payload.id
            ? {
                ...task,
                completions: {
                  ...task.completions,
                  [action.payload.date]: action.payload.completed,
                },
              }
            : task,
        ),
      }
    case 'goal/upsert':
      return { ...data, longTermGoals: upsertById(data.longTermGoals, action.payload) }
    case 'goal/delete':
      return { ...data, longTermGoals: data.longTermGoals.filter((goal) => goal.id !== action.payload.id) }
    case 'goal/advance':
      return {
        ...data,
        longTermGoals: data.longTermGoals.map((goal) => (goal.id === action.payload.id ? advanceGoalStage(goal) : goal)),
      }
    case 'goal/progress':
      return {
        ...data,
        longTermGoals: data.longTermGoals.map((goal) =>
          goal.id === action.payload.id ? { ...goal, progress: action.payload.progress } : goal,
        ),
      }
    case 'memo/upsert':
      return { ...data, memos: upsertById(data.memos, action.payload) }
    case 'memo/delete':
      return { ...data, memos: data.memos.filter((memo) => memo.id !== action.payload.id) }
    case 'memo/end':
      return {
        ...data,
        memos: data.memos.map((memo) =>
          memo.id === action.payload.id
            ? { ...memo, status: 'ended', showOnDesktop: false, endedAt: action.payload.endedAt }
            : memo,
        ),
      }
    case 'countdownItem/upsert':
      return { ...data, countdownItems: upsertById(data.countdownItems, action.payload) }
    case 'countdownItem/delete':
      return {
        ...data,
        countdownItems: data.countdownItems.filter((item) => item.id !== action.payload.id),
        countdownCard: data.countdownCard.pinnedItemId === action.payload.id
          ? {
              ...data.countdownCard,
              pinnedItemId: undefined,
            }
          : data.countdownCard,
      }
    case 'countdownItem/pin':
      return {
        ...data,
        countdownCard: {
          ...data.countdownCard,
          pinnedItemId: action.payload.id ?? undefined,
        },
      }
    case 'principle/update':
      return { ...data, principleCard: { ...data.principleCard, ...action.payload } }
    case 'countdown/update':
      return { ...data, countdownCard: { ...data.countdownCard, ...action.payload } }
    default:
      return data
  }
}

export function applySettingsUpdate(data: AppData, payload: SettingsUpdatePayload): AppData {
  let nextData = data

  if (payload.desktopSettings) {
    const { widgets, ...desktopSettings } = payload.desktopSettings
    nextData = {
      ...nextData,
      desktopSettings: {
        ...nextData.desktopSettings,
        ...desktopSettings,
        widgets: mergeWidgets(nextData.desktopSettings.widgets, widgets),
      },
    }
  }

  if (payload.appSettings) {
    nextData = {
      ...nextData,
      appSettings: {
        ...nextData.appSettings,
        ...payload.appSettings,
      },
    }
  }

  if (payload.principleCard) {
    nextData = {
      ...nextData,
      principleCard: {
        ...nextData.principleCard,
        ...payload.principleCard,
      },
    }
  }

  if (payload.countdownCard) {
    nextData = {
      ...nextData,
      countdownCard: {
        ...nextData.countdownCard,
        ...payload.countdownCard,
      },
    }
  }

  return nextData
}

export function applyOverlayWidgetUpdate(data: AppData, payload: OverlayWidgetUpdatePayload): AppData {
  const key = payload.key as WidgetKey
  return {
    ...data,
    desktopSettings: {
      ...data.desktopSettings,
      widgets: {
        ...data.desktopSettings.widgets,
        [key]: {
          ...data.desktopSettings.widgets[key],
          ...payload.changes,
        },
      },
    },
  }
}

export function applyDataPatch(data: AppData, patch: AppDataPatch): AppData {
  switch (patch.type) {
    case 'widget/replace':
      return {
        ...data,
        desktopSettings: {
          ...data.desktopSettings,
          widgets: {
            ...data.desktopSettings.widgets,
            [patch.payload.key]: patch.payload.widget,
          },
        },
      }
    case 'browserUsage/dayReplace':
      return {
        ...data,
        browserUsage: {
          ...data.browserUsage,
          [patch.payload.date]: patch.payload.day,
        },
      }
    default:
      return data
  }
}
