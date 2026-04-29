import { NavLink } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { navItems } from '@renderer/routes/navigation'
import { cn } from '@renderer/utils/cn'

export function Sidebar() {
  return (
    <aside className="flex w-[204px] flex-col border-r border-slate-200/70 bg-white/72 px-3 pb-4 pt-3 backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-2.5 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(22,119,255,0.24)]">
          <Waves size={19} strokeWidth={2.4} />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-slate-900">Timetable</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
            >
              <Icon size={18} strokeWidth={2.1} />
              <span className="text-[14px] font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-slate-200/70 bg-white/78 p-3 text-xs text-slate-500 shadow-[0_8px_18px_rgba(84,110,160,0.08)]">
        <div className="font-semibold text-slate-700">Timetable v0.1.0</div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>专注当下，持续成长</span>
        </div>
      </div>
    </aside>
  )
}
