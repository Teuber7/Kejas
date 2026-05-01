"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Target } from "lucide-react"
import type { Profile } from "@/lib/types"

interface ScoreboardProps {
  players: Profile[]
  scores: Record<string, number>
  predictions: Record<string, number>
  tricksWon: Record<string, number>
  currentRound: number
  currentTurnPlayerId?: string
  dealerPlayerId?: string
  className?: string
}

export function Scoreboard({
  players,
  scores,
  predictions,
  tricksWon,
  currentRound,
  currentTurnPlayerId,
  dealerPlayerId,
  className
}: ScoreboardProps) {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => 
    (scores[b.id] || 0) - (scores[a.id] || 0)
  )

  return (
    <Card className={cn("border-border/50 bg-card/80 backdrop-blur", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Marcador</span>
          <Badge variant="outline">Ronda {currentRound}/14</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {sortedPlayers.map((player, index) => {
            const score = scores[player.id] || 0
            const prediction = predictions[player.id]
            const tricks = tricksWon[player.id] || 0
            const isCurrentTurn = player.id === currentTurnPlayerId
            const isDealer = player.id === dealerPlayerId
            const isLeader = index === 0 && score > 0

            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2",
                  isCurrentTurn && "bg-primary/10"
                )}
              >
                <div className="flex items-center gap-2">
                  {isLeader && <Crown className="h-3 w-3 text-primary" />}
                  <span className={cn(
                    "text-sm font-medium truncate max-w-24",
                    isCurrentTurn && "text-primary"
                  )}>
                    {player.display_name}
                  </span>
                  {isDealer && (
                    <Badge variant="secondary" className="text-[10px] px-1">D</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Prediction & Tricks */}
                  {prediction !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className={cn(
                        tricks === prediction && prediction > 0 && "text-green-500",
                        tricks > prediction && "text-destructive"
                      )}>
                        {tricks}/{prediction}
                      </span>
                    </div>
                  )}

                  {/* Score */}
                  <span className="font-bold text-sm w-8 text-right">
                    {score}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
