"use client"

import { cn } from "@/lib/utils"
import { SpanishCard, EmptyCardSlot } from "./spanish-card"
import type { PlayedCard } from "@/lib/types"

interface TrickAreaProps {
  playedCards: PlayedCard[]
  playerCount: number
  currentPlayerId?: string
  winningPlayerId?: string
  className?: string
}

// Position cards in a circle around the center
const getCardPosition = (index: number, total: number, isCurrentPlayer: boolean) => {
  // For the current player, place at bottom. Others arranged around.
  if (isCurrentPlayer) {
    return { x: 0, y: 40, rotation: 0 }
  }

  // Distribute other players around
  const angle = ((index / (total - 1)) * 180 - 90) * (Math.PI / 180)
  const radius = 60
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius - 20,
    rotation: (index - (total - 1) / 2) * 15
  }
}

export function TrickArea({
  playedCards,
  playerCount,
  currentPlayerId,
  winningPlayerId,
  className
}: TrickAreaProps) {
  // Create slots for all players
  const slots = Array.from({ length: playerCount }).map((_, i) => {
    const playedCard = playedCards[i]
    const isCurrentPlayer = playedCard?.playerId === currentPlayerId
    const isWinning = playedCard?.playerId === winningPlayerId
    const position = getCardPosition(i, playerCount, isCurrentPlayer)

    return {
      index: i,
      playedCard,
      position,
      isWinning
    }
  })

  return (
    <div className={cn("relative w-64 h-48 flex items-center justify-center", className)}>
      {/* Background felt texture */}
      <div className="absolute inset-0 rounded-full bg-secondary/30 border border-border/30" />
      
      {/* Played cards */}
      {slots.map(({ index, playedCard, position, isWinning }) => (
        <div
          key={index}
          className="absolute transition-all duration-300"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotation}deg)`,
            zIndex: playedCard ? 10 + index : 0
          }}
        >
          {playedCard ? (
            <div className={cn(isWinning && "ring-2 ring-primary rounded-lg")}>
              <SpanishCard
                card={playedCard.card}
                size="md"
                disabled
              />
            </div>
          ) : (
            <EmptyCardSlot size="md" />
          )}
        </div>
      ))}

      {/* Center indicator */}
      {playedCards.length === 0 && (
        <div className="absolute text-muted-foreground text-sm">
          Mesa
        </div>
      )}
    </div>
  )
}
