"use client"

import { cn } from "@/lib/utils"
import { CardBack } from "./spanish-card"
import { Badge } from "@/components/ui/badge"
import { Crown, Target } from "lucide-react"
import type { Profile } from "@/lib/types"

interface OpponentDisplayProps {
  player: Profile
  cardCount: number
  prediction?: number
  tricksWon: number
  isCurrentTurn: boolean
  isDealer: boolean
  position: "left" | "top" | "right" | "top-left" | "top-right"
  className?: string
}

const POSITION_CLASSES: Record<string, string> = {
  left: "flex-row",
  right: "flex-row-reverse",
  top: "flex-col",
  "top-left": "flex-col",
  "top-right": "flex-col"
}

export function OpponentDisplay({
  player,
  cardCount,
  prediction,
  tricksWon,
  isCurrentTurn,
  isDealer,
  position,
  className
}: OpponentDisplayProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        "bg-card/50 backdrop-blur border border-border/30",
        isCurrentTurn && "ring-2 ring-primary bg-primary/10",
        POSITION_CLASSES[position],
        className
      )}
    >
      {/* Player info */}
      <div className={cn(
        "flex flex-col gap-1",
        position === "right" && "items-end",
        (position === "top" || position === "top-left" || position === "top-right") && "items-center"
      )}>
        <div className="flex items-center gap-2">
          {isDealer && <Crown className="h-3 w-3 text-primary" />}
          <span className="font-medium text-sm truncate max-w-20">
            {player.display_name}
          </span>
        </div>
        
        {prediction !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>{tricksWon}/{prediction}</span>
          </div>
        )}
      </div>

      {/* Cards in hand */}
      <div className="flex items-center">
        {cardCount > 0 ? (
          <div className="flex" style={{ marginLeft: 0 }}>
            {Array.from({ length: Math.min(cardCount, 4) }).map((_, i) => (
              <div
                key={i}
                style={{ marginLeft: i > 0 ? "-12px" : 0 }}
              >
                <CardBack size="sm" />
              </div>
            ))}
            {cardCount > 4 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                +{cardCount - 4}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin cartas</span>
        )}
      </div>
    </div>
  )
}
