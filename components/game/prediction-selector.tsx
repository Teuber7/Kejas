"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PredictionSelectorProps {
  cardsInHand: number
  currentPredictions: Record<string, number>
  playerOrder: string[]
  currentPlayerId: string
  isLastPlayer: boolean
  onPredict: (prediction: number) => void
  disabled?: boolean
  className?: string
}

export function PredictionSelector({
  cardsInHand,
  currentPredictions,
  playerOrder,
  currentPlayerId,
  isLastPlayer,
  onPredict,
  disabled = false,
  className
}: PredictionSelectorProps) {
  // Calculate sum of existing predictions
  const totalPredictions = Object.values(currentPredictions).reduce((a, b) => a + b, 0)
  
  // For last player, they cannot choose a number that makes total equal to cards
  const forbiddenNumber = isLastPlayer ? cardsInHand - totalPredictions : -1

  const options = Array.from({ length: cardsInHand + 1 }, (_, i) => i)

  return (
    <Card className={cn("border-border/50 bg-card/90 backdrop-blur", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tu Pronóstico</CardTitle>
        <CardDescription>
          {isLastPlayer
            ? `No puedes elegir ${forbiddenNumber} (total no puede ser ${cardsInHand})`
            : `¿Cuántas bazas crees que ganarás?`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-center">
          {options.map((num) => {
            const isForbidden = num === forbiddenNumber
            return (
              <Button
                key={num}
                variant={isForbidden ? "destructive" : "secondary"}
                size="lg"
                onClick={() => onPredict(num)}
                disabled={disabled || isForbidden}
                className={cn(
                  "w-12 h-12 text-lg font-bold",
                  isForbidden && "opacity-50 cursor-not-allowed"
                )}
              >
                {num}
              </Button>
            )
          })}
        </div>
        
        {/* Show current predictions */}
        {Object.keys(currentPredictions).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Pronósticos realizados:</p>
            <div className="flex gap-2 flex-wrap">
              {playerOrder.map((playerId) => {
                const prediction = currentPredictions[playerId]
                if (prediction === undefined) return null
                return (
                  <span
                    key={playerId}
                    className="px-2 py-1 bg-secondary rounded text-sm"
                  >
                    {prediction}
                  </span>
                )
              })}
              <span className="text-sm text-muted-foreground">
                = {totalPredictions} / {cardsInHand}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
