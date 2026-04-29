import type { ReactNode } from 'react'
import { LayoutPanelTop, MonitorSmartphone, PanelBottomOpen } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { WidgetKey } from '@shared/types/app'
import { getWidgetScalePercent, resizeWidgetByScale, WIDGET_SIZE_BASES } from '@shared/utils/widgets'

const widgetMeta: Record<WidgetKey, { title: string; desc: string }> = {
  mainPanel: { title: '主面板', desc: '日期与今日课程' },
  dailyTasks: { title: '每日任务卡片', desc: '显示今日完成进度与任务清单' },
  memo: { title: '进行中备忘', desc: '只展示 active 且允许桌面显示的备忘录' },
  countdown: { title: '倒计时条', desc: '显示当天剩余时间与任务进度' },
  principle: { title: '道理卡片', desc: '显示核心提醒文案与作者' },
}

export function DesktopPanelPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const updateWidget = useAppStore((state) => state.updateWidget)

  if (!data) {
    return <LoadingState />
  }

  async function setOverlayEnabled(enabled: boolean) {
    await updateSettings({ desktopSettings: { overlayEnabled: enabled } }, enabled ? '桌面面板已启用。' : '桌面面板已关闭。')
    if (enabled) {
      await window.timeable.showOverlay()
    } else {
      await window.timeable.hideOverlay()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="桌面面板"
        subtitle="管理桌面层的窗口模式、缩放、透明度与每张卡片的显示状态。"
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
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <SettingCard
          title="桌面展示开关"
          description="控制所有桌面卡片是否创建并显示。"
          control={<Toggle checked={data.desktopSettings.overlayEnabled} onCheckedChange={(checked) => void setOverlayEnabled(checked)} />}
        />
        <SettingCard
          title="窗口模式"
          description="浮动模式始终置顶，桌面模式不置顶，更接近桌面挂件。"
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
            <ToggleRow label="自动贴边隐藏" description="靠近边缘时收起为窄条，鼠标移入时展开。" checked={data.desktopSettings.autoHide} onChange={(checked) => void updateSettings({ desktopSettings: { autoHide: checked } }, '贴边隐藏设置已更新。')} />
            <ToggleRow label="拖拽锁定" description="锁定后仍可点击交互，但不允许拖动挂件。" checked={data.desktopSettings.dragLocked} onChange={(checked) => void updateSettings({ desktopSettings: { dragLocked: checked } }, '拖拽锁定状态已更新。')} />
          </div>
        </Card>

        <Card>
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">桌面卡片</div>
          <div className="mt-5 space-y-3">
            {(Object.keys(data.desktopSettings.widgets) as WidgetKey[]).map((key) => {
              const config = data.desktopSettings.widgets[key]
              const sizeBase = WIDGET_SIZE_BASES[key]
              const sizePercent = getWidgetScalePercent(key, config)
              return (
                <div key={key} className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">{widgetMeta[key].title}</div>
                      <div className="mt-1 text-sm text-slate-500">{widgetMeta[key].desc}</div>
                    </div>
                    <Toggle checked={config.enabled} onCheckedChange={(checked) => void updateWidget({ key, changes: { enabled: checked } }, checked ? '卡片已显示。' : '卡片已隐藏。')} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-500">
                    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/70 px-3 py-2">位置：{Math.round(config.x)}, {Math.round(config.y)}</div>
                    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/70 px-3 py-2">尺寸：{Math.round(config.width)} × {Math.round(config.height)}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_110px] items-center gap-4">
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
                    <div className="text-right text-2xl font-semibold text-slate-900">{sizePercent}%</div>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_110px] items-center gap-4">
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
                    <div className="text-right text-2xl font-semibold text-slate-900">{Math.round(config.opacity * 100)}%</div>
                  </div>
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
    <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4">
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
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="text-2xl font-semibold text-slate-900">{value}%</div>
      </div>
      <input className="mt-4 w-full accent-[var(--color-primary)]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}
