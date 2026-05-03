"use client"

import { cn } from "@/lib/utils"
import { SpanishCard } from "./spanish-card"
import type { PlayedCard, Profile } from "@/lib/types"

interface TrickAreaProps {
  playedCards: PlayedCard[]
  playerCount: number
  currentPlayerId?: string
  players?: Profile[]
  className?: string
}

export function TrickArea({
  playedCards,
  playerCount,
  currentPlayerId,
  players,
  className
}: TrickAreaProps) {
  if (playedCards.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-xl",
        "bg-secondary/30 border border-border/30",
        "w-56 h-28",
        className
      )}>
        <span className="text-muted-foreground text-sm">Mesa</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-3 p-3",
      "rounded-xl bg-secondary/30 border border-border/30",
      "min-h-[112px]",
      className
    )}>
      {playedCards.map(({ playerId, card }) => {
        const isMe = playerId === currentPlayerId
        const playerName = players?.find(p => p.id === playerId)?.display_name
        const label = isMe ? "Tú" : playerName ?? null

        return (
          <div key={`${playerId}-${card.id}`} className="flex flex-col items-center gap-0.5">
            <SpanishCard card={card} size="sm" disabled />
            {label && (
              <span className="text-[0.6rem] text-muted-foreground leading-none truncate max-w-[48px] text-center">
                {label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
