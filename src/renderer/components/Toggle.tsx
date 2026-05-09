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
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(
        'toggle-switch no-drag',
        checked && 'toggle-switch-checked',
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span className="toggle-switch-thumb" />
    </button>
  )
}
