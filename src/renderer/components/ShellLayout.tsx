import { Outlet } from 'react-router-dom'
import { Sidebar } from '@renderer/components/Sidebar'
import { TitleBar } from '@renderer/components/TitleBar'

export function ShellLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TitleBar />
        <main className="min-h-0 flex-1 overflow-auto px-7 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
