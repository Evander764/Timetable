import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { LoadingState } from '@renderer/components/LoadingState'
import { PageHeader } from '@renderer/components/PageHeader'
import { PositionPicker } from '@renderer/components/PositionPicker'
import { Toggle } from '@renderer/components/Toggle'
import { useAppStore } from '@renderer/store/appStore'
import type { PrincipleCardEntry } from '@shared/types/app'
import { buildPrincipleCardsPayload, normalizePrincipleCards } from '@shared/utils/principle'
import { createId } from '@shared/utils/id'

function createBlankPrincipleCard(index: number): PrincipleCardEntry {
  return {
    id: createId('principle-card'),
    content: `新的道理 ${index + 1}`,
    author: '',
  }
}

export function PrinciplePage() {
  const data = useAppStore((state) => state.data)
  const updateData = useAppStore((state) => state.updateData)
  const updateWidget = useAppStore((state) => state.updateWidget)
  const snapWidgetPosition = useAppStore((state) => state.snapWidgetPosition)
  const principle = data?.principleCard
  const [draftContent, setDraftContent] = useState('')
  const [draftAuthor, setDraftAuthor] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const principleCards = principle ? normalizePrincipleCards(principle) : []
  const selectedCard =
    principleCards.find((card) => card.id === selectedCardId)
    ?? principleCards.find((card) => card.id === principle?.activeCardId)
    ?? principleCards[0]

  if (!data || !principle) {
    return <LoadingState />
  }

  const widget = data.desktopSettings.widgets.principle
  const displayMode = principle.displayMode ?? 'embedded'
  const selectedCardIndex = Math.max(0, principleCards.findIndex((card) => card.id === selectedCard?.id))
  const editingSelected = Boolean(selectedCard && selectedCardId === selectedCard.id)
  const currentContent = editingSelected ? draftContent : selectedCard?.content ?? ''
  const currentAuthor = editingSelected ? draftAuthor : selectedCard?.author ?? ''

  function persistSelectedDraft(nextContent = currentContent, nextAuthor = currentAuthor) {
    if (!selectedCard) {
      return
    }
    const cards = principleCards.map((card) => card.id === selectedCard.id ? { ...card, content: nextContent, author: nextAuthor } : card)
    void updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(cards, selectedCard.id) })
  }

  function selectCard(card: PrincipleCardEntry) {
    if (selectedCard) {
      const cards = principleCards.map((item) => item.id === selectedCard.id ? { ...item, content: currentContent, author: currentAuthor } : item)
      void updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(cards, card.id) })
    }
    setSelectedCardId(card.id)
    setDraftContent(card.content ?? '')
    setDraftAuthor(card.author ?? '')
  }

  function selectAdjacentCard(offset: number) {
    if (!principleCards.length) {
      return
    }
    const nextIndex = (selectedCardIndex + offset + principleCards.length) % principleCards.length
    selectCard(principleCards[nextIndex])
  }

  function addPrincipleCard() {
    const card = createBlankPrincipleCard(principleCards.length)
    const cards = [...(selectedCard ? principleCards.map((item) => item.id === selectedCard.id ? { ...item, content: currentContent, author: currentAuthor } : item) : principleCards), card]
    setSelectedCardId(card.id)
    setDraftContent(card.content)
    setDraftAuthor(card.author ?? '')
    void updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(cards, card.id) }, '道理卡片已添加。')
  }

  function deletePrincipleCard() {
    if (!selectedCard || principleCards.length <= 1) {
      return
    }
    const cards = principleCards.filter((card) => card.id !== selectedCard.id)
    const nextCard = cards[Math.max(0, selectedCardIndex - 1)]
    setSelectedCardId(nextCard.id)
    void updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(cards, nextCard.id) }, '道理卡片已删除。')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="道理卡片"
        subtitle="维护桌面上最重要的一组提醒，可手动切换或自动轮换。"
        actions={
          <Button variant="primary" onClick={() => void window.timeable.showOverlay()}>
            <Eye size={18} />
            显示桌面卡片
          </Button>
        }
      />

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-slate-900">卡片内容</div>
              <div className="mt-1 text-sm text-slate-500">{principleCards.length} 张卡片 · 当前第 {selectedCardIndex + 1} 张</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => selectAdjacentCard(-1)} disabled={principleCards.length <= 1}>
                <ChevronLeft size={16} />
              </Button>
              <Button size="sm" onClick={() => selectAdjacentCard(1)} disabled={principleCards.length <= 1}>
                <ChevronRight size={16} />
              </Button>
              <Button size="sm" onClick={addPrincipleCard}>
                <Plus size={16} />
              </Button>
              <Button variant="danger" size="sm" onClick={deletePrincipleCard} disabled={principleCards.length <= 1}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid balanced-choice-grid gap-2">
            {principleCards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                className={`rounded-[14px] border px-3 py-2 text-left text-sm transition ${selectedCard?.id === card.id ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => selectCard(card)}
              >
                <div className="font-semibold">第 {index + 1} 张</div>
                <div className="mt-1 truncate text-xs opacity-80">{card.content || '空白卡片'}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-500">道理正文</div>
              <textarea
                className="form-textarea min-h-[220px]"
                value={currentContent}
                onChange={(event) => {
                  if (selectedCard && selectedCardId !== selectedCard.id) {
                    setSelectedCardId(selectedCard.id)
                  }
                  setDraftContent(event.target.value)
                }}
                onBlur={() => persistSelectedDraft()}
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-500">署名</div>
              <input
                className="form-input"
                value={currentAuthor}
                onChange={(event) => {
                  if (selectedCard && selectedCardId !== selectedCard.id) {
                    setSelectedCardId(selectedCard.id)
                  }
                  setDraftAuthor(event.target.value)
                }}
                onBlur={() => persistSelectedDraft()}
              />
            </label>
            <Button variant="primary" onClick={() => persistSelectedDraft()}>保存当前卡片</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="text-2xl font-semibold text-slate-900">显示方式</div>
            <div className="mt-5 space-y-4">
              <SettingRow label="在主面板内显示">
                <Toggle
                  checked={displayMode === 'embedded'}
                  onCheckedChange={(checked) => void updateData({ type: 'principle/update', payload: { displayMode: checked ? 'embedded' : 'standalone' } }, '道理卡片显示方式已更新。')}
                />
              </SettingRow>
              <SettingRow label="独立桌面卡片">
                <Toggle
                  checked={displayMode === 'standalone' && widget.enabled}
                  onCheckedChange={(checked) => {
                    void updateWidget({ key: 'principle', changes: { enabled: checked } })
                    void updateData({ type: 'principle/update', payload: { displayMode: checked ? 'standalone' : 'embedded', enabled: checked } })
                  }}
                />
              </SettingRow>
              <SettingRow label="自动轮换">
                <Toggle checked={Boolean(principle.autoRotate)} onCheckedChange={(checked) => void updateData({ type: 'principle/update', payload: { autoRotate: checked } }, checked ? '已开启自动轮换。' : '已关闭自动轮换。')} />
              </SettingRow>
              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-500">轮换间隔（秒）</div>
                <input className="form-input" type="number" min={10} max={3600} value={principle.rotateIntervalSeconds ?? 60} onChange={(event) => void updateData({ type: 'principle/update', payload: { rotateIntervalSeconds: Number(event.target.value) } })} />
              </label>
            </div>
          </Card>

          <Card>
            <div className="text-2xl font-semibold text-slate-900">桌面卡片</div>
            <div className="mt-5 space-y-4">
              <PositionPicker value={principle.position} onChange={(position) => void snapWidgetPosition({ key: 'principle', position }, '道理卡片位置已更新。')} />
              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-500">不透明度</div>
                <input
                  className="w-full"
                  type="range"
                  min={60}
                  max={100}
                  value={Math.round((widget.opacity ?? principle.opacity) * 100)}
                  onChange={(event) => {
                    const opacity = Number(event.target.value) / 100
                    void updateWidget({ key: 'principle', changes: { opacity } })
                    void updateData({ type: 'principle/update', payload: { opacity } })
                  }}
                />
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-slate-200/80 bg-white/88 px-4 py-3">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </div>
  )
}
