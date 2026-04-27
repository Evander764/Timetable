import type { AppData } from '@shared/types/app'
import { OverlayFrame } from './OverlayFrame'

export function MemoWidget({ data }: { data: AppData }) {
  const memo = data.memos.find((item) => item.status === 'active' && item.showOnDesktop)

  return (
    <OverlayFrame title="进行中备忘" dragLocked={data.desktopSettings.dragLocked}>
      {memo ? (
        <div className="rounded-[22px] border border-amber-200/70 bg-amber-50/72 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[18px] font-semibold text-slate-900">{memo.title}</div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm text-blue-600">进行中</span>
          </div>
          <div className="mt-4 line-clamp-5 text-[15px] leading-7 text-slate-700">{memo.content}</div>
          <div className="mt-4 text-sm text-slate-500">创建于 {new Date(memo.createdAt).toLocaleString()}</div>
        </div>
      ) : (
        <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-white/55 bg-white/24 text-center text-slate-500">
          当前没有需要展示到桌面的进行中备忘。
        </div>
      )}
    </OverlayFrame>
  )
}
