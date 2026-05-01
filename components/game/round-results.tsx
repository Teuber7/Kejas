"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, ArrowRight } from "lucide-react"
import type { Profile } from "@/lib/types"

interface RoundResultsProps {
  players: Profile[]
  predictions: Record<string, number>
  tricksWon: Record<string, number>
  roundScores: Record<string, number>
  totalScores: Record<string, number>
  currentRound: number
  onContinue: () => void
  className?: string
}

export function RoundResults({
  players,
  predictions,
  tricksWon,
  roundScores,
  totalScores,
  currentRound,
  onContinue,
  className
}: RoundResultsProps) {
  const sortedPlayers = [...players].sort((a, b) => 
    (totalScores[b.id] || 0) - (totalScores[a.id] || 0)
  )

  return (
    <Card className={cn("border-border/50 bg-card/90 backdrop-blur max-w-md w-full", className)}>
      <CardHeader>
        <CardTitle className="text-center">
          Resultados Ronda {currentRound}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="divide-y divide-border/50">
          {sortedPlayers.map((player) => {
            const prediction = predictions[player.id] || 0
            const tricks = tricksWon[player.id] || 0
            const roundScore = roundScores[player.id] || 0
            const totalScore = totalScores[player.id] || 0
            const correct = prediction === tricks

            return (
              <div key={player.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    correct ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                  )}>
                    {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{player.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tricks}/{prediction} bazas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={roundScore > 0 ? "default" : "secondary"}>
                    +{roundScore}
                  </Badge>
                  <p className="text-sm font-bold mt-1">{totalScore} pts</p>
                </div>
              </div>
            )
          })}
        </div>

        <Button onClick={onContinue} className="w-full">
          {currentRound < 14 ? (
            <>
              Siguiente Ronda
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            "Ver Resultados Finales"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
