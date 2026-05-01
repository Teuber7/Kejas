"use client"

import { cn } from "@/lib/utils"
import { SpanishCard } from "./spanish-card"
import type { Card } from "@/lib/types"

interface PlayerHandProps {
  cards: Card[]
  onPlayCard?: (card: Card) => void
  playableCards?: Card[]
  disabled?: boolean
  className?: string
}

export function PlayerHand({
  cards,
  onPlayCard,
  playableCards = [],
  disabled = false,
  className
}: PlayerHandProps) {
  const isPlayable = (card: Card) => {
    if (playableCards.length === 0) return true
    return playableCards.some(
      c => c.suit === card.suit && c.value === card.value
    )
  }

  return (
    <div className={cn("flex items-end justify-center", className)}>
      <div 
        className="flex items-end"
        style={{
          marginLeft: cards.length > 5 ? `-${(cards.length - 5) * 8}px` : 0
        }}
      >
        {cards.map((card, index) => {
          const playable = isPlayable(card)
          const offset = cards.length > 1 
            ? (index - (cards.length - 1) / 2) * 3 
            : 0

          return (
            <div
              key={`${card.suit}-${card.value}`}
              className="transition-all duration-200"
              style={{
                marginLeft: index > 0 ? (cards.length > 5 ? "-16px" : "-8px") : 0,
                transform: `rotate(${offset}deg)`,
                zIndex: index
              }}
            >
              <SpanishCard
                card={card}
                onClick={() => onPlayCard?.(card)}
                disabled={disabled || !playable}
                highlighted={playable && !disabled && playableCards.length > 0}
                size="lg"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
