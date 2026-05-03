"use client"

import { cn } from "@/lib/utils"
import { PlayerHand } from "./player-hand"
import { TrickArea } from "./trick-area"
import { TrumpDisplay } from "./trump-display"
import { OpponentDisplay } from "./opponent-display"
import { Scoreboard } from "./scoreboard"
import { PredictionSelector } from "./prediction-selector"
import type { Card, PlayedCard, Profile, GameState, Suit } from "@/lib/types"

interface GameTableProps {
  // Current player info
  currentUserId: string
  myHand: Card[]
  
  // Game state
  gameState: GameState
  players: Profile[]
  playerOrder: string[]
  playerCardCounts: Record<string, number>
  
  // Current trick
  currentTrick: PlayedCard[]
  
  // Callbacks
  onPlayCard: (card: Card) => void
  onPredict: (prediction: number) => void
  
  // Playable cards (for highlighting)
  playableCards: Card[]
  
  className?: string
}

export function GameTable({
  currentUserId,
  myHand,
  gameState,
  players,
  playerOrder,
  playerCardCounts,
  currentTrick,
  onPlayCard,
  onPredict,
  playableCards,
  className
}: GameTableProps) {
  const isMyTurn = gameState.current_turn_player_id === currentUserId
  const isPredicting = gameState.current_phase === "predicting"
  const isPlaying = gameState.current_phase === "playing"
  const isTiebreaking = gameState.current_phase === "tiebreaking"
  const canPlay = (isPlaying || isTiebreaking) && isMyTurn
  
  // Get my position in the player order
  const myIndex = playerOrder.indexOf(currentUserId)
  
  // Get other players relative to me
  const otherPlayers = playerOrder
    .filter(id => id !== currentUserId)
    .map(id => players.find(p => p.id === id)!)
    .filter(Boolean)

  // Position opponents around the table
  const getOpponentPosition = (index: number, total: number): "left" | "top" | "right" | "top-left" | "top-right" => {
    if (total === 1) return "top"
    if (total === 2) return index === 0 ? "left" : "right"
    if (total === 3) {
      if (index === 0) return "left"
      if (index === 1) return "top"
      return "right"
    }
    if (total === 4) {
      if (index === 0) return "left"
      if (index === 1) return "top-left"
      if (index === 2) return "top-right"
      return "right"
    }
    if (total === 5) {
      if (index === 0) return "left"
      if (index === 1) return "top-left"
      if (index === 2) return "top"
      if (index === 3) return "top-right"
      return "right"
    }
    // 6 opponents
    if (index === 0) return "left"
    if (index <= 2) return "top-left"
    if (index <= 4) return "top-right"
    return "right"
  }

  // Calculate if I'm the last player to predict
  const predictionCount = Object.keys(gameState.predictions || {}).length
  const amLastToPredict = isPredicting && predictionCount === playerOrder.length - 1

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      {/* Top area - opponents */}
      <div className="flex-none h-32 flex items-start justify-center gap-4 p-4">
        {otherPlayers.map((player, index) => {
          const position = getOpponentPosition(index, otherPlayers.length)
          const isPositionTop = position.includes("top")
          
          if (!isPositionTop && otherPlayers.length > 2) return null
          
          return (
            <OpponentDisplay
              key={player.id}
              player={player}
              cardCount={playerCardCounts[player.id] || 0}
              prediction={gameState.predictions?.[player.id]}
              tricksWon={gameState.tricks_won?.[player.id] || 0}
              isCurrentTurn={gameState.current_turn_player_id === player.id}
              isDealer={gameState.dealer_player_id === player.id}
              position={position}
            />
          )
        })}
      </div>

      {/* Middle area - sides + center */}
      <div className="flex-1 flex items-center justify-between px-4">
        {/* Left side opponents */}
        <div className="flex flex-col gap-2">
          {otherPlayers.map((player, index) => {
            const position = getOpponentPosition(index, otherPlayers.length)
            if (position !== "left") return null
            
            return (
              <OpponentDisplay
                key={player.id}
                player={player}
                cardCount={playerCardCounts[player.id] || 0}
                prediction={gameState.predictions?.[player.id]}
                tricksWon={gameState.tricks_won?.[player.id] || 0}
                isCurrentTurn={gameState.current_turn_player_id === player.id}
                isDealer={gameState.dealer_player_id === player.id}
                position="left"
              />
            )
          })}
        </div>

        {/* Center - trick area or prediction */}
        <div className="flex flex-col items-center gap-4">
          {isPredicting && isMyTurn ? (
            <PredictionSelector
              cardsInHand={gameState.cards_per_round}
              currentPredictions={gameState.predictions || {}}
              playerOrder={playerOrder}
              currentPlayerId={currentUserId}
              isLastPlayer={amLastToPredict}
              onPredict={onPredict}
            />
          ) : (
            <TrickArea
              playedCards={currentTrick}
              playerCount={playerOrder.length}
              currentPlayerId={currentUserId}
              players={players}
            />
          )}
          
          {/* Trump display */}
          <TrumpDisplay
            trumpCard={gameState.trump_card as Card | undefined}
            trumpSuit={gameState.trump_suit as Suit | undefined}
          />
        </div>

        {/* Right side opponents */}
        <div className="flex flex-col gap-2">
          {otherPlayers.map((player, index) => {
            const position = getOpponentPosition(index, otherPlayers.length)
            if (position !== "right") return null
            
            return (
              <OpponentDisplay
                key={player.id}
                player={player}
                cardCount={playerCardCounts[player.id] || 0}
                prediction={gameState.predictions?.[player.id]}
                tricksWon={gameState.tricks_won?.[player.id] || 0}
                isCurrentTurn={gameState.current_turn_player_id === player.id}
                isDealer={gameState.dealer_player_id === player.id}
                position="right"
              />
            )
          })}
        </div>
      </div>

      {/* Bottom area - my hand */}
      <div className="flex-none h-40 flex items-end justify-center p-4">
        <PlayerHand
          cards={myHand}
          onPlayCard={onPlayCard}
          playableCards={canPlay ? playableCards : []}
          disabled={!canPlay}
        />
      </div>

      {/* Scoreboard - fixed position */}
      <div className="absolute top-4 right-4 w-48">
        <Scoreboard
          players={players}
          scores={gameState.total_scores || {}}
          predictions={gameState.predictions || {}}
          tricksWon={gameState.tricks_won || {}}
          currentRound={gameState.current_round}
          currentTurnPlayerId={gameState.current_turn_player_id || undefined}
          dealerPlayerId={gameState.dealer_player_id || undefined}
        />
      </div>

      {/* Trick complete - showing cards before resolving */}
      {!gameState.current_turn_player_id && currentTrick.length > 0 && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2">
          <div className="px-4 py-2 bg-muted text-muted-foreground rounded-full text-sm font-medium">
            Mostrando truco...
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {isMyTurn && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2">
          <div className={`px-4 py-2 text-primary-foreground rounded-full text-sm font-medium animate-pulse ${isTiebreaking ? "bg-orange-500" : "bg-primary"}`}>
            {isPredicting ? "Haz tu pronóstico" : isTiebreaking ? "¡Desempate! Juega una carta" : "Tu turno - Juega una carta"}
          </div>
        </div>
      )}
      {isTiebreaking && !isMyTurn && gameState.current_turn_player_id && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2">
          <div className="px-4 py-2 bg-orange-500/70 text-white rounded-full text-sm font-medium">
            ¡Desempate en curso!
          </div>
        </div>
      )}
    </div>
  )
}
