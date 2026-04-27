import type { WidgetPosition } from '@shared/types/app'
import { cn } from '@renderer/utils/cn'

const positions: Array<{ value: WidgetPosition; label: string }> = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上' },
  { value: 'middle-left', label: '左中' },
  { value: 'center', label: '居中' },
  { value: 'middle-right', label: '右中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下' },
]

export function PositionPicker({
  value,
  onChange,
}: {
  value: WidgetPosition
  onChange: (value: WidgetPosition) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {positions.map((position) => (
        <button
          key={position.value}
          type="button"
          className={cn(
            'rounded-2xl border px-3 py-2 text-sm font-medium transition',
            value === position.value
              ? 'border-blue-300 bg-blue-50 text-blue-600'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600',
          )}
          onClick={() => onChange(position.value)}
        >
          {position.label}
        </button>
      ))}
    </div>
  )
}
