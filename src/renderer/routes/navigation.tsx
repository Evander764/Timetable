import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  CheckSquare,
  Clock3,
  Database,
  Home,
  LayoutPanelTop,
  NotebookPen,
  Palette,
  Quote,
  TimerReset,
  Target,
} from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { path: '/overview', label: '总览', icon: Home },
  { path: '/browser-usage', label: '时间统计', icon: Clock3 },
  { path: '/desktop-panel', label: '桌面面板', icon: LayoutPanelTop },
  { path: '/schedule', label: '课程表', icon: CalendarDays },
  { path: '/daily-tasks', label: '每日任务', icon: CheckSquare },
  { path: '/long-term-goals', label: '长期任务', icon: Target },
  { path: '/memos', label: '备忘录', icon: NotebookPen },
  { path: '/countdown', label: '倒计时条', icon: TimerReset },
  { path: '/principle', label: '道理卡片', icon: Quote },
  { path: '/settings', label: '背景与设置', icon: Palette },
  { path: '/data-startup', label: '数据与启动', icon: Database },
]

export const navTitleMap = Object.fromEntries(navItems.map((item) => [item.path, item.label]))
