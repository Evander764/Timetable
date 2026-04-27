import { cn } from '@renderer/utils/cn'

type ProgressBarProps = {
  value: number
  className?: string
  accentClassName?: string
}

export function ProgressBar({ value, className, accentClassName }: ProgressBarProps) {
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-slate-200/80', className)}>
      <div
        className={cn('h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300', accentClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
