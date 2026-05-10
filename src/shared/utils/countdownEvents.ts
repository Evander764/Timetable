import type { CountdownEvent } from '@shared/types/app'
import { createId } from './id'

const defaultEventColor = '#2563EB'
const beijingOffsetHours = 8
const beijingOffsetMs = beijingOffsetHours * 60 * 60 * 1000
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
    targetDate: formatBeijingDateKey(now),
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
  const targetDateTime = getCountdownEventTargetDate(event)
  const expiryDate = event.targetTime ? targetDateTime : getBeijingDayExpiryDate(event.targetDate)
  const dayEnd = new Date(getBeijingDayExpiryDate(event.targetDate).getTime() - 1)
  const expired = now.getTime() >= expiryDate.getTime()
  const sortTime = event.targetTime ? targetDateTime.getTime() : dayEnd.getTime()

  return {
    expired,
    remainingLabel: expired ? '已过期' : formatRemainingTime(now, event.targetTime ? targetDateTime : dayEnd),
    targetLabel: event.targetTime ? `${event.targetDate} ${event.targetTime} 北京时间` : `${event.targetDate} 全天 · 北京时间`,
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
  if (!event.targetTime) {
    return parseBeijingDateTime(event.targetDate, '00:00')
  }
  return parseBeijingDateTime(event.targetDate, event.targetTime)
}

export function formatBeijingDateKey(date: Date): string {
  const beijingDate = new Date(date.getTime() + beijingOffsetMs)
  return [
    beijingDate.getUTCFullYear(),
    pad2(beijingDate.getUTCMonth() + 1),
    pad2(beijingDate.getUTCDate()),
  ].join('-')
}

export function getRemainingBeijingDayTime(now = new Date()): string {
  const diff = Math.max(0, getBeijingDayExpiryDate(formatBeijingDateKey(now)).getTime() - now.getTime())
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return [hours, minutes, seconds].map(pad2).join(':')
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
  return Boolean(parseDateParts(value))
}

function parseBeijingDateTime(dateKey: string, time: string): Date {
  const dateParts = parseDateParts(dateKey)
  const timeParts = parseTimeParts(time)
  if (!dateParts || !timeParts) {
    return new Date(Number.NaN)
  }

  return new Date(Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours - beijingOffsetHours,
    timeParts.minutes,
    0,
    0,
  ))
}

function getBeijingDayExpiryDate(dateKey: string): Date {
  const dateParts = parseDateParts(dateKey)
  if (!dateParts) {
    return new Date(Number.NaN)
  }

  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + 1, -beijingOffsetHours, 0, 0, 0))
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const checked = new Date(Date.UTC(year, month - 1, day))
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() + 1 !== month || checked.getUTCDate() !== day) {
    return null
  }

  return { year, month, day }
}

function parseTimeParts(value: string): { hours: number; minutes: number } | null {
  const match = timePattern.exec(value)
  if (!match) {
    return null
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}
