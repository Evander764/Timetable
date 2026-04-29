import type { AppData, BrowserUsageDay, BrowserUsagePage, UsageEntryType } from '@shared/types/app'
import { formatDateKey } from '@shared/utils/date'

export type BrowserPageSample = {
  url: string
  title?: string
  browser: string
  usageType?: UsageEntryType
  processName?: string
  observedAt: string
}

export type NormalizedBrowserPageSample = BrowserPageSample & {
  title: string
  domain: string
  usageType: UsageEntryType
}

export type BrowserUsageDaySnapshotEntry = {
  type: UsageEntryType
  title: string
  source: string
  url?: string
  browser?: string
  totalSeconds: number
  duration: string
  percent: number
  firstSeenAt: string
  lastSeenAt: string
}

export type BrowserUsageDaySnapshot = {
  schemaVersion: 1
  date: string
  savedAt: string
  totalSeconds: number
  totalDuration: string
  webSeconds: number
  webDuration: string
  aiSeconds: number
  aiDuration: string
  webPageCount: number
  aiServiceCount: number
  entries: BrowserUsageDaySnapshotEntry[]
}

const PAGE_TITLE_MAX_LENGTH = 180
const AI_USAGE_SERVICES = [
  { id: 'chatgpt', label: 'ChatGPT', domains: ['chatgpt.com', 'chat.openai.com'] },
  { id: 'kimi', label: 'Kimi', domains: ['kimi.moonshot.cn', 'kimi.com', 'moonshot.cn'] },
  { id: 'deepseek', label: 'DeepSeek', domains: ['chat.deepseek.com', 'deepseek.com'] },
  { id: 'gemini', label: 'Gemini', domains: ['gemini.google.com', 'bard.google.com'] },
  { id: 'claude', label: 'Claude', domains: ['claude.ai'] },
  { id: 'claude-code', label: 'Claude Code', domains: [] },
  { id: 'codex', label: 'Codex', domains: [] },
] as const

export function normalizeBrowserPageSample(sample: BrowserPageSample): NormalizedBrowserPageSample | null {
  const usageType = sample.usageType ?? 'web'
  const normalizedUrl = usageType === 'ai' ? normalizeAiUsageKey(sample.url, sample.browser) : normalizeBrowserUrl(sample.url)
  if (!normalizedUrl) {
    return null
  }

  const domain = usageType === 'ai' ? normalizeAiAppName(sample.browser) : normalizeDomain(new URL(normalizedUrl).hostname)
  const title = normalizePageTitle(sample.title, domain)
  return {
    ...sample,
    url: normalizedUrl,
    title,
    domain,
    usageType,
  }
}

export function recordBrowserUsageSample(
  data: AppData,
  sample: NormalizedBrowserPageSample,
  durationSeconds: number,
): AppData {
  const seconds = Math.max(0, Math.round(durationSeconds))
  if (seconds === 0) {
    return data
  }

  const observedAt = new Date(sample.observedAt)
  const date = formatDateKey(Number.isNaN(observedAt.getTime()) ? new Date() : observedAt)
  const day = data.browserUsage[date] ?? createEmptyBrowserUsageDay(date)
  const existingPage = day.pages[sample.url]
  const nextPage: BrowserUsagePage = existingPage
    ? {
        ...existingPage,
        title: sample.title || existingPage.title,
        domain: sample.domain,
        browser: sample.browser,
        usageType: sample.usageType,
        processName: sample.processName ?? existingPage.processName,
        totalSeconds: existingPage.totalSeconds + seconds,
        lastSeenAt: sample.observedAt,
      }
    : {
        url: sample.url,
        title: sample.title,
        domain: sample.domain,
        browser: sample.browser,
        usageType: sample.usageType,
        processName: sample.processName,
        totalSeconds: seconds,
        firstSeenAt: sample.observedAt,
        lastSeenAt: sample.observedAt,
      }

  return {
    ...data,
    browserUsage: {
      ...data.browserUsage,
      [date]: {
        ...day,
        totalSeconds: day.totalSeconds + seconds,
        pages: {
          ...day.pages,
          [sample.url]: nextPage,
        },
      },
    },
  }
}

export function getBrowserUsageDay(data: AppData, date: string): BrowserUsageDay {
  return data.browserUsage[date] ?? createEmptyBrowserUsageDay(date)
}

