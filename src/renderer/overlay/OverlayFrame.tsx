import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { EyeOff, GripHorizontal, Lock, MoreHorizontal, Pin, Unlock } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import type { AppData, WidgetKey } from '@shared/types/app'

type OverlayFrameProps = PropsWithChildren<{
  title: string
  dragLocked?: boolean
  widgetKey?: WidgetKey
  data?: AppData
  className?: string
  toolbarActions?: ReactNode
  footer?: ReactNode
}>

export function OverlayFrame({ title, dragLocked, widgetKey, data, className, toolbarActions, footer, children }: OverlayFrameProps) {
  const widgetDragLocked = widgetKey && data ? Boolean(data.desktopSettings.widgets[widgetKey].dragLocked) : false
  const effectiveDragLocked = Boolean(dragLocked ?? data?.desktopSettings.dragLocked) || widgetDragLocked
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const widgetConfig = widgetKey && data ? data.desktopSettings.widgets[widgetKey] : null

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [menuOpen])

  async function toggleAlwaysOnTop() {
    if (!data) {
      return
    }

    const nextAlwaysOnTop = !data.desktopSettings.alwaysOnTop
    await window.timeable.updateSettings({
      desktopSettings: nextAlwaysOnTop
        ? { alwaysOnTop: true, overlayMode: 'floating' }
        : { alwaysOnTop: false },
    })
  }

  async function toggleDragLocked() {
    if (!widgetKey || !widgetConfig) {
      return
    }

    await window.timeable.updateOverlayWidget({
      key: widgetKey,
      changes: { dragLocked: !widgetConfig.dragLocked },
    })
    setMenuOpen(false)
  }

  async function toggleAutoHide() {
    if (!widgetKey || !widgetConfig) {
      return
    }

    await window.timeable.updateOverlayWidget({
      key: widgetKey,
      changes: { autoHide: !widgetConfig.autoHide },
    })
    setMenuOpen(false)
  }

  async function hideWidget() {
    if (!widgetKey) {
      return
    }

    await window.timeable.updateOverlayWidget({
      key: widgetKey,
      changes: { enabled: false },
    })
    setMenuOpen(false)
  }

  return (
    <div className={cn('glass-card flex h-full flex-col overflow-hidden', className)}>
      <div className={cn('flex items-center justify-between px-5 py-4', !effectiveDragLocked && 'drag-region')}>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/72 p-1 text-slate-400">
            <GripHorizontal size={18} />
          </div>
          <div className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</div>
        </div>
        <div className="no-drag relative flex items-center gap-2 text-slate-500" ref={menuRef} onPointerDown={(event) => event.stopPropagation()}>
          {toolbarActions}
          <button
            type="button"
            className={cn('overlay-tool-button', data?.desktopSettings.alwaysOnTop && 'overlay-tool-button-active')}
            title={data?.desktopSettings.alwaysOnTop ? '取消置顶' : '置顶'}
            aria-label={data?.desktopSettings.alwaysOnTop ? '取消置顶' : '置顶'}
            onClick={() => void toggleAlwaysOnTop()}
          >
            <Pin size={16} />
          </button>
          <button
            type="button"
            className={cn('overlay-tool-button', menuOpen && 'overlay-tool-button-active')}
            title="卡片选项"
            aria-label="卡片选项"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen ? (
            <div className="overlay-card-menu no-drag" onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => {
                setMenuOpen(false)
                void window.timeable.windowControl('show')
              }}>
                打开主窗口
              </button>
              {widgetConfig ? (
                <>
                  <button type="button" onClick={() => void toggleDragLocked()}>
                    {widgetConfig.dragLocked ? <Unlock size={14} /> : <Lock size={14} />}
                    {widgetConfig.dragLocked ? '解锁拖动' : '锁定拖动'}
                  </button>
                  <button type="button" onClick={() => void toggleAutoHide()}>
                    {widgetConfig.autoHide ? '关闭自动隐藏' : '开启自动隐藏'}
                  </button>
                  <button type="button" onClick={() => void hideWidget()}>
                    <EyeOff size={14} />
                    隐藏卡片
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="no-drag flex-1 px-5 pb-4">{children}</div>
      {footer ? <div className="no-drag border-t border-white/40 px-5 py-3 text-sm text-slate-500">{footer}</div> : null}
    </div>
  )
}
