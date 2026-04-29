import { useEffect } from 'react'
import { Download, FolderOutput, Power, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { DataBackupSummary } from '@shared/ipc'

export function DataStartupPage() {
  const data = useAppStore((state) => state.data)
  const dataBackups = useAppStore((state) => state.dataBackups)
  const backupsLoading = useAppStore((state) => state.backupsLoading)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setStartup = useAppStore((state) => state.setStartup)
  const exportData = useAppStore((state) => state.exportData)
  const loadDataBackups = useAppStore((state) => state.loadDataBackups)
  const restoreDataBackup = useAppStore((state) => state.restoreDataBackup)

  useEffect(() => {
    void loadDataBackups()
  }, [loadDataBackups])

  if (!data) {
    return <LoadingState />
  }

  function handleRestoreBackup(backup: DataBackupSummary) {
    const confirmed = window.confirm(
      `确定要用 ${formatDateTime(backup.createdAt)} 的备份覆盖当前数据吗？\n\n恢复前会自动保存当前数据的手动备份。`,
    )
    if (!confirmed) {
      return
    }

    void restoreDataBackup(backup.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="数据与启动" subtitle="查看本地数据路径、自动保存状态，管理开机启动、导出与备份恢复。" />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FolderOutput size={24} />
            </div>
            <div className="min-w-0">
              <div className="text-[30px] font-semibold tracking-tight text-slate-900">本地持久化</div>
              <div className="text-sm text-slate-500">所有数据都保存在 Electron userData 目录下的 JSON 文件。</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <InfoRow label="数据存储路径" value={data.appSettings.dataPath} />
            <InfoRow label="自动保存" value={data.appSettings.autoSave ? '已启用' : '已关闭'} />
            <InfoRow label="上次保存时间" value={data.appSettings.lastSavedAt ? formatDateTime(data.appSettings.lastSavedAt) : '尚未保存'} />
            <InfoRow label="上次导出时间" value={data.appSettings.lastExportedAt ? formatDateTime(data.appSettings.lastExportedAt) : '尚未导出'} />
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
              <div className="min-w-0">
                <div className="text-[30px] font-semibold tracking-tight text-slate-900">开机启动</div>
                <div className="text-sm text-slate-500">通过 Electron app.setLoginItemSettings 管理。</div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">开机自动启动</div>
                <div className="mt-1 text-sm text-slate-500">系统启动时自动运行 Timetable。</div>
              </div>
              <Toggle checked={data.appSettings.launchAtStartup} onCheckedChange={(checked) => void setStartup(checked)} />
            </div>
            <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-700">
              当前状态：{data.appSettings.launchAtStartup ? '已启用' : '未启用'}
            </div>
          </Card>

          <Card>
            <div className="text-[30px] font-semibold tracking-tight text-slate-900">保存策略</div>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">JSON 自动保存</div>
                <div className="mt-1 text-sm text-slate-500">关闭后仍会在退出应用前尝试落盘。</div>
              </div>
              <Toggle checked={data.appSettings.autoSave} onCheckedChange={(checked) => void updateSettings({ appSettings: { autoSave: checked } }, '自动保存策略已更新。')} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[26px] font-semibold tracking-tight text-slate-900">自动备份</div>
            <div className="mt-1 text-sm text-slate-500">显示最近 14 个自动保存、迁移或手动恢复前生成的备份。</div>
          </div>
          <Button size="sm" onClick={() => void loadDataBackups()} disabled={backupsLoading}>
            <RefreshCw size={16} />
            {backupsLoading ? '刷新中' : '刷新'}
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {backupsLoading && dataBackups.length === 0 ? (
            <div className="rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-5 text-sm text-slate-500">
              正在读取自动备份...
            </div>
          ) : dataBackups.length === 0 ? (
            <div className="rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-5 text-sm text-slate-500">
              暂无自动备份
            </div>
          ) : (
            dataBackups.map((backup) => (
              <div
                key={backup.id}
                className="grid gap-3 rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-4 lg:grid-cols-[1.1fr_0.7fr_0.6fr_auto]"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{formatDateTime(backup.createdAt)}</div>
                  <div className="mt-1 truncate text-sm text-slate-500" title={backup.filePath}>
                    {backup.filePath}
                  </div>
                </div>
                <BackupMeta label="原因" value={formatBackupReason(backup.reason)} />
                <BackupMeta label="大小" value={formatFileSize(backup.size)} />
                <div className="flex items-center justify-start lg:justify-end">
                  <Button size="sm" variant="danger" onClick={() => handleRestoreBackup(backup)}>
                    <RotateCcw size={15} />
                    恢复
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-600">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-900" title={value}>{value}</span>
    </div>
  )
}

function BackupMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-sm">
      <div className="text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-slate-800">{value}</div>
    </div>
  )
}

function formatBackupReason(reason: DataBackupSummary['reason']): string {
  if (reason === 'daily') {
    return '每日自动备份'
  }
  if (reason === 'migration') {
    return '数据迁移备份'
  }
  return '恢复前手动备份'
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}
