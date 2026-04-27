import type { ReactNode } from 'react'
import { Eye, Quote } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { PositionPicker } from '@renderer/components/PositionPicker'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'

export function PrinciplePage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const snapWidgetPosition = useAppStore((state) => state.snapWidgetPosition)

  if (!data) {
    return <LoadingState />
  }

  const principle = data.principleCard
  const widget = data.desktopSettings.widgets.principle

  return (
    <div className="space-y-6">
      <PageHeader title="最重要的道理" subtitle="编辑核心提醒文案、透明度和桌面展示状态。" />

      <div className="grid grid-cols-[1fr_420px] gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">文案编辑</div>
            <Quote className="text-blue-500" />
          </div>
          <div className="mt-5 grid gap-5">
            <Field label="提醒内容">
              <textarea
                className="form-textarea min-h-[220px]"
                value={principle.content}
                onChange={(event) => void updateData({ type: 'principle/update', payload: { content: event.target.value } })}
              />
            </Field>
            <Field label="署名">
              <input className="form-input" value={principle.author ?? ''} onChange={(event) => void updateData({ type: 'principle/update', payload: { author: event.target.value } })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <ToggleRow
                label="显示道理卡片"
                checked={widget.enabled}
                onChange={(checked) => {
                  void updateWidget({ key: 'principle', changes: { enabled: checked } })
                  void updateData({ type: 'principle/update', payload: { enabled: checked } })
                }}
              />
              <ToggleRow
                label="自动贴边隐藏"
                checked={Boolean(widget.autoHide) || principle.autoHide}
                onChange={(checked) => {
                  void updateWidget({ key: 'principle', changes: { autoHide: checked } })
                  void updateData({ type: 'principle/update', payload: { autoHide: checked } })
                }}
              />
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">透明度</div>
                <div className="text-2xl font-semibold text-slate-900">{Math.round(widget.opacity * 100)}%</div>
              </div>
              <input
                className="mt-4 w-full accent-[var(--color-primary)]"
                type="range"
                min={20}
                max={100}
                value={Math.round(widget.opacity * 100)}
                onChange={(event) => {
                  const opacity = Number(event.target.value) / 100
                  void updateWidget({ key: 'principle', changes: { opacity } })
                  void updateData({ type: 'principle/update', payload: { opacity } })
                }}
              />
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div className="mb-3 text-lg font-semibold text-slate-900">预设位置</div>
              <PositionPicker
                value={principle.position}
                onChange={(position) => void snapWidgetPosition({ key: 'principle', position }, '道理卡片位置已更新。')}
              />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-6 top-6 text-4xl text-slate-200">“</div>
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">卡片预览</div>
          <div className="mt-10 flex min-h-[320px] flex-col justify-center rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.5))] px-8 text-center shadow-[0_24px_44px_rgba(52,74,124,0.12)] backdrop-blur-xl">
            <div className="text-[40px] font-semibold leading-[1.48] tracking-tight text-slate-900 whitespace-pre-line">
              {principle.content}
            </div>
            <div className="mt-5 text-xl text-slate-500">{principle.author}</div>
          </div>
          <div className="mt-6 text-sm text-slate-500">
            当前位置：{Math.round(widget.x)}, {Math.round(widget.y)} 尺寸：{Math.round(widget.width)} × {Math.round(widget.height)}
          </div>
          <Button variant="primary" className="mt-6 w-full" onClick={() => void window.timeable.showOverlay()}>
            <Eye size={18} />
            在桌面上查看
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      {children}
    </label>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div className="text-lg font-semibold text-slate-900">{label}</div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
