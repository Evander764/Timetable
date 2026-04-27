import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Bot, CalendarDays, Clock3, Globe2, Save } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { ProgressBar } from '@renderer/components/ProgressBar'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import {
  formatUsageDuration,
  getBrowserUsageDay,
  getBrowserUsagePages,
  getUsageDisplayDomain,
  getUsageDisplayTitle,
  getUsageEntryType,
  getUsagePercent,
} from '@shared/utils/browserUsage'
import { formatDateKey } from '@shared/utils/date'

export function BrowserUsagePage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const saveBrowserUsageDay = useAppStore((state) => state.saveBrowserUsageDay)
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()))
  const todayKey = formatDateKey(new Date())
  const pages = useMemo(() => data ? getBrowserUsagePages(data, selectedDate) : [], [data, selectedDate])
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
    <div className="space-y-6">
      <PageHeader
        title="时间统计"
        subtitle="按天汇总前台浏览器网页和 AI 应用停留时间，数据只保存在本机。"
        actions={
          <Button variant="primary" onClick={() => void saveBrowserUsageDay(selectedDate)}>
            <Save size={18} />
            保存当天统计
          </Button>
        }
      />

      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">记录状态</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{data.appSettings.browserTrackingEnabled ? '正在记录' : '已暂停'}</div>
            </div>
            <Toggle
              checked={data.appSettings.browserTrackingEnabled}
              onCheckedChange={(checked) => void updateSettings({ appSettings: { browserTrackingEnabled: checked } }, checked ? '已开启时间统计。' : '已暂停时间统计。')}
            />
          </div>
          <div className="mt-3 text-sm text-slate-500">{data.appSettings.browserTrackingEnabled ? '正在记录前台网页和 AI 应用' : '不会继续写入新的时间记录'}</div>
        </Card>
        <Metric icon={<Clock3 size={22} />} label="总时长" value={formatUsageDuration(day.totalSeconds)} />
        <Metric icon={<Globe2 size={22} />} label="网页域名" value={`${domainCount}`} />
        <Metric icon={<Bot size={22} />} label="AI 服务" value={`${aiServiceCount}`} />
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">统计日期</div>
              <div className="text-sm text-slate-500">默认查看今天</div>
            </div>
          </div>
          <input className="form-input mt-5" type="date" value={selectedDate} max={todayKey} onChange={(event) => setSelectedDate(event.target.value)} />
          <div className="mt-5 grid gap-3">
            <InfoRow label="统计日期" value={selectedDate} />
            <InfoRow label="网页条目" value={`${webPages.length} 个`} />
            <InfoRow label="AI 总时间" value={formatUsageDuration(aiTotalSeconds)} />
            <InfoRow label="最长使用" value={topEntry ? getUsageDisplayDomain(topEntry) : '暂无记录'} />
            <InfoRow label="累计时间" value={formatUsageDuration(day.totalSeconds)} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-slate-900">使用明细</div>
            <span className="text-sm text-slate-500">{formatUsageDuration(day.totalSeconds)}</span>
          </div>
          <div className="mt-5 space-y-3">
            {pages.length ? pages.map((page) => {
              const usageType = getUsageEntryType(page)
              const isWeb = usageType === 'web'
              const displayTitle = getUsageDisplayTitle(page)
              const displayDomain = getUsageDisplayDomain(page)
              const usagePercent = getUsagePercent(page.totalSeconds, day.totalSeconds)
              return (
                <div key={page.url} className="rounded-[18px] border border-slate-200/80 bg-white/86 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={isWeb ? 'text-blue-600' : 'text-violet-600'}>{isWeb ? '网页' : 'AI 应用'}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{isWeb ? page.browser : '仅统计使用时长'}</span>
                      </div>
                      <div className="mt-1 truncate text-lg font-semibold text-slate-900">{displayTitle}</div>
                      <div className="mt-1 truncate text-sm text-slate-500">{displayDomain}</div>
                    </div>
                    <span className="shrink-0 text-lg font-semibold text-slate-900">{formatUsageDuration(page.totalSeconds)}</span>
                  </div>
                  <ProgressBar className="mt-3" value={usagePercent} accentClassName={isWeb ? 'bg-blue-500' : 'bg-violet-500'} />
                  <div className="mt-2 truncate text-xs text-slate-400">{isWeb ? page.url : '不保存 AI 对话标题或具体链接'}</div>
                </div>
              )
            }) : (
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
    <Card>
      <div className="flex items-center gap-3 text-blue-600">{icon}<span className="text-sm text-slate-500">{label}</span></div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-slate-200/80 bg-white/88 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
