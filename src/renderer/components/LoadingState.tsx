export function LoadingState({ label = '正在载入本地数据...' }: { label?: string }) {
  return (
    <div className="panel-card grid min-h-[280px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-blue-100" />
        <div className="text-xl font-semibold text-slate-800">{label}</div>
        <div className="mt-2 text-sm text-slate-500">数据仅保存在本地，不会上传到任何服务。</div>
      </div>
    </div>
  )
}
