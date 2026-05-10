import { useEffect } from 'react'
import { Download, FolderOpen, FolderOutput, Power, RefreshCw, RotateCcw, UploadCloud } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { RitualEntryMode, RitualExitMode } from '@shared/types/app'

const entryRitualOptions: Array<{ value: RitualEntryMode; label: string }> = [
  { value: 'door', label: '开门光缝' },
  { value: 'curtain', label: '升起帷幕' },
  { value: 'meteor', label: '流星破晓' },
  { value: 'sunrise', label: '日出破晓' },
]

const exitRitualOptions: Array<{ value: RitualExitMode; label: string }> = [
  { value: 'door', label: '关门归档' },
  { value: 'curtain', label: '降下帷幕' },
  { value: 'moon', label: '月升归档' },
]

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
  const ritualMusicVolume = data.appSettings.ritualMusicVolume ?? 0.12

  return (
    <div className="space-y-6">
      <PageHeader title="数据中枢" subtitle="管理本地数据、源码外归档、备份恢复、开机启动和仪式开关。" />

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
            <InfoRow label="源码外档案库" value="D:\\software\\Timetable_data_archive" />
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
              <ToggleRow label="每日入场仪式" checked={data.appSettings.ritualIntroEnabled !== false} onChange={(checked) => void updateSettings({ appSettings: { ritualIntroEnabled: checked } }, checked ? '已开启每日入场仪式。' : '已关闭每日入场仪式。')} />
              <ToggleRow label="每日结束仪式" checked={data.appSettings.ritualOutroEnabled !== false} onChange={(checked) => void updateSettings({ appSettings: { ritualOutroEnabled: checked } }, checked ? '已开启每日结束仪式。' : '已关闭每日结束仪式。')} />
              <div className="grid gap-3 rounded-[14px] border border-slate-200/80 bg-white/88 p-4">
                <div className="text-sm font-semibold text-slate-700">仪式动画模式</div>
                <SelectSetting
                  label="开启动画"
                  value={data.appSettings.ritualEntryMode ?? 'door'}
                  options={entryRitualOptions}
                  onChange={(value) => void updateSettings({ appSettings: { ritualEntryMode: value as RitualEntryMode } }, '开启动画模式已更新。')}
                />
                <SelectSetting
                  label="结束动画"
                  value={data.appSettings.ritualExitMode ?? 'door'}
                  options={exitRitualOptions}
                  onChange={(value) => void updateSettings({ appSettings: { ritualExitMode: value as RitualExitMode } }, '结束动画模式已更新。')}
                />
              </div>
              <div className="grid gap-3 rounded-[14px] border border-slate-200/80 bg-white/88 p-4">
                <div className="text-sm font-semibold text-slate-700">仪式文案</div>
                <TextSetting
                  label="开门浮现文字"
                  value={data.appSettings.ritualEntryText}
                  onChange={(value) => void updateSettings({ appSettings: { ritualEntryText: value } })}
                />
                <TextSetting
                  label="关门第一行"
                  value={data.appSettings.ritualExitLine1}
                  onChange={(value) => void updateSettings({ appSettings: { ritualExitLine1: value } })}
                />
                <TextSetting
                  label="关门第二行"
                  value={data.appSettings.ritualExitLine2}
                  onChange={(value) => void updateSettings({ appSettings: { ritualExitLine2: value } })}
                />
              </div>
              <div className="grid gap-3 rounded-[14px] border border-slate-200/80 bg-white/88 p-4">
                <div className="text-sm font-semibold text-slate-700">仪式声音</div>
                <ToggleRow label="开场与结束背景音乐" checked={data.appSettings.ritualMusicEnabled !== false} onChange={(checked) => void updateSettings({ appSettings: { ritualMusicEnabled: checked } }, checked ? '已开启仪式背景音乐。' : '已关闭仪式背景音乐。')} />
                <VolumeSetting
                  label="音乐音量"
                  value={ritualMusicVolume}
                  disabled={data.appSettings.ritualMusicEnabled === false}
                  onChange={(value) => void updateSettings({ appSettings: { ritualMusicVolume: value } })}
                />
                <p className="text-xs leading-5 text-slate-500">音乐由本地 Web Audio 实时合成，不写入外部音频文件。</p>
              </div>
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

function TextSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm text-slate-500">
      {label}
      <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectSetting<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: TValue
  options: Array<{ value: TValue; label: string }>
  onChange: (value: TValue) => void
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-500">
      {label}
      <select className="form-input cursor-pointer" value={value} onChange={(event) => onChange(event.target.value as TValue)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function VolumeSetting({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-3 rounded-[14px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-500">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-xs text-slate-500">{Math.round(value * 100)}%</span>
      </div>
      <input
        className="w-full accent-[var(--color-primary)] disabled:opacity-40"
        type="range"
        min={0}
        max={0.3}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
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
