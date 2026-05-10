import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AppData, PrincipleCardEntry } from '@shared/types/app'
import {
  buildPrincipleCardsPayload,
  getActivePrincipleCard,
  normalizePrincipleCards,
  normalizePrincipleRotationInterval,
} from '@shared/utils/principle'
import { calculatePrincipleMeasuredLayout, PRINCIPLE_LAYOUT_DEFAULTS } from '@shared/utils/principleLayout'
import { OverlayFrame } from './OverlayFrame'

const PRINCIPLE_HEIGHT_UPDATE_DELAY = 120

type PrincipleTextBlockProps = {
  card: PrincipleCardEntry
  fontScale: number
  className?: string
  style?: CSSProperties
  measure?: boolean
}

type PrincipleMeasuredState = {
  fontScale: number
  contentFontSize: number
  authorFontSize: number
}

function getViewportHeight(): number {
  return Math.max(window.screen?.availHeight ?? 0, window.visualViewport?.height ?? 0, window.innerHeight ?? 0)
}

function getPrincipleTextStyles(fontScale: number): { content: CSSProperties; author: CSSProperties } {
  const safeScale = Math.max(PRINCIPLE_LAYOUT_DEFAULTS.minFontScale, fontScale)

  return {
    content: {
      fontSize: PRINCIPLE_LAYOUT_DEFAULTS.contentFontSize * safeScale,
      lineHeight: PRINCIPLE_LAYOUT_DEFAULTS.contentLineHeight,
    },
    author: {
      fontSize: PRINCIPLE_LAYOUT_DEFAULTS.authorFontSize * safeScale,
      lineHeight: PRINCIPLE_LAYOUT_DEFAULTS.authorLineHeight,
      marginTop: PRINCIPLE_LAYOUT_DEFAULTS.authorMarginTop * safeScale,
    },
  }
}

function PrincipleTextBlock({ card, fontScale, className, style, measure }: PrincipleTextBlockProps) {
  const textStyles = getPrincipleTextStyles(fontScale)

  return (
    <div className={className} style={style} data-principle-measure-card={measure ? 'true' : undefined}>
      <div className="whitespace-pre-line font-semibold text-slate-900" style={textStyles.content}>{card.content}</div>
      {card.author ? <div className="text-slate-500" style={textStyles.author}>{card.author}</div> : null}
    </div>
  )
}

