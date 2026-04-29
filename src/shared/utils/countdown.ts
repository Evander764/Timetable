import type { CountdownItem } from '@shared/types/app'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export type CountdownDisplay = {
  item: CountdownItem | null
  label: string
  value: string
  meta?: string
  expired: boolean
}

export function sortCountdownItems(items: CountdownItem[]): CountdownItem[] {
  return [...items].sort((left, right) => {
    const leftTime = getTargetTime(left)
    const rightTime = getTargetTime(right)
    if (leftTime !== rightTime) {
      return leftTime - rightTime
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

export function getPinnedCountdownItem(items: CountdownItem[], pinnedItemId: string | undefined): CountdownItem | null {
  if (!pinnedItemId) {
    return null
  }

  return items.find((item) => item.id === pinnedItemId) ?? null
}

export function getCountdownDisplay(
  items: CountdownItem[],
  pinnedItemId: string | undefined,
  now: Date,
): CountdownDisplay | null {
  const item = getPinnedCountdownItem(items, pinnedItemId)
  if (!item) {
    return null
  }

  return getCountdownItemDisplay(item, now)
}

export function getCountdownItemDisplay(item: CountdownItem, now: Date): CountdownDisplay {
  const target = new Date(item.targetAt)
  const targetTime = target.getTime()
  if (Number.isNaN(targetTime)) {
    return {
      item,
      label: item.title,
      value: 'Invalid time',
      meta: 'Check target',
      expired: true,
    }
  }

  const diff = targetTime - now.getTime()
  const expired = diff <= 0
  return {
    item,
    label: item.title,
    value: expired ? 'Reached' : formatDuration(diff),
    meta: formatTarget(target),
    expired,
  }
}

function getTargetTime(item: CountdownItem): number {
  const time = new Date(item.targetAt).getTime()
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}

function formatDuration(milliseconds: number): string {
  const total = Math.max(0, milliseconds)
  const days = Math.floor(total / DAY_MS)
  const hours = Math.floor((total % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((total % HOUR_MS) / MINUTE_MS)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

function formatTarget(target: Date): string {
  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  const hour = String(target.getHours()).padStart(2, '0')
  const minute = String(target.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
