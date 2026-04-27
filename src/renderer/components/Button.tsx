import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@renderer/utils/cn'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const baseStyles =
  'no-drag inline-flex items-center justify-center gap-2 rounded-lg border px-4 font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'border-transparent bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(22,119,255,0.22)] hover:bg-[var(--color-primary-deep)]',
  secondary: 'border-slate-200 bg-white/80 text-slate-700 hover:border-blue-200 hover:text-blue-600',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-blue-50 hover:text-blue-600',
  danger: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

export function Button({ className, variant = 'secondary', size = 'md', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