export function getBrowserUsagePages(data: AppData, date: string): BrowserUsagePage[] {
  const webPages: BrowserUsagePage[] = []
  const aiPages = new Map<string, BrowserUsagePage>()

  Object.values(getBrowserUsageDay(data, date).pages).forEach((page) => {
    if (getUsageEntryType(page) !== 'ai') {
      webPages.push(page)
      return
    }

    const service = getAiUsageServiceForPage(page)
    const key = `app://ai/${service.id}`
    const normalizedPage: BrowserUsagePage = {
      ...page,
      url: key,
      title: service.label,
      domain: service.label,
      browser: service.label,
      usageType: 'ai',
    }
    const existingPage = aiPages.get(key)

    aiPages.set(key, existingPage ? mergeUsagePages(existingPage, normalizedPage) : normalizedPage)
  })

  return [...webPages, ...aiPages.values()].sort(sortUsagePages)
}

export function createBrowserUsageDaySnapshot(
  data: AppData,
  date: string,
  savedAt = new Date().toISOString(),
): BrowserUsageDaySnapshot {
  const day = getBrowserUsageDay(data, date)
  const pages = getBrowserUsagePages(data, date)
  const webPages = pages.filter((page) => getUsageEntryType(page) === 'web')
  const aiPages = pages.filter((page) => getUsageEntryType(page) === 'ai')
  const webSeconds = webPages.reduce((total, page) => total + page.totalSeconds, 0)
  const aiSeconds = aiPages.reduce((total, page) => total + page.totalSeconds, 0)

  return {
    schemaVersion: 1,
    date,
    savedAt,
    totalSeconds: day.totalSeconds,
    totalDuration: formatUsageDuration(day.totalSeconds),
    webSeconds,
    webDuration: formatUsageDuration(webSeconds),
    aiSeconds,
    aiDuration: formatUsageDuration(aiSeconds),
    webPageCount: webPages.length,
    aiServiceCount: new Set(aiPages.map((page) => getUsageDisplayDomain(page))).size,
    entries: pages.map((page) => createSnapshotEntry(page, day.totalSeconds)),
  }
}

function createSnapshotEntry(page: BrowserUsagePage, dayTotalSeconds: number): BrowserUsageDaySnapshotEntry {
  const type = getUsageEntryType(page)
  const isWeb = type === 'web'
  const entry: BrowserUsageDaySnapshotEntry = {
    type,
    title: getUsageDisplayTitle(page),
    source: getUsageDisplayDomain(page),
    totalSeconds: page.totalSeconds,
    duration: formatUsageDuration(page.totalSeconds),
    percent: getUsagePercent(page.totalSeconds, dayTotalSeconds),
    firstSeenAt: page.firstSeenAt,
    lastSeenAt: page.lastSeenAt,
  }

  if (isWeb) {
    entry.url = page.url
    entry.browser = page.browser
  }

  return entry
}

function sortUsagePages(left: BrowserUsagePage, right: BrowserUsagePage): number {
  if (right.totalSeconds !== left.totalSeconds) {
    return right.totalSeconds - left.totalSeconds
  }

  return right.lastSeenAt.localeCompare(left.lastSeenAt)
}

function mergeUsagePages(left: BrowserUsagePage, right: BrowserUsagePage): BrowserUsagePage {
  return {
    ...left,
    processName: left.processName ?? right.processName,
    totalSeconds: left.totalSeconds + right.totalSeconds,
    firstSeenAt: earlierTimestamp(left.firstSeenAt, right.firstSeenAt),
    lastSeenAt: laterTimestamp(left.lastSeenAt, right.lastSeenAt),
  }
}

function earlierTimestamp(left: string, right: string): string {
  return right.localeCompare(left) < 0 ? right : left
}

function laterTimestamp(left: string, right: string): string {
  return right.localeCompare(left) > 0 ? right : left
}

function getAiUsageServiceForPage(page: BrowserUsagePage): { id: string; label: string } {
  const serviceByUrl = getAiUsageServiceForUrl(page.url)
  if (serviceByUrl) {
    return serviceByUrl
  }

  const candidates = [page.domain, page.browser, page.title, page.processName ?? '']
  for (const candidate of candidates) {
    const service = getAiUsageServiceForName(candidate)
    if (service) {
      return service
    }
  }

  const fallbackName = normalizeAiAppName(candidates.find((candidate) => candidate.trim()) ?? 'AI')
  return { id: slugify(fallbackName), label: fallbackName }
}

