import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { CountdownStrip } from '@renderer/components/CountdownStrip'
import type { AppData } from '@shared/types/app'
import { getCountdownDisplay } from '@shared/utils/countdown'
import { getCompletionRate, getDayProgressBreakdown, getRemainingTimeToday } from '@shared/utils/tasks'

export function CountdownWidget({ data }: { data: AppData }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pinnedDisplay = getCountdownDisplay(data.countdownItems, data.countdownCard.pinnedItemId, now)
  if (pinnedDisplay) {
    return (
      <CountdownStrip
        className="glass-card no-drag"
        icon={<Clock3 size={16} />}
        label={pinnedDisplay.label}
        value={pinnedDisplay.value}
        meta={pinnedDisplay.meta}
        valueClassName={pinnedDisplay.expired ? 'text-rose-600' : undefined}
      />
    )
  }

  const breakdown = getDayProgressBreakdown(data.dailyTasks, now)
  const completionRate = getCompletionRate(data.dailyTasks, now)

  return (
    <CountdownStrip
      className="glass-card no-drag"
      icon={<Clock3 size={16} />}
      label="Today"
      value={getRemainingTimeToday(now)}
      meta={`${completionRate}% - ${breakdown.completed}/${breakdown.total} tasks`}
    />
  )
}
