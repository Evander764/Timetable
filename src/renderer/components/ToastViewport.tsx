import { useAppStore } from '@renderer/store/appStore'
import { cn } from '@renderer/utils/cn'

export function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts)
  const dismissToast = useAppStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[200] flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={cn(
            'pointer-events-auto rounded-2xl border px-4 py-3 text-left shadow-[0_18px_35px_rgba(39,71,125,0.18)] backdrop-blur',
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50/95 text-red-700'
              : toast.tone === 'info'
                ? 'border-slate-200 bg-white/95 text-slate-700'
                : 'border-emerald-200 bg-emerald-50/95 text-emerald-700',
          )}
          onClick={() => dismissToast(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
