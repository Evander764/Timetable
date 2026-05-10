import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Clock3,
  Database,
  Home,
  LayoutPanelTop,
  NotebookPen,
  Palette,
  Quote,
  SquareCheckBig,
  TimerReset,
  Target,
} from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { path: '/overview', label: '今日校准', icon: Home },
  { path: '/browser-usage', label: '时间审计', icon: Clock3 },
  { path: '/desktop-panel', label: '桌面浮窗', icon: LayoutPanelTop },
  { path: '/schedule', label: '课程账本', icon: CalendarDays },
  { path: '/daily-tasks', label: '执行队列', icon: SquareCheckBig },
  { path: '/long-term-goals', label: '目标档案', icon: Target },
  { path: '/memos', label: '备忘档案', icon: NotebookPen },
  { path: '/countdown', label: '倒计时', icon: TimerReset },
  { path: '/principle', label: '原则卡', icon: Quote },
  { path: '/settings', label: '系统设置', icon: Palette },
  { path: '/data-startup', label: '数据中枢', icon: Database },
]

export const navTitleMap = Object.fromEntries(navItems.map((item) => [item.path, item.label]))
