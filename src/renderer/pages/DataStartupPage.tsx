import { useEffect } from 'react'
import { Download, FolderOpen, FolderOutput, Power, RefreshCw, RotateCcw, UploadCloud } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'

export function DataStartupPage() {
  const data = useAppStore((state) => state.data)
  const backups = useAppStore((state) => state.backups)
  const updateInfo = useAppStore((state) => state.updateInfo)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setStartup = useAppStore((state) => state.setStartup)
  const exportData = useAppStore((state) => state.exportData)
  const createBackup = useAppStore((state) => state.createBackup)
  const loadBackups = useAppStore((state) => state.loadBackups)
  const restoreBackup = useAppStore((state) => state.restoreBackup)
  const openBackupDir = useAppStore((state) => state.openBackupDir)
  const checkForUpdate = useAppStore((state) => state.checkForUpdate)
  const installUpdate = useAppStore((state) => state.installUpdate)

  useEffect(() => {
    void loadBackups()
  }, [loadBackups])

  if (!data) {
    return <LoadingState />
  }

  const latestBackup = backups[0]

  return (
    <div className="space-y-6">
      <PageHeader title="数据与启动" subtitle="管理本地数据、备份恢复、开机启动和 GitHub 更新。" />

      <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <FolderOutput size={24} />
            </div>
            <div>
              <div className="text-[30px] font-semibold tracking-tight text-slate-900">本地数据</div>
              <div className="text-sm text-slate-500">用户数据保存在本机，程序更新不会覆盖。</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <InfoRow label="数据路径" value={data.appSettings.dataPath} />
            <InfoRow label="自动保存" value={data.appSettings.autoSave ? '已启用' : '已关闭'} />
            <InfoRow label="上次保存" value={formatDateTime(data.appSettings.lastSavedAt)} />
            <InfoRow label="上次导出" value={formatDateTime(data.appSettings.lastExportedAt)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void exportData()}>
              <Download size={18} />
              导出数据
            </Button>
            <Button onClick={() => void createBackup()}>
              <UploadCloud size={18} />
              立即备份
            </Button>
            <Button onClick={() => void restoreBackup()}>
              <RotateCcw size={18} />
              从文件恢复
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Power size={24} />
              </div>
              <div>
                <div className="text-[30px] font-semibold tracking-tight text-slate-900">启动</div>
                <div className="text-sm text-slate-500">管理系统启动和窗口关闭行为。</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <ToggleRow label="开机自动启动" checked={data.appSettings.launchAtStartup} onChange={(checked) => void setStartup(checked)} />
              <ToggleRow label="JSON 自动保存" checked={data.appSettings.autoSave} onChange={(checked) => void updateSettings({ appSettings: { autoSave: checked } }, '自动保存策略已更新。')} />
              <ToggleRow label="自动备份" checked={data.appSettings.autoBackupEnabled} onChange={(checked) => void updateSettings({ appSettings: { autoBackupEnabled: checked } }, checked ? '已开启自动备份。' : '已关闭自动备份。')} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">备份恢复</div>
              <div className="mt-1 text-sm text-slate-500">自动备份默认保留最近 30 份，恢复前会先生成回退备份。</div>
            </div>
            <Button onClick={() => void openBackupDir()}>
              <FolderOpen size={18} />
              打开目录
            </Button>
          </div>
          <div className="mt-5 grid gap-3">
            <InfoRow label="备份目录" value={data.appSettings.lastBackupPath ? data.appSettings.lastBackupPath.replace(/\\[^\\]+$/, '') : '尚未生成'} />
            <InfoRow label="最近备份" value={latestBackup ? `${latestBackup.name} · ${formatDateTime(latestBackup.createdAt)}` : '尚未生成'} />
            <InfoRow label="上次备份时间" value={formatDateTime(data.appSettings.lastBackupAt)} />
          </div>
          <div className="mt-5 max-h-[230px] space-y-2 overflow-auto pr-1">
            {backups.length ? backups.slice(0, 8).map((backup) => (
              <button
                key={backup.filePath}
                type="button"
                className="w-full rounded-[14px] border border-slate-200/80 bg-white/85 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
                onClick={() => void restoreBackup(backup.filePath)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-slate-900">{backup.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{formatSize(backup.size)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTime(backup.createdAt)} · {backup.reason}</div>
              </button>
            )) : (
              <div className="rounded-[14px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">还没有备份。</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">GitHub 更新</div>
              <div className="mt-1 text-sm text-slate-500">启动时检查新版，安装前会自动备份当前数据。</div>
            </div>
            <Button onClick={() => void checkForUpdate()}>
              <RefreshCw size={18} />
              检查更新
            </Button>
          </div>
          <div className="mt-5 grid gap-3">
            <ToggleRow label="启动时自动检查" checked={data.appSettings.autoCheckForUpdates} onChange={(checked) => void updateSettings({ appSettings: { autoCheckForUpdates: checked } }, checked ? '已开启自动检查更新。' : '已关闭自动检查更新。')} />
            <InfoRow label="当前版本" value={updateInfo?.currentVersion ? `v${updateInfo.currentVersion}` : '本地版本'} />
            <InfoRow label="上次检查" value={formatDateTime(data.appSettings.lastUpdateCheckAt)} />
          </div>
          {updateInfo?.available && !updateInfo.error ? (
            <div className="mt-5 rounded-[16px] border border-blue-200 bg-blue-50/80 p-4">
              <div className="text-lg font-semibold text-slate-900">发现 v{updateInfo.latestVersion}</div>
              <div className="mt-1 text-sm text-slate-600">
                {updateInfo.assetSize ? `资源大小 ${formatSize(updateInfo.assetSize)}。` : null}
                安装前会先创建 pre-update 备份。
              </div>
              {updateInfo.body ? <div className="mt-3 max-h-24 overflow-auto whitespace-pre-wrap text-sm text-slate-500">{updateInfo.body}</div> : null}
              <Button variant="primary" className="mt-4" onClick={() => void installUpdate()}>
                立即更新
              </Button>
            </div>
          ) : (
            <div className="mt-5 rounded-[16px] border border-slate-200/80 bg-white/85 p-4 text-sm text-slate-500">
              {updateInfo?.error ? `检查失败：${updateInfo.error}` : '没有待安装的新版本。'}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-slate-200/80 bg-white/88 px-4 py-3">
      <span className="font-medium text-slate-700">{label}</span>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-600">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '尚未记录'
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`
}
