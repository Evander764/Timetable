import { useEffect, useId, useRef, useState, type PropsWithChildren, type ReactNode } from 'react'
import { Check, EyeOff, GripHorizontal, Maximize2, Minimize2, MoreHorizontal, Pin } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import type { AppData, WidgetKey } from '@shared/types/app'

type OverlayFrameProps = PropsWithChildren<{
  title: string
  widgetKey: WidgetKey
  data: AppData
  footer?: ReactNode
}>

export function OverlayFrame({ title, widgetKey, data, footer, children }: OverlayFrameProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const widgetConfig = data.desktopSettings.widgets[widgetKey]
  const widgetDragLocked = Boolean(widgetConfig.dragLocked)
  const dragLocked = data.desktopSettings.dragLocked || widgetDragLocked
  const autoHideEnabled = Boolean(widgetConfig.autoHide)
  const minimized = Boolean(widgetConfig.minimized)
  const canMinimize = widgetKey === 'countdown'

  useEffect(() => {
    if (!menuOpen) {
      return undefined
    }

    function closeOnOutsidePress(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutsidePress)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutsidePress)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  function toggleDragLocked() {
    void window.timeable.updateOverlayWidget({ key: widgetKey, changes: { dragLocked: !widgetDragLocked } })
  }

  function updateWidget(changes: Partial<typeof widgetConfig>) {
    setMenuOpen(false)
    void window.timeable.updateOverlayWidget({ key: widgetKey, changes })
  }

  return (
    <div className="glass-card relative flex h-full flex-col overflow-hidden">
      <div className={cn('relative z-20 flex items-center justify-between px-5 py-4', !dragLocked && 'drag-region')}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-full bg-white/72 p-1 text-slate-400 transition',
              dragLocked && 'bg-blue-50 text-blue-600',
            )}
            title={dragLocked ? '卡片位置已固定' : '拖动这里移动卡片'}
          >
            <GripHorizontal size={18} />
          </div>
          <div className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</div>
        </div>
        <div className="no-drag flex items-center gap-1.5 text-slate-500">
          <button
            type="button"
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md border border-transparent transition hover:bg-white/72 hover:text-slate-900 active:bg-white',
              widgetDragLocked && 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700',
            )}
            title={widgetDragLocked ? '解除此卡片固定' : '固定此卡片位置'}
            aria-label={widgetDragLocked ? '解除此卡片固定' : '固定此卡片位置'}
            aria-pressed={widgetDragLocked}
            onClick={toggleDragLocked}
          >
            <Pin size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md border border-transparent transition hover:bg-white/72 hover:text-slate-900 active:bg-white',
              menuOpen && 'bg-white/86 text-slate-900 shadow-sm',
            )}
            title="卡片操作"
            aria-label="卡片操作"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={17} strokeWidth={2.4} />
          </button>
        </div>
        {menuOpen ? (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="no-drag absolute right-5 top-[52px] z-40 w-44 rounded-lg border border-slate-200/85 bg-white/95 p-1.5 text-sm text-slate-700 shadow-[0_16px_34px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            <MenuItem
              checked={autoHideEnabled}
              label={autoHideEnabled ? '关闭贴边隐藏' : '开启贴边隐藏'}
              onClick={() => updateWidget({ autoHide: !autoHideEnabled })}
            />
            {canMinimize ? (
              <MenuItem
                icon={minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                label={minimized ? '展开详情' : '精简显示'}
                onClick={() => updateWidget({ minimized: !minimized })}
              />
            ) : null}
            <div className="my-1 h-px bg-slate-200/80" />
            <MenuItem
              tone="danger"
              icon={<EyeOff size={15} />}
              label="隐藏此卡片"
              onClick={() => updateWidget({ enabled: false })}
            />
          </div>
        ) : null}
      </div>
      <div className="no-drag flex-1 px-5 pb-4">{children}</div>
      {footer ? <div className="no-drag border-t border-white/40 px-5 py-3 text-sm text-slate-500">{footer}</div> : null}
    </div>
  )
}

function MenuItem({
  label,
  onClick,
  checked = false,
  icon,
  tone = 'default',
}: {
  label: string
  onClick: () => void
  checked?: boolean
  icon?: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left transition hover:bg-slate-100',
        tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700',
      )}
      onClick={onClick}
    >
      <span className="grid h-4 w-4 place-items-center">
        {icon ?? (checked ? <Check size={15} strokeWidth={2.4} /> : null)}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}
