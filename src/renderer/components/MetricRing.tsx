type MetricRingProps = {
  value: number
  size?: number
  label?: string
}

export function MetricRing({ value, size = 92, label }: MetricRingProps) {
  const safeValue = Math.max(0, Math.min(100, value))
  const background = `conic-gradient(var(--color-primary) ${safeValue}%, #e8e3da ${safeValue}% 100%)`

  return (
    <div
      className="grid place-items-center rounded-full p-3"
      style={{ width: size, height: size, background }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[var(--color-card)] text-center shadow-inner">
        <div>
          <div className="text-2xl font-semibold text-slate-800">{safeValue}%</div>
          {label ? <div className="mt-1 text-xs text-slate-500">{label}</div> : null}
        </div>
      </div>
    </div>
  )
}
