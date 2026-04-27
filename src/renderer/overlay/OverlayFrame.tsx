import type { PropsWithChildren, ReactNode } from 'react'
import { GripHorizontal, MoreHorizontal, Pin } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import type { AppData, WidgetKey } from '@shared/types/app'

type OverlayFrameProps = PropsWithChildren<{
  title: string
  dragLocked?: boolean
  widgetKey?: WidgetKey
  data?: AppData
  toolbarActions?: ReactNode
  footer?: ReactNode
}>

export function OverlayFrame({ title, dragLocked, widgetKey, data, toolbarActions, footer, children }: OverlayFrameProps) {
  const widgetDragLocked = widgetKey && data ? Boolean(data.desktopSettings.widgets[widgetKey].dragLocked) : false
  const effectiveDragLocked = Boolean(dragLocked ?? data?.desktopSettings.dragLocked) || widgetDragLocked

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <div className={cn('flex items-center justify-between px-5 py-4', !effectiveDragLocked && 'drag-region')}>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/72 p-1 text-slate-400">
            <GripHorizontal size={18} />
          </div>
          <div className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</div>
        </div>
        <div className="no-drag flex items-center gap-2 text-slate-500">
          {toolbarActions}
          <Pin size={16} />
          <MoreHorizontal size={16} />
        </div>
      </div>
      <div className="no-drag flex-1 px-5 pb-4">{children}</div>
      {footer ? <div className="no-drag border-t border-white/40 px-5 py-3 text-sm text-slate-500">{footer}</div> : null}
    </div>
  )
}