function getAiUsageServiceForName(name: string): { id: string; label: string } | null {
  const normalizedName = normalizeServiceName(name)
  if (!normalizedName) {
    return null
  }

  const service = AI_USAGE_SERVICES.find((item) => {
    const serviceNames = [item.id, item.label, ...item.domains]
    return serviceNames.some((candidate) => normalizeServiceName(candidate) === normalizedName)
  })

  return service ? { id: service.id, label: service.label } : null
}

function normalizeServiceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getUsagePercent(totalSeconds: number, dayTotalSeconds: number): number {
  if (dayTotalSeconds <= 0 || totalSeconds <= 0) {
    return 0
  }

  return Math.min(100, Math.max(1, Math.round((totalSeconds / dayTotalSeconds) * 100)))
}

export function getUsageEntryType(page: BrowserUsagePage): UsageEntryType {
  if (page.url.startsWith('app://ai/') || getAiUsageServiceForUrl(page.url)) {
    return 'ai'
  }

  return page.usageType ?? 'web'
}

export function getUsageDisplayTitle(page: BrowserUsagePage): string {
  if (getUsageEntryType(page) !== 'ai') {
    return page.title
  }

  return getAiUsageServiceLabel(page.url) ?? page.domain ?? page.browser
}

export function getUsageDisplayDomain(page: BrowserUsagePage): string {
  if (getUsageEntryType(page) !== 'ai') {
    return page.domain
  }

  return getAiUsageServiceLabel(page.url) ?? page.domain ?? 'AI 应用'
}

export function getAiUsageServiceForUrl(rawUrl: string): { id: string; label: string } | null {
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('app://ai/')) {
    const rawId = trimmed.replace('app://ai/', '').split(/[/?#]/)[0]
    const id = slugify(rawId)
    const normalizedId = normalizeServiceName(rawId)
    const service = AI_USAGE_SERVICES.find((item) => item.id === id || normalizeServiceName(item.label) === normalizedId)
    return service ? { id: service.id, label: service.label } : { id, label: toTitleCase(id) }
  }

  const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const host = new URL(normalizedUrl).hostname.toLowerCase().replace(/^www\./, '')
    const service = AI_USAGE_SERVICES.find((item) => item.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))
    return service ? { id: service.id, label: service.label } : null
  } catch {
    return null
  }
}

export function formatUsageDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
  }

  if (minutes > 0) {
    return `${minutes} 分钟`
  }

  return `${seconds} 秒`
}

function createEmptyBrowserUsageDay(date: string): BrowserUsageDay {
  return {
    date,
    totalSeconds: 0,
    pages: {},
  }
}

function normalizeBrowserUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed || /\s/.test(trimmed)) {
    return null
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    url.hostname = url.hostname.toLowerCase()
    if (!isLikelyWebHost(url.hostname)) {
      return null
    }

    url.username = ''
    url.password = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function normalizeAiUsageKey(rawKey: string, fallbackName: string): string | null {
  const trimmed = rawKey.trim()
  const source = trimmed || fallbackName
  if (!source) {
    return null
  }

  if (source.startsWith('app://ai/')) {
    return source
  }

  return `app://ai/${slugify(source)}`
}

function normalizeAiAppName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  return trimmed || 'AI 应用'
}

function normalizeDomain(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function isLikelyWebHost(hostname: string): boolean {
  return hostname === 'localhost'
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
    || hostname.includes('.')
    || hostname.includes(':')
}

function normalizePageTitle(title: string | undefined, fallback: string): string {
  const trimmed = (title ?? '').replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return fallback
  }

  return trimmed.length > PAGE_TITLE_MAX_LENGTH ? `${trimmed.slice(0, PAGE_TITLE_MAX_LENGTH - 3)}...` : trimmed
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'unknown'
}

function getAiUsageServiceLabel(url: string): string | null {
  return getAiUsageServiceForUrl(url)?.label ?? null
}

function toTitleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'AI 应用'
}
