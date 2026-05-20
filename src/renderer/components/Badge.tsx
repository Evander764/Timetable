import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@renderer/utils/cn'

type BadgeProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & {
  tone?: 'neutral' | 'accent' | 'warm'
}

const toneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-white/70 text-slate-600',
  accent: 'bg-[var(--accent-soft)] text-[var(--color-primary)]',
  warm: 'bg-amber-50/80 text-amber-700',
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
