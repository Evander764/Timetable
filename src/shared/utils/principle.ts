import type { PrincipleCard, PrincipleCardEntry } from '@shared/types/app'
import { createId } from './id'

export function normalizePrincipleRotationInterval(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 60
  }
  return Math.min(3600, Math.max(10, Math.round(parsed)))
}

export function normalizePrincipleCardEntry(
  card: Partial<PrincipleCardEntry> | undefined,
  fallbackContent = '',
  fallbackAuthor = '',
): PrincipleCardEntry {
  return {
    id: typeof card?.id === 'string' && card.id ? card.id : createId('principle-card'),
    content: typeof card?.content === 'string' ? card.content : fallbackContent,
    author: typeof card?.author === 'string' ? card.author : fallbackAuthor,
  }
}

export function normalizePrincipleCard(principleCard: PrincipleCard): PrincipleCard {
  const fallbackContent = typeof principleCard.content === 'string' ? principleCard.content : ''
  const fallbackAuthor = typeof principleCard.author === 'string' ? principleCard.author : ''
  const cards =
    Array.isArray(principleCard.cards) && principleCard.cards.length > 0
      ? principleCard.cards.map((card) => normalizePrincipleCardEntry(card, fallbackContent, fallbackAuthor))
      : [normalizePrincipleCardEntry({ content: fallbackContent, author: fallbackAuthor }, fallbackContent, fallbackAuthor)]

  const activeCardId = cards.some((card) => card.id === principleCard.activeCardId) ? principleCard.activeCardId : cards[0].id
  const activeCard = cards.find((card) => card.id === activeCardId) ?? cards[0]

  return {
    ...principleCard,
    cards,
    activeCardId,
    content: activeCard.content,
    author: activeCard.author,
    autoRotate: Boolean(principleCard.autoRotate),
    rotateIntervalSeconds: normalizePrincipleRotationInterval(principleCard.rotateIntervalSeconds),
  }
}

export function normalizePrincipleCards(principleCard: PrincipleCard): PrincipleCardEntry[] {
  return normalizePrincipleCard(principleCard).cards ?? []
}

export function buildPrincipleCardsPayload(cards: PrincipleCardEntry[], activeCardId: string): Partial<PrincipleCard> {
  const activeCard = cards.find((card) => card.id === activeCardId) ?? cards[0]
  return {
    cards,
    activeCardId: activeCard?.id,
    content: activeCard?.content ?? '',
    author: activeCard?.author ?? '',
  }
}

export function getActivePrincipleCard(principleCard: PrincipleCard, now = new Date()): PrincipleCardEntry {
  const normalized = normalizePrincipleCard(principleCard)
  const cards = normalized.cards ?? []
  if (!cards.length) {
    return normalizePrincipleCardEntry({ content: normalized.content, author: normalized.author })
  }

  if (normalized.autoRotate && cards.length > 1) {
    const interval = normalizePrincipleRotationInterval(normalized.rotateIntervalSeconds)
    const index = Math.floor(now.getTime() / (interval * 1000)) % cards.length
    return cards[index]
  }

  return cards.find((card) => card.id === normalized.activeCardId) ?? cards[0]
}
