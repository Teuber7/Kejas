"use client"

import { cn } from "@/lib/utils"
import { SpanishCard } from "./spanish-card"
import type { Card, Suit } from "@/lib/types"

interface TrumpDisplayProps {
  trumpCard?: Card
  trumpSuit?: Suit
  className?: string
}

const SUIT_NAMES: Record<Suit, string> = {
  oros: "Oros",
  copas: "Copas",
  espadas: "Espadas",
  bastos: "Bastos"
}

const SUIT_COLORS: Record<Suit, string> = {
  oros: "text-suit-oros",
  copas: "text-suit-copas",
  espadas: "text-suit-espadas",
  bastos: "text-suit-bastos"
}

export function TrumpDisplay({ trumpCard, trumpSuit, className }: TrumpDisplayProps) {
  if (!trumpSuit) return null

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        Triunfo
      </span>
      
      {trumpCard ? (
        <SpanishCard card={trumpCard} size="sm" disabled />
      ) : (
        <div className={cn("font-bold text-lg", SUIT_COLORS[trumpSuit])}>
          {SUIT_NAMES[trumpSuit]}
        </div>
      )}
    </div>
  )
}