export function PrincipleWidget({ data }: { data: AppData }) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const measurementLayerRef = useRef<HTMLDivElement | null>(null)
  const previousCardIdRef = useRef<string | null>(null)
  const pendingTurnDirectionRef = useRef(1)
  const heightUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRequestedHeightRef = useRef<number | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [turnState, setTurnState] = useState({ key: 0, direction: 1 })
  const [manualCardId, setManualCardId] = useState<string | null>(null)
  const [measuredLayout, setMeasuredLayout] = useState<PrincipleMeasuredState>(() => ({
    fontScale: 1,
    contentFontSize: PRINCIPLE_LAYOUT_DEFAULTS.contentFontSize,
    authorFontSize: PRINCIPLE_LAYOUT_DEFAULTS.authorFontSize,
  }))
  const widgetConfig = data.desktopSettings.widgets.principle
  const principleCards = useMemo(() => normalizePrincipleCards(data.principleCard), [data.principleCard])
  const principleCardsSignature = useMemo(
    () => principleCards.map((card) => `${card.id}\u0000${card.content}\u0000${card.author ?? ''}`).join('\u0001'),
    [principleCards],
  )
  const autoPrincipleCard = getActivePrincipleCard(data.principleCard, now)
  const manualPrincipleCard = manualCardId ? principleCards.find((card) => card.id === manualCardId) : null
  const activePrincipleCard = manualPrincipleCard ?? autoPrincipleCard
  const activeIndex = Math.max(0, principleCards.findIndex((card) => card.id === activePrincipleCard.id))

  useEffect(() => {
    return () => {
      if (heightUpdateTimerRef.current) {
        clearTimeout(heightUpdateTimerRef.current)
        heightUpdateTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (lastRequestedHeightRef.current !== null && Math.abs(widgetConfig.height - lastRequestedHeightRef.current) <= PRINCIPLE_LAYOUT_DEFAULTS.heightUpdateThreshold) {
      lastRequestedHeightRef.current = null
    }
  }, [widgetConfig.height])

  useLayoutEffect(() => {
    const body = bodyRef.current
    const measurementLayer = measurementLayerRef.current

    if (!body || !measurementLayer) {
      return
    }

    const bodyElement = body
    const measurementElement = measurementLayer
    let animationFrameId: number | null = null

    function measure() {
      const measuredCards = Array.from(measurementElement.querySelectorAll<HTMLElement>('[data-principle-measure-card="true"]'))

      if (!measuredCards.length) {
        return
      }

      const frame = bodyElement.closest('.glass-card') as HTMLElement | null
      const bodyRect = bodyElement.getBoundingClientRect()
      const frameRect = frame?.getBoundingClientRect()
      const bodyStyle = window.getComputedStyle(bodyElement)
      const headerHeight = frameRect ? Math.max(0, bodyRect.top - frameRect.top) : 0
      const verticalPadding = Number.parseFloat(bodyStyle.paddingTop || '0') + Number.parseFloat(bodyStyle.paddingBottom || '0')
      const cardHeights = measuredCards.map((card) => Math.ceil(card.getBoundingClientRect().height))
      const nextLayout = calculatePrincipleMeasuredLayout({
        cardHeights,
        headerHeight,
        verticalPadding,
        currentHeight: widgetConfig.height,
        viewportHeight: getViewportHeight(),
      })

      setMeasuredLayout((current) => (
        current.fontScale === nextLayout.fontScale
        && current.contentFontSize === nextLayout.contentFontSize
        && current.authorFontSize === nextLayout.authorFontSize
          ? current
          : {
              fontScale: nextLayout.fontScale,
              contentFontSize: nextLayout.contentFontSize,
              authorFontSize: nextLayout.authorFontSize,
            }
      ))

      if (!nextLayout.shouldUpdateHeight) {
        lastRequestedHeightRef.current = null
        if (heightUpdateTimerRef.current) {
          clearTimeout(heightUpdateTimerRef.current)
          heightUpdateTimerRef.current = null
        }
        return
      }

      if (lastRequestedHeightRef.current === nextLayout.targetHeight) {
        return
      }

      lastRequestedHeightRef.current = nextLayout.targetHeight
      if (heightUpdateTimerRef.current) {
        clearTimeout(heightUpdateTimerRef.current)
      }
      heightUpdateTimerRef.current = setTimeout(() => {
        heightUpdateTimerRef.current = null
        void window.timeable.updateOverlayWidget({
          key: 'principle',
          changes: { height: nextLayout.targetHeight },
        }).catch(() => {
          lastRequestedHeightRef.current = null
        })
      }, PRINCIPLE_HEIGHT_UPDATE_DELAY)
    }

    function scheduleMeasure() {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        measure()
      })
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure)
    resizeObserver?.observe(bodyElement)
    window.visualViewport?.addEventListener('resize', scheduleMeasure)
    window.addEventListener('resize', scheduleMeasure)
    scheduleMeasure()

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
      resizeObserver?.disconnect()
      window.visualViewport?.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [principleCardsSignature, widgetConfig.height])

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

  useEffect(() => {
    if (!manualCardId || !data.principleCard.autoRotate) {
      return
    }

    const intervalMs = normalizePrincipleRotationInterval(data.principleCard.rotateIntervalSeconds) * 1000
    const timer = setTimeout(() => setManualCardId(null), intervalMs)
    return () => clearTimeout(timer)
  }, [data.principleCard.autoRotate, data.principleCard.rotateIntervalSeconds, manualCardId])

  function selectAdjacentCard(offset: number) {
    if (principleCards.length <= 1) {
      return
    }

    pendingTurnDirectionRef.current = offset >= 0 ? 1 : -1
    const nextCard = principleCards[(activeIndex + offset + principleCards.length) % principleCards.length]
    setManualCardId(nextCard.id)
    void window.timeable.updateData({ type: 'principle/update', payload: buildPrincipleCardsPayload(principleCards, nextCard.id) })
  }

  const rotationControls = principleCards.length > 1 ? (
    <>
      <button
        className="no-drag overlay-tool-button"
        type="button"
        title="上一张"
        aria-label="上一张道理卡片"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          selectAdjacentCard(-1)
        }}
      >
        <ChevronLeft size={15} />
      </button>
      <span className="no-drag text-xs text-slate-400">{activeIndex + 1}/{principleCards.length}</span>
      <button
        className="no-drag overlay-tool-button"
        type="button"
        title="下一张"
        aria-label="下一张道理卡片"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          selectAdjacentCard(1)
        }}
      >
        <ChevronRight size={15} />
      </button>
    </>
  ) : null

  return (
    <OverlayFrame
      title="原则卡"
      widgetKey="principle"
      data={data}
      toolbarActions={rotationControls}
      bodyRef={bodyRef}
      bodyClassName="relative flex min-h-0 items-center justify-center px-5 py-4"
    >
      <div className="principle-page-stage relative flex h-full min-h-0 w-full items-center justify-center text-center">
        <div className="principle-page-visual-offset w-full">
          <PrincipleTextBlock
            key={turnState.key}
            card={activePrincipleCard}
            fontScale={measuredLayout.fontScale}
            className="principle-page-turn w-full"
            style={{ ['--turn-direction' as string]: turnState.direction } as CSSProperties}
          />
        </div>
        <div ref={measurementLayerRef} className="pointer-events-none invisible absolute inset-x-0 top-0 overflow-visible" aria-hidden="true">
          {principleCards.map((card) => (
            <PrincipleTextBlock key={card.id} card={card} fontScale={1} className="w-full" measure />
          ))}
        </div>
      </div>
    </OverlayFrame>
  )
}
