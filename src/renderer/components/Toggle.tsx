import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/utils/cn'

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Toggle({ checked, onCheckedChange, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn(
        'no-drag relative inline-flex h-7 w-12 items-center rounded-full border transition',
        checked
          ? 'border-blue-400 bg-[var(--color-primary)] shadow-[0_8px_18px_rgba(47,116,255,0.28)]'
          : 'border-slate-200 bg-slate-200/80',
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  )
}
