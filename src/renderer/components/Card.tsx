import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@renderer/utils/cn'

type CardVariant = 'panel' | 'surface' | 'surface-dark' | 'glass'

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  padded?: boolean
  variant?: CardVariant
  interactive?: boolean
}

const VARIANT_CLASS: Record<CardVariant, string> = {
  panel: 'panel-card',
  surface: 'surface-card',
  'surface-dark': 'surface-card surface-card--dark',
  glass: 'glass-card',
}

export function Card({ className, padded = true, variant = 'panel', interactive = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(VARIANT_CLASS[variant], padded && 'p-[18px]', interactive && 'is-interactive', className)}
      {...props}
    >
      {children}
    </div>
  )
}
