import { useLocation } from 'react-router-dom'
import { Copy, Minus, Square, X } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { navTitleMap } from '@renderer/routes/navigation'
import { useAppStore } from '@renderer/store/appStore'

export function TitleBar() {
  const location = useLocation()
  const isMaximized = useAppStore((state) => state.isMaximized)
  const title = navTitleMap[location.pathname] ?? 'Timeable'
  const controlClass =
    'h-9 w-11 rounded-lg border border-slate-200/90 bg-white/75 p-0 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-[0.98]'

  return (
    <header className="drag-region flex h-[60px] items-center justify-between border-b border-slate-200/70 bg-white/68 px-5 backdrop-blur-xl">
      <div>
        <div className="text-xs text-slate-500">Timeable 控制中心</div>
        <div className="text-[18px] font-semibold text-slate-900">{title}</div>
      </div>

      <div className="no-drag flex items-center gap-2">
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
