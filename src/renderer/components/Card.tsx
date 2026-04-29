import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@renderer/utils/cn'

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  padded?: boolean
}

export function Card({ className, padded = true, children, ...props }: CardProps) {
  return (
    <div className={cn('panel-card', padded && 'p-[14px]', className)} {...props}>
      {children}
    </div>
  )
}
