import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ShellLayout } from '@renderer/components/ShellLayout'
import { ToastViewport } from '@renderer/components/ToastViewport'
import { DataStartupPage } from '@renderer/pages/DataStartupPage'
import { CountdownPage } from '@renderer/pages/CountdownPage'
import { DailyTasksPage } from '@renderer/pages/DailyTasksPage'
import { DesktopPanelPage } from '@renderer/pages/DesktopPanelPage'
import { LongTermGoalsPage } from '@renderer/pages/LongTermGoalsPage'
import { MemosPage } from '@renderer/pages/MemosPage'
import { OverviewPage } from '@renderer/pages/OverviewPage'
import { PrinciplePage } from '@renderer/pages/PrinciplePage'
import { SchedulePage } from '@renderer/pages/SchedulePage'
import { SettingsPage } from '@renderer/pages/SettingsPage'
import { OverlayApp } from '@renderer/overlay/OverlayApp'
import { useAppStore } from '@renderer/store/appStore'

function Boot() {
  const load = useAppStore((state) => state.load)
  const setData = useAppStore((state) => state.setData)
  const setWindowState = useAppStore((state) => state.setWindowState)

  useEffect(() => {
    void load()
    const removeDataListener = window.timeable.onDataChanged((data) => setData(data))
    const removeWindowStateListener = window.timeable.onWindowStateChanged((payload) => setWindowState(payload))
    return () => {
      removeDataListener()
      removeWindowStateListener()
    }
  }, [load, setData, setWindowState])

  return null
}

export default function App() {
  return (
    <>
      <Boot />
      <HashRouter>
        <Routes>
          <Route path="/overlay/:widgetKey" element={<OverlayApp />} />
          <Route element={<ShellLayout />}>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/desktop-panel" element={<DesktopPanelPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/daily-tasks" element={<DailyTasksPage />} />
            <Route path="/long-term-goals" element={<LongTermGoalsPage />} />
            <Route path="/memos" element={<MemosPage />} />
            <Route path="/countdown" element={<CountdownPage />} />
            <Route path="/principle" element={<PrinciplePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/data-startup" element={<DataStartupPage />} />
          </Route>
        </Routes>
      </HashRouter>
      <ToastViewport />
    </>
  )
}
