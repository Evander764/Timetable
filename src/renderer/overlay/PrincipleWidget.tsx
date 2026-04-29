import type { AppData } from '@shared/types/app'
import { OverlayFrame } from './OverlayFrame'

export function PrincipleWidget({ data }: { data: AppData }) {
  return (
    <OverlayFrame title="最重要的道理" widgetKey="principle" data={data}>
      <div className="flex h-full flex-col justify-center text-center">
        <div className="text-4xl text-slate-200">“</div>
        <div className="mt-2 text-[22px] font-semibold leading-[1.6] text-slate-900 whitespace-pre-line">{data.principleCard.content}</div>
        <div className="mt-5 text-[16px] text-slate-500">{data.principleCard.author}</div>
      </div>
    </OverlayFrame>
  )
}
