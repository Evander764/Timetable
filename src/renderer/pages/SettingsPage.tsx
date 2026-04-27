import type { ReactNode } from 'react'
import defaultBackground from '@renderer/assets/default-background.svg'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'

export function SettingsPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const selectBackground = useAppStore((state) => state.selectBackground)
  const exportData = useAppStore((state) => state.exportData)

  if (!data) {
    return <LoadingState />
  }

  const backgroundPreview = data.desktopSettings.backgroundImage
    ? window.timeable.filePathToUrl(data.desktopSettings.backgroundImage)
    : defaultBackground

  return (
    <div className="space-y-6">
      <PageHeader title="背景与设置" subtitle="集中管理桌面面板、卡片显示、背景图片和本地持久化状态。" />

      <div className="grid grid-cols-3 gap-4">
        <SettingTile
          title="启用桌面展示"
          description="控制桌面挂件总开关。"
          control={<Toggle checked={data.desktopSettings.overlayEnabled} onCheckedChange={(checked) => void updateSettings({ desktopSettings: { overlayEnabled: checked } })} />}
        />
        <SettingTile
          title="自动保存"
          description="每次修改后 500ms debounce 写入本地 JSON。"
          control={<Toggle checked={data.appSettings.autoSave} onCheckedChange={(checked) => void updateSettings({ appSettings: { autoSave: checked } }, '自动保存设置已更新。')} />}
        />
        <SettingTile
          title="自动贴边隐藏"
          description="桌面卡片靠边时自动收起。"
          control={<Toggle checked={data.desktopSettings.autoHide} onCheckedChange={(checked) => void updateSettings({ desktopSettings: { autoHide: checked } })} />}
        />
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card>
          <div className="text-[30px] font-semibold tracking-tight text-slate-900">背景图片</div>
          <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88">
            <img src={backgroundPreview} alt="背景预览" className="h-[320px] w-full object-cover" />
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <InfoRow label="当前背景图片" value={data.desktopSettings.backgroundMeta?.name ?? '默认山湖背景'} />
            <InfoRow label="文件路径" value={data.desktopSettings.backgroundMeta?.path ?? '内置资源'} />
            <InfoRow label="文件大小" value={data.desktopSettings.backgroundMeta?.size ? `${(data.desktopSettings.backgroundMeta.size / 1024 / 1024).toFixed(2)} MB` : '--'} />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" className="no-drag inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-5 text-[15px] font-medium text-slate-700 hover:border-blue-200 hover:text-blue-600" onClick={() => void selectBackground()}>
              更换背景图片
            </button>
            <button type="button" className="no-drag inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 px-5 text-[15px] font-medium text-slate-700 hover:border-blue-200 hover:text-blue-600" onClick={() => void exportData()}>
              备份 / 导出数据
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">桌面展示面板设置</div>
            <div className="mt-5 space-y-5">
              <SliderRow label="不透明度" value={Math.round(data.desktopSettings.opacity * 100)} onChange={(value) => void updateSettings({ desktopSettings: { opacity: value / 100 } })} />
              <div className="rounded-[20px] border border-blue-100 bg-blue-50/70 px-4 py-4 text-sm leading-6 text-blue-700">
                每张桌面卡片的尺寸已拆分为独立调节，请在“桌面面板”页分别设置。
              </div>
              <ToggleRow label="始终显示" checked={data.desktopSettings.alwaysOnTop} onChange={(checked) => void updateSettings({ desktopSettings: { alwaysOnTop: checked } })} />
              <ToggleRow label="拖拽锁定" checked={data.desktopSettings.dragLocked} onChange={(checked) => void updateSettings({ desktopSettings: { dragLocked: checked } })} />
            </div>
          </Card>

          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">持久化状态</div>
            <div className="mt-5 grid gap-3">
              <InfoRow label="数据路径" value={data.appSettings.dataPath} />
              <InfoRow label="JSON 自动保存" value={data.appSettings.autoSave ? '已开启' : '已关闭'} />
              <InfoRow label="上次保存时间" value={data.appSettings.lastSavedAt ? new Date(data.appSettings.lastSavedAt).toLocaleString() : '尚未保存'} />
              <InfoRow label="上次导出时间" value={data.appSettings.lastExportedAt ? new Date(data.appSettings.lastExportedAt).toLocaleString() : '尚未导出'} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SettingTile({ title, description, control }: { title: string; description: string; control: ReactNode }) {
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div className="text-lg font-semibold text-slate-900">{label}</div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min = 20,
  max = 100,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{label}</div>
        <div className="text-2xl font-semibold text-slate-900">{value}%</div>
      </div>
      <input className="mt-4 w-full accent-[var(--color-primary)]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-600">
      <span>{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}
