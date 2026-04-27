import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/75 p-8 text-center">
      <div>
        <div className="text-xl font-semibold text-slate-800">{title}</div>
        <div className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</div>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  )
}
