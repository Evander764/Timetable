import type { ReactNode } from 'react'
import { cn } from '@renderer/utils/cn'

type CountdownStripProps = {
  icon: ReactNode
  label: string
  value: string
  meta?: string
  className?: string
  iconClassName?: string
  valueClassName?: string
}

export function CountdownStrip({
  icon,
  label,
  value,
  meta,
  className,
  iconClassName,
  valueClassName,
}: CountdownStripProps) {
  return (
    <div className={cn('flex h-full min-h-0 w-full items-center gap-2 overflow-hidden px-3 py-1.5', className)}>
      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/72 text-blue-600 shadow-sm', iconClassName)}>
        {icon}
      </span>
      <span className="min-w-0 max-w-[9rem] truncate text-xs font-medium text-slate-500">{label}</span>
      <span className={cn('min-w-0 flex-1 truncate text-[23px] font-semibold leading-none tracking-tight text-[var(--color-primary)]', valueClassName)}>
        {value}
      </span>
      {meta ? <span className="shrink-0 truncate text-xs font-medium text-slate-500">{meta}</span> : null}
    </div>
  )
}
