import type { PropsWithChildren, ReactNode } from 'react'

type PageHeaderProps = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
}>

export function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-[var(--color-text-soft)]">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
