import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown, LayoutPanelTop, MonitorSmartphone, PanelBottomOpen, RotateCcw } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import { createDefaultDesktopSettings } from '@shared/data/defaults'
import type { WidgetKey } from '@shared/types/app'
import {
  DEFAULT_DESKTOP_AUTO_HIDE_DELAY_MS,
  getWidgetScalePercent,
  normalizeDesktopAutoHideDelayMs,
  resizeWidgetByScale,
  WIDGET_SIZE_BASES,
} from '@shared/utils/widgets'

const widgetMeta: Record<WidgetKey, { title: string; desc: string }> = {
  mainPanel: { title: '主面板', desc: '日期、课程状态和今日行动中心。' },
  dailyTasks: { title: '每日任务卡片', desc: '显示今日完成进度与任务清单。' },
  memo: { title: '进行中备忘', desc: '展示正在进行且允许桌面显示的备忘。' },
  countdown: { title: '倒计时卡片', desc: '显示当天剩余时间与任务统计。' },
  principle: { title: '道理卡片', desc: '显示核心提醒文案与署名。' },
}

const opacityPresets = [
  { label: '清晰', value: 0.98 },
  { label: '半透明', value: 0.88 },
  { label: '极简', value: 0.72 },
]

export function DesktopPanelPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const [expandedWidgetKey, setExpandedWidgetKey] = useState<WidgetKey | null>(null)

  if (!data) {
    return <LoadingState />
  }

  const appData = data
  const widgetKeys = Object.keys(appData.desktopSettings.widgets) as WidgetKey[]
  const allWidgetsAutoHide = widgetKeys.every((key) => Boolean(appData.desktopSettings.widgets[key].autoHide))

  async function setOverlayEnabled(enabled: boolean) {
    await updateSettings({ desktopSettings: { overlayEnabled: enabled } }, enabled ? '桌面面板已启用。' : '桌面面板已关闭。')
    if (enabled) {
      await window.timeable.showOverlay()
    } else {
      await window.timeable.hideOverlay()
    }
  }

  function setOpacityPreset(opacity: number) {
    const widgets = widgetKeys.reduce((nextWidgets, key) => ({
      ...nextWidgets,
      [key]: {
        ...appData.desktopSettings.widgets[key],
        opacity,
      },
    }), {} as typeof appData.desktopSettings.widgets)

    void updateSettings({ desktopSettings: { opacity, widgets } }, '桌面卡片透明度预设已应用。')
  }

  function setAllWidgetsAutoHide(enabled: boolean) {
    const widgets = widgetKeys.reduce((nextWidgets, key) => ({
      ...nextWidgets,
      [key]: {
        ...appData.desktopSettings.widgets[key],
        autoHide: enabled,
      },
    }), {} as typeof appData.desktopSettings.widgets)

    void updateSettings(
      { desktopSettings: { autoHide: enabled, widgets } },
      enabled ? '所有卡片已开启贴边隐藏。' : '所有卡片已关闭贴边隐藏。',
    )
  }

  function resetDesktopLayout() {
    const defaults = createDefaultDesktopSettings()
    void updateSettings({
      desktopSettings: {
        ...appData.desktopSettings,
        opacity: defaults.opacity,
        scale: defaults.scale,
        autoHide: defaults.autoHide,
        dragLocked: defaults.dragLocked,
        widgets: defaults.widgets,
      },
      appSettings: {
        desktopAutoHideDelayMs: DEFAULT_DESKTOP_AUTO_HIDE_DELAY_MS,
        desktopLayoutLockEnabled: false,
      },
    }, '桌面卡片布局已重置。')
  }

  const autoHideDelayMs = normalizeDesktopAutoHideDelayMs(data.appSettings.desktopAutoHideDelayMs)
  const layoutLocked = data.appSettings.desktopLayoutLockEnabled || data.desktopSettings.dragLocked

  return (
    <div className="space-y-6">
      <PageHeader
        title="桌面面板"
        subtitle="管理桌面卡片的位置、大小、贴边隐藏、透明度和锁定状态。"
        actions={
          <>
            <Button variant="primary" onClick={() => void window.timeable.showOverlay()}>
              <LayoutPanelTop size={18} />
              立即显示
            </Button>
            <Button onClick={() => void window.timeable.hideOverlay()}>
              <PanelBottomOpen size={18} />
              暂时隐藏
            </Button>
            <Button onClick={resetDesktopLayout}>
              <RotateCcw size={18} />
              重置布局
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <SettingCard
          title="桌面显示开关"
          description="控制所有桌面卡片是否创建并显示。"
          control={<Toggle checked={data.desktopSettings.overlayEnabled} onCheckedChange={(checked) => void setOverlayEnabled(checked)} />}
        />
        <SettingCard
          title="窗口模式"
          description="悬浮模式始终置顶，桌面模式更接近桌面挂件。"
          control={
            <div className="flex gap-2">
              {[
                ['floating', '悬浮'],
                ['desktop', '桌面'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium ${data.desktopSettings.overlayMode === value ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}
                  onClick={() => void updateSettings({ desktopSettings: { overlayMode: value as typeof data.desktopSettings.overlayMode } }, '桌面模式已更新。')}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <SettingCard
          title="始终置顶"
          description="只在悬浮模式下生效。"
          control={<Toggle checked={data.desktopSettings.alwaysOnTop} onCheckedChange={(checked) => void updateSettings({ desktopSettings: { alwaysOnTop: checked } }, '置顶状态已更新。')} />}
        />
      </div>

      <div className="grid grid-cols-[1.05fr_1.2fr] gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <MonitorSmartphone size={24} />
            </div>
            <div>
              <div className="text-[30px] font-semibold tracking-tight text-slate-900">全局桌面设置</div>
              <div className="text-sm text-slate-500">这些配置会即时同步到所有桌面卡片。</div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <SliderRow
              label="整体透明度"
              value={Math.round(data.desktopSettings.opacity * 100)}
              onChange={(value) => void updateSettings({ desktopSettings: { opacity: value / 100 } })}
            />
            <div className="grid grid-cols-3 gap-2">
              {opacityPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                  onClick={() => setOpacityPreset(preset.value)}
                >
                  {preset.label} {Math.round(preset.value * 100)}%
                </button>
              ))}
            </div>
            <ToggleRow
              label="自动贴边隐藏"
              description="批量设置所有卡片；展开单张卡片后可以单独开关。"
              checked={allWidgetsAutoHide}
              onChange={setAllWidgetsAutoHide}
            />
            <SliderRow
              label="贴边收起延迟"
              value={autoHideDelayMs}
              min={300}
              max={3000}
              step={100}
              suffix="ms"
              onChange={(value) => void updateSettings({ appSettings: { desktopAutoHideDelayMs: value } })}
            />
            <ToggleRow
              label="锁定位置和大小"
              description="锁定后不能拖动或改变大小，但仍可点击卡片内按钮。"
              checked={layoutLocked}
              onChange={(checked) => void updateSettings({
                appSettings: { desktopLayoutLockEnabled: checked },
                desktopSettings: { dragLocked: checked },
              }, checked ? '桌面卡片已锁定。' : '桌面卡片已解锁。')}
            />
          </div>
        </Card>

        <Card>
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">桌面卡片</div>
          <div className="mt-5 space-y-3">
            {widgetKeys.map((key) => {
              const config = data.desktopSettings.widgets[key]
              const sizeBase = WIDGET_SIZE_BASES[key]
              const sizePercent = getWidgetScalePercent(key, config)
              const expanded = expandedWidgetKey === key
              return (
                <div key={key} className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => setExpandedWidgetKey(expanded ? null : key)}
                      title={expanded ? '收起设置' : '展开设置'}
                      aria-label={expanded ? `收起${widgetMeta[key].title}设置` : `展开${widgetMeta[key].title}设置`}
                    >
                      <ChevronDown className={`mt-1 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} size={18} />
                      <span className="min-w-0">
                        <span className="block truncate text-2xl font-semibold tracking-tight text-slate-900">{widgetMeta[key].title}</span>
                        <span className="mt-1 block truncate text-sm text-slate-500">{widgetMeta[key].desc}</span>
                      </span>
                    </button>
                    <Toggle checked={config.enabled} onCheckedChange={(checked) => void updateWidget({ key, changes: { enabled: checked } }, checked ? '卡片已显示。' : '卡片已隐藏。')} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-50 px-2.5 py-1">位置 {Math.round(config.x)}, {Math.round(config.y)}</span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1">尺寸 {Math.round(config.width)} x {Math.round(config.height)}</span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1">透明度 {Math.round(config.opacity * 100)}%</span>
                  </div>

                  {expanded ? (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-[1fr_88px] items-center gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-500">卡片尺寸</div>
                          <input
                            className="mt-3 w-full accent-[var(--color-primary)]"
                            type="range"
                            min={sizeBase.minScale}
                            max={sizeBase.maxScale}
                            value={sizePercent}
                            onChange={(event) => void updateWidget({ key, changes: resizeWidgetByScale(key, Number(event.target.value)) })}
                          />
                        </div>
                        <div className="text-right text-xl font-semibold text-slate-900">{sizePercent}%</div>
                      </div>

                      <div className="grid grid-cols-[1fr_88px] items-center gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-500">卡片透明度</div>
                          <input
                            className="mt-3 w-full accent-[var(--color-primary)]"
                            type="range"
                            min={30}
                            max={100}
                            value={Math.round(config.opacity * 100)}
                            onChange={(event) => void updateWidget({ key, changes: { opacity: Number(event.target.value) / 100 } })}
                          />
                        </div>
                        <div className="text-right text-xl font-semibold text-slate-900">{Math.round(config.opacity * 100)}%</div>
                      </div>

                      <ToggleRow
                        label="本卡片贴边隐藏"
                        description="只影响这一张桌面卡片，靠近屏幕边缘时收起。"
                        checked={Boolean(config.autoHide)}
                        onChange={(checked) => void updateWidget(
                          { key, changes: { autoHide: checked } },
                          checked ? '本卡片已开启贴边隐藏。' : '本卡片已关闭贴边隐藏。',
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SettingCard({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">{title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
        </div>
        {control}
      </div>
    </Card>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4">
      <div>
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min = 30,
  max = 100,
  step = 1,
  suffix = '%',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="text-2xl font-semibold text-slate-900">{value}{suffix}</div>
      </div>
      <input className="mt-4 w-full accent-[var(--color-primary)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}
