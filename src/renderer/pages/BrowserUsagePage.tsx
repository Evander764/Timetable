import { useMemo, useState, type ReactNode } from 'react'
import { Bot, Clock3, ExternalLink, Globe2, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import { formatDateKey } from '@shared/utils/date'
import {
  formatUsageDuration,
  getBrowserUsageDay,
  getBrowserUsagePages,
  getUsageDisplayDomain,
  getUsageDisplayTitle,
  getUsageEntryType,
} from '@shared/utils/browserUsage'

export function BrowserUsagePage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const saveBrowserUsageDay = useAppStore((state) => state.saveBrowserUsageDay)
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()))

  const todayKey = formatDateKey(new Date())
  const pages = useMemo(() => (data ? getBrowserUsagePages(data, selectedDate) : []), [data, selectedDate])
  const webPages = useMemo(() => pages.filter((page) => getUsageEntryType(page) === 'web'), [pages])
  const aiApps = useMemo(() => pages.filter((page) => getUsageEntryType(page) === 'ai'), [pages])
  const day = data ? getBrowserUsageDay(data, selectedDate) : null
  const aiTotalSeconds = aiApps.reduce((total, page) => total + page.totalSeconds, 0)
  const aiServiceCount = new Set(aiApps.map((page) => getUsageDisplayDomain(page))).size
  const domainCount = new Set(pages.map((page) => getUsageDisplayDomain(page))).size
  const topEntry = pages[0]

  if (!data || !day) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="时间统计"
        subtitle="按天汇总前台浏览器网页和 AI 应用停留时间，数据只保存在本机。"
        actions={(
          <>
            <Button variant="primary" className="hidden" onClick={() => void saveBrowserUsageDay(selectedDate)}>
              <Save size={16} />
              保存当天统计
            </Button>
            <input
              aria-label="选择日期"
              type="date"
              value={selectedDate}
              className="no-drag h-10 rounded-lg border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button variant="secondary" onClick={() => setSelectedDate(todayKey)}>今天</Button>
          </>
        )}
      />

      <div className="grid grid-cols-[1.15fr_1fr] gap-3">
        <Card className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck size={21} />
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight text-slate-900">时间记录</div>
              <div className="mt-1 text-sm text-slate-500">
                {data.appSettings.browserTrackingEnabled ? '正在记录前台网页和 AI 应用' : '已暂停记录'}
              </div>
            </div>
          </div>
          <Toggle
            checked={data.appSettings.browserTrackingEnabled}
            onCheckedChange={(checked) => void updateSettings(
              { appSettings: { browserTrackingEnabled: checked } },
              checked ? '时间记录已开启。' : '时间记录已暂停。',
            )}
          />
        </Card>

        <Card className="grid grid-cols-2 gap-2">
          <Metric icon={<Clock3 size={22} />} label="总时长" value={formatUsageDuration(day.totalSeconds)} />
          <Metric icon={<Bot size={22} />} label="AI 总时长" value={formatUsageDuration(aiTotalSeconds)} />
          <Metric icon={<Globe2 size={22} />} label="网页数" value={`${webPages.length}`} />
          <Metric icon={<Bot size={22} />} label="AI 服务" value={`${aiServiceCount}`} />
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(380px,1fr)_minmax(0,1.2fr)] gap-4">
        <Card>
          <div className="text-[28px] font-semibold tracking-tight text-slate-900">今日重点</div>
          <div className="mt-4 space-y-2">
            <InfoRow label="统计日期" value={selectedDate} />
            <InfoRow label="记录网页" value={`${webPages.length} 个`} />
            <InfoRow label="AI 服务" value={`${aiServiceCount} 个`} />
            <InfoRow label="AI 总时间" value={formatUsageDuration(aiTotalSeconds)} />
            <InfoRow label="站点 / 应用" value={`${domainCount} 个`} />
            <InfoRow label="最长使用" value={topEntry ? getUsageDisplayDomain(topEntry) : '暂无记录'} />
            <InfoRow label="累计时间" value={formatUsageDuration(day.totalSeconds)} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">使用明细</div>
            <span className="text-sm text-slate-500">{formatUsageDuration(day.totalSeconds)}</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {pages.length ? (
              pages.map((page) => {
                const usageType = getUsageEntryType(page)
                const isWeb = usageType === 'web'
                const displayTitle = getUsageDisplayTitle(page)
                const displayDomain = getUsageDisplayDomain(page)
                const usagePercent = getUsagePercent(page.totalSeconds, day.totalSeconds)
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-slate-900">{displayTitle}</div>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-500">
                          <span className={isWeb ? 'text-blue-600' : 'text-violet-600'}>{isWeb ? '网页' : 'AI 应用'}</span>
                          <span>·</span>
                          <span className="truncate">{displayDomain}</span>
                          <span>·</span>
                          <span>{isWeb ? page.browser : '仅统计使用时长'}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>{formatUsageDuration(page.totalSeconds)}</span>
                        {isWeb ? <ExternalLink size={16} className="text-slate-400" /> : <Bot size={16} className="text-violet-500" />}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-36">
                        <div
                          className={`h-full rounded-full ${isWeb ? 'bg-[var(--color-primary)]' : 'bg-violet-500'}`}
                          style={{ width: `${usagePercent > 0 ? Math.max(2, usagePercent) : 0}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-medium tabular-nums text-slate-500">{usagePercent}%</span>
                    </div>
                    <div className="mt-2 truncate text-xs text-slate-400">
                      {isWeb ? page.url : '不保存 AI 对话标题或具体链接'}
                    </div>
                  </>
                )

                return isWeb ? (
                  <a
                    key={page.url}
                    href={page.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-slate-200/80 bg-white/90 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={page.url} className="block rounded-lg border border-violet-100 bg-white/90 p-3">
                    {content}
                  </div>
                )
              })
            ) : (
              <EmptyState title="还没有使用记录" description="开启记录后，使用浏览器或 AI 工具时会自动生成当天统计。" />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="shrink-0 text-blue-600">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-1.5 whitespace-normal break-words text-[16px] font-semibold leading-tight tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[34px] items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-right font-semibold leading-snug text-slate-900">{value}</span>
    </div>
  )
}

function getUsagePercent(totalSeconds: number, dayTotalSeconds: number): number {
  if (dayTotalSeconds <= 0 || totalSeconds <= 0) {
    return 0
  }

  return Math.min(100, Math.max(1, Math.round((totalSeconds / dayTotalSeconds) * 100)))
}
