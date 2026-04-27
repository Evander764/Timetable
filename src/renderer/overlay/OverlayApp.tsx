import { useParams } from 'react-router-dom'
import { LoadingState } from '@renderer/components/LoadingState'
import { useAppStore } from '@renderer/store/appStore'
import type { WidgetKey } from '@shared/types/app'
import { CountdownWidget } from './CountdownWidget'
import { DailyTaskWidget } from './DailyTaskWidget'
import { DesktopMainPanel } from './DesktopMainPanel'
import { MemoWidget } from './MemoWidget'
import { PrincipleWidget } from './PrincipleWidget'

const widgetMap: Record<WidgetKey, (typeof DesktopMainPanel)> = {
  mainPanel: DesktopMainPanel,
  dailyTasks: DailyTaskWidget,
  memo: MemoWidget,
  countdown: CountdownWidget,
  principle: PrincipleWidget,
}

export function OverlayApp() {
  const { widgetKey } = useParams()
  const data = useAppStore((state) => state.data)

  if (!data || !widgetKey || !(widgetKey in widgetMap)) {
    return (
      <div className="overlay-root">
        <LoadingState label="正在准备桌面卡片..." />
      </div>
    )
  }

  const key = widgetKey as WidgetKey
  const Widget = widgetMap[key]

  return (
    <div className="overlay-root" onMouseEnter={() => window.timeable.overlayHover(key, true)} onMouseLeave={() => window.timeable.overlayHover(key, false)}>
      <Widget data={data} />
    </div>
  )
}
