import { Download, FolderOutput, Power } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'

export function DataStartupPage() {
  const data = useAppStore((state) => state.data)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setStartup = useAppStore((state) => state.setStartup)
  const exportData = useAppStore((state) => state.exportData)

  if (!data) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <PageHeader title="数据与启动" subtitle="查看本地数据路径、自动保存状态，管理开机启动与导出。" />

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FolderOutput size={24} />
            </div>
            <div>
              <div className="text-[30px] font-semibold tracking-tight text-slate-900">本地持久化</div>
              <div className="text-sm text-slate-500">所有数据都保存在 Electron userData 目录下的 JSON 文件。</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <InfoRow label="数据存储路径" value={data.appSettings.dataPath} />
            <InfoRow label="自动保存" value={data.appSettings.autoSave ? '已启用' : '已关闭'} />
            <InfoRow label="上次保存时间" value={data.appSettings.lastSavedAt ? new Date(data.appSettings.lastSavedAt).toLocaleString() : '尚未保存'} />
            <InfoRow label="上次导出时间" value={data.appSettings.lastExportedAt ? new Date(data.appSettings.lastExportedAt).toLocaleString() : '尚未导出'} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void exportData()}>
              <Download size={18} />
              备份 / 导出数据
            </Button>
            <Button onClick={() => void updateSettings({}, '导入功能已预留，MVP 暂未启用。')}>预留导入入口</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Power size={24} />
              </div>
              <div>
                <div className="text-[30px] font-semibold tracking-tight text-slate-900">开机启动</div>
                <div className="text-sm text-slate-500">通过 Electron `app.setLoginItemSettings` 管理。</div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">开机自动启动</div>
                <div className="mt-1 text-sm text-slate-500">系统启动时自动运行 Timeable。</div>
              </div>
              <Toggle checked={data.appSettings.launchAtStartup} onCheckedChange={(checked) => void setStartup(checked)} />
            </div>
            <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-700">
              当前状态：{data.appSettings.launchAtStartup ? '已启用' : '未启用'}
            </div>
          </Card>

          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">保存策略</div>
            <div className="mt-5 flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">JSON 自动保存</div>
                <div className="mt-1 text-sm text-slate-500">关闭后仍会在退出应用前尝试落盘。</div>
              </div>
              <Toggle checked={data.appSettings.autoSave} onCheckedChange={(checked) => void updateSettings({ appSettings: { autoSave: checked } }, '自动保存策略已更新。')} />
            </div>
          </Card>
        </div>
      </div>
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
