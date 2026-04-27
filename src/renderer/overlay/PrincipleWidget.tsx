import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AppData } from '@shared/types/app'
import { buildPrincipleCardsPayload, getActivePrincipleCard, normalizePrincipleCards } from '@shared/utils/principle'
import { OverlayFrame } from './OverlayFrame'

export function PrincipleWidget({ data }: { data: AppData }) {
  const previousCardIdRef = useRef<string | null>(null)
  const pendingTurnDirectionRef = useRef(1)
  const [now, setNow] = useState(() => new Date())
  const [turnState, setTurnState] = useState({ key: 0, direction: 1 })
  const principleCards = normalizePrincipleCards(data.principleCard)
  const activePrincipleCard = getActivePrincipleCard(data.principleCard, now)
  const activeIndex = Math.max(0, principleCards.findIndex((card) => card.id === activePrincipleCard.id))

  useEffect(() => {
    if (previousCardIdRef.current === null) {
      previousCardIdRef.current = activePrincipleCard.id
      return
    }

    if (previousCardIdRef.current !== activePrincipleCard.id) {
      previousCardIdRef.current = activePrincipleCard.id
      setTurnState((state) => ({ key: state.key + 1, direction: pendingTurnDirectionRef.current }))
      pendingTurnDirectionRef.current = 1
    }
  }, [activePrincipleCard.id])

  useEffect(() => {
    if (!data.principleCard.autoRotate || principleCards.length <= 1) {
      return
    }

    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [data.principleCard.autoRotate, principleCards.length])

  function selectAdjacentCard(offset: number) {
    if (principleCards.length <= 1) {
      return
    }

    pendingTurnDirectionRef.current = offset >= 0 ? 1 : -1
    const nextCard = principleCards[(activeIndex + offset + principleCards.length) % principleCards.length]
    void window.timeable.updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(principleCards, nextCard.id) })
  }

  const rotationControls = principleCards.length > 1 ? (
    <>
      <button className="rounded-full bg-white/70 p-1.5 text-slate-500 hover:text-slate-900" type="button" title="上一张" onClick={() => selectAdjacentCard(-1)}>
        <ChevronLeft size={15} />
      </button>
      <span className="text-xs text-slate-400">{activeIndex + 1}/{principleCards.length}</span>
      <button className="rounded-full bg-white/70 p-1.5 text-slate-500 hover:text-slate-900" type="button" title="下一张" onClick={() => selectAdjacentCard(1)}>
        <ChevronRight size={15} />
      </button>
    </>
  ) : null

  return (
    <OverlayFrame title="最重要的道理" widgetKey="principle" data={data} toolbarActions={rotationControls}>
      <div className="principle-page-stage flex h-full flex-col justify-start pt-1 text-center">
        <div key={turnState.key} className="principle-page-turn" style={{ ['--turn-direction' as string]: turnState.direction }}>
          <div className="mt-1 whitespace-pre-line text-[22px] font-semibold leading-[1.55] text-slate-900">{activePrincipleCard.content}</div>
          {activePrincipleCard.author ? <div className="mt-4 text-[16px] text-slate-500">{activePrincipleCard.author}</div> : null}
        </div>
      </div>
    </OverlayFrame>
  )
}
