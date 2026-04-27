import type { ReactNode } from 'react'
import { useState } from 'react'
import { Pin, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { Memo } from '@shared/types/app'
import { createId } from '@shared/utils/id'

function createBlankMemo(): Memo {
  return {
    id: createId('memo'),
    title: '',
    content: '',
    status: 'active',
    showOnDesktop: true,
    createdAt: new Date().toISOString(),
  }
}

export function MemosPage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Memo>(createBlankMemo)

  if (!data) {
    return <LoadingState />
  }

  const activeMemos = data.memos.filter((memo) => memo.status === 'active')
  const endedMemos = data.memos.filter((memo) => memo.status === 'ended')

  async function saveMemo() {
    await updateData({ type: 'memo/upsert', payload: draft }, selectedMemoId ? '备忘录已更新。' : '备忘录已创建。')
    setSelectedMemoId(draft.id)
  }

  async function endMemo() {
    if (!selectedMemoId) {
      return
    }
    await updateData({ type: 'memo/end', payload: { id: selectedMemoId, endedAt: new Date().toISOString() } }, '备忘录已标记结束。')
  }

  async function deleteMemo() {
    if (!selectedMemoId) {
      setDraft(createBlankMemo())
      return
    }
    await updateData({ type: 'memo/delete', payload: { id: selectedMemoId } }, '备忘录已删除。')
    setSelectedMemoId(null)
    setDraft(createBlankMemo())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="备忘录"
        subtitle="记录短期提醒和灵感摘记，并决定哪些内容要同步到桌面。"
        actions={
          <Button variant="primary" onClick={() => {
            setSelectedMemoId(null)
            setDraft(createBlankMemo())
          }}>
            <Plus size={18} />
            新建备忘录
          </Button>
        }
      />

      <div className="grid grid-cols-[340px_1fr] gap-4">
        <div className="space-y-4">
          <Card>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">进行中</div>
            <div className="mt-5 space-y-3">
              {activeMemos.length ? (
                activeMemos.map((memo) => (
                  <button
                    key={memo.id}
                    type="button"
                    className={`w-full rounded-[22px] border p-4 text-left ${selectedMemoId === memo.id ? 'border-blue-300 bg-blue-50/80' : 'border-amber-200/80 bg-amber-50/85'}`}
                    onClick={() => {
                      setSelectedMemoId(memo.id)
                      setDraft(memo)
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">{memo.title}</div>
                      {memo.showOnDesktop ? <Pin size={18} className="text-blue-600" /> : null}
                    </div>
                    <div className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{memo.content}</div>
                  </button>
                ))
              ) : (
                <EmptyState title="暂无进行中备忘" description="可以把阶段要点、灵感或提醒写在这里。" />
              )}
            </div>
          </Card>

          <Card>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">已结束</div>
            <div className="mt-5 space-y-3">
              {endedMemos.length ? (
                endedMemos.map((memo) => (
                  <button
                    key={memo.id}
                    type="button"
                    className="w-full rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 text-left"
                    onClick={() => {
                      setSelectedMemoId(memo.id)
                      setDraft(memo)
                    }}
                  >
                    <div className="text-xl font-semibold text-slate-700">{memo.title}</div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{memo.content}</div>
                  </button>
                ))
              ) : (
                <EmptyState title="暂无已结束备忘" description="结束的备忘会归档在这里，并自动从桌面移除。" />
              )}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">备忘详情</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{draft.title || '未命名备忘'}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm ${draft.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {draft.status === 'active' ? '进行中' : '已结束'}
            </span>
          </div>

          <div className="mt-6 grid gap-5">
            <Field label="标题">
              <input className="form-input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：毕业设计思路整理" />
            </Field>
            <Field label="内容">
              <textarea className="form-textarea min-h-[220px]" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="写下需要长期提醒自己的内容..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="创建时间">
                <input className="form-input" value={new Date(draft.createdAt).toLocaleString()} readOnly />
              </Field>
              <Field label="结束时间">
                <input className="form-input" value={draft.endedAt ? new Date(draft.endedAt).toLocaleString() : '未结束'} readOnly />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">显示在桌面</div>
                <div className="mt-1 text-sm text-slate-500">仅 active 状态的备忘会真正显示到桌面卡片。</div>
              </div>
              <Toggle checked={draft.showOnDesktop && draft.status === 'active'} onCheckedChange={(checked) => setDraft({ ...draft, showOnDesktop: checked })} disabled={draft.status !== 'active'} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="flex-1" onClick={() => {
              setSelectedMemoId(null)
              setDraft(createBlankMemo())
            }}>
              重置
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => void saveMemo()} disabled={!draft.title || !draft.content}>
              保存备忘录
            </Button>
            <Button variant="danger" onClick={() => void deleteMemo()}>
              <Trash2 size={18} />
            </Button>
          </div>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => void endMemo()} disabled={draft.status === 'ended' || !selectedMemoId}>
            标记结束
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      {children}
    </label>
  )
}
