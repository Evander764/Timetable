import { NavLink } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { navItems } from '@renderer/routes/navigation'
import { cn } from '@renderer/utils/cn'

export function Sidebar() {
  return (
    <aside className="flex w-[230px] flex-col border-r border-slate-200/70 bg-white/72 px-4 pb-5 pt-4 backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(22,119,255,0.24)]">
          <Waves size={21} strokeWidth={2.4} />
        </div>
        <div>
          <div className="text-[13px] font-medium text-slate-500">Timeable</div>
          <div className="text-[18px] font-semibold text-slate-900">流的搭建</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
            >
              <Icon size={18} strokeWidth={2.1} />
              <span className="text-[16px] font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-5 rounded-lg border border-slate-200/70 bg-white/78 p-4 text-sm text-slate-500 shadow-[0_8px_18px_rgba(84,110,160,0.08)]">
        <div className="font-semibold text-slate-700">流的搭建 v0.1.0</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>专注当下，持续成长</span>
        </div>
      </div>
    </aside>
  )
}
