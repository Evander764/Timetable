import { useLocation } from 'react-router-dom'
import { Copy, FolderClock, Minus, Square, X } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { navTitleMap } from '@renderer/routes/navigation'
import { useAppStore } from '@renderer/store/appStore'
import { formatDateKey } from '@shared/utils/date'

export function TitleBar() {
  const location = useLocation()
  const isMaximized = useAppStore((state) => state.isMaximized)
  const title = navTitleMap[location.pathname] ?? 'Timetable'
  const controlClass =
    'h-9 w-11 rounded-[var(--radius-md)] border border-[var(--surface-border-light)] bg-[var(--surface-fill-light)] p-0 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-[var(--accent-soft)] hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-[-2px] active:scale-[0.98]'

  return (
    <header className="drag-region flex h-[64px] min-w-0 items-center justify-between gap-3 border-b border-[var(--surface-border-light)] bg-[var(--surface-fill-light)] px-5 backdrop-blur-xl">
      <div className="min-w-0">
        <div className="truncate font-mono text-xs font-semibold text-slate-500">DAY_LEDGER // {formatDateKey(new Date())}</div>
        <div className="truncate text-[18px] font-semibold text-slate-900">{title}</div>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          className="os-day-end-button h-9 rounded-[var(--radius-md)] px-3 text-sm shadow-[var(--elevation-card-hover)]"
          title="结束今日"
          aria-label="结束今日"
          onClick={() => void window.timeable.windowControl('archive')}
        >
          <FolderClock size={16} strokeWidth={2.2} />
          结束今日
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={controlClass}
          title="最小化"
          aria-label="最小化"
          onClick={() => void window.timeable.windowControl('minimize')}
        >
          <Minus size={17} strokeWidth={2.4} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={controlClass}
          title={isMaximized ? '还原窗口' : '最大化'}
          aria-label={isMaximized ? '还原窗口' : '最大化'}
          onClick={() => void window.timeable.windowControl('maximize')}
        >
          {isMaximized ? <Copy size={16} strokeWidth={2.3} /> : <Square size={15} strokeWidth={2.4} />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`${controlClass} hover:border-red-500 hover:bg-red-500 hover:text-white`}
          title="关闭"
          aria-label="关闭"
          onClick={() => void window.timeable.windowControl('close')}
        >
          <X size={18} strokeWidth={2.4} />
        </Button>
      </div>
    </header>
  )
}
