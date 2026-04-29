import { addDays, endOfDay, format, isValid, parse, startOfDay } from 'date-fns'
import type { CountdownEvent } from '@shared/types/app'
import { formatDateKey } from './date'
import { createId } from './id'

const defaultEventColor = '#2563EB'
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

export type CountdownEventDraftResult =
  | { event: CountdownEvent; error: null }
  | { event: null; error: string }

export type CountdownEventStatus = {
  expired: boolean
  remainingLabel: string
  targetLabel: string
  sortTime: number
}

export function createBlankCountdownEvent(now = new Date()): CountdownEvent {
  return {
    id: createId('countdown-event'),
    title: '',
    targetDate: formatDateKey(now),
    targetTime: undefined,
    note: '',
    color: defaultEventColor,
    createdAt: now.toISOString(),
  }
}

export function normalizeCountdownEventDraft(draft: CountdownEvent): CountdownEventDraftResult {
  const title = draft.title.trim()
  const targetDate = draft.targetDate.trim()
  const targetTime = draft.targetTime?.trim()
  const note = draft.note?.trim()
  const color = draft.color?.trim() || defaultEventColor

  if (!title) {
    return { event: null, error: '请输入事件名称。' }
  }

  if (!isValidDateKey(targetDate)) {
    return { event: null, error: '请选择有效的目标日期。' }
  }

  if (targetTime && !timePattern.test(targetTime)) {
    return { event: null, error: '请输入有效的目标时间。' }
  }

  return {
    event: {
      ...draft,
      title,
      targetDate,
      targetTime: targetTime || undefined,
      note: note || undefined,
      color,
    },
    error: null,
  }
}

export function getCountdownEventStatus(event: CountdownEvent, now = new Date()): CountdownEventStatus {
  const targetDate = parseDateKey(event.targetDate)
  const targetDateTime = getCountdownEventTargetDate(event)
  const expiryDate = event.targetTime ? targetDateTime : addDays(startOfDay(targetDate), 1)
  const expired = now.getTime() >= expiryDate.getTime()
  const sortTime = event.targetTime ? targetDateTime.getTime() : endOfDay(targetDate).getTime()

  return {
    expired,
    remainingLabel: expired ? '已过期' : formatRemainingTime(now, event.targetTime ? targetDateTime : endOfDay(targetDate)),
    targetLabel: event.targetTime ? `${event.targetDate} ${event.targetTime}` : `${event.targetDate} 全天`,
    sortTime,
  }
}

export function getSortedCountdownEvents(events: CountdownEvent[], now = new Date()): CountdownEvent[] {
  return [...events].sort((left, right) => {
    const leftStatus = getCountdownEventStatus(left, now)
    const rightStatus = getCountdownEventStatus(right, now)

    if (leftStatus.expired !== rightStatus.expired) {
      return leftStatus.expired ? 1 : -1
    }

    return leftStatus.expired
      ? rightStatus.sortTime - leftStatus.sortTime
      : leftStatus.sortTime - rightStatus.sortTime
  })
}

export function getNextCountdownEvent(events: CountdownEvent[], now = new Date()): CountdownEvent | null {
  return getSortedCountdownEvents(events, now).find((event) => !getCountdownEventStatus(event, now).expired) ?? null
}

export function getCountdownEventTargetDate(event: CountdownEvent): Date {
  const targetDate = parseDateKey(event.targetDate)
  if (!event.targetTime) {
    return startOfDay(targetDate)
  }
  return parse(event.targetTime, 'HH:mm', targetDate)
}

function formatRemainingTime(now: Date, target: Date): string {
  const diffMs = Math.max(0, target.getTime() - now.getTime())
  const totalMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return hours > 0 ? `${days}天 ${hours}小时` : `${days}天`
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}小时 ${minutes}分钟` : `${hours}小时`
  }

  return `${minutes}分钟`
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = parseDateKey(value)
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === value
}

function parseDateKey(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date())
}
