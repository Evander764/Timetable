import { NavLink } from 'react-router-dom'
import { TimetableMark } from '@renderer/components/TimetableMark'
import { navItems } from '@renderer/routes/navigation'
import { cn } from '@renderer/utils/cn'

export function Sidebar() {
  return (
    <aside className="flex w-[254px] flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-5 pb-5 pt-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-[rgba(17,18,20,0.14)] bg-white text-[var(--color-ink)] shadow-[0_10px_24px_rgba(17,18,20,0.08)]">
          <TimetableMark className="h-[25px] w-[25px]" />
        </div>
        <div>
          <div className="text-[18px] font-semibold tracking-tight text-slate-950">TIMETABLE.OS</div>
          <div className="mt-0.5 font-mono text-[10px] font-semibold uppercase text-slate-400">DAY LEDGER V0.3.8</div>
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

      <div className="mt-5 rounded-md border border-[var(--color-border)] bg-white/80 p-4 text-sm text-slate-500">
        <div className="font-semibold text-slate-800">Timetable v{__APP_VERSION__}</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>DAY_LEDGER // ONLINE</span>
        </div>
      </div>
    </aside>
  )
}
