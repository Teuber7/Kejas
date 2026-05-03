"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { GameTable } from "@/components/game/game-table"
import { ArrowLeft, RotateCcw } from "lucide-react"
import {
  createDeck,
  shuffleDeck,
  dealCards,
  getCardsForRound,
  getPlayableCards,
  determineTrickWinner,
  findTiedPlayers,
  calculateRoundScores
} from "@/lib/game-utils"
import type { Room, RoomPlayer, Profile, GameState, Card, PlayedCard, Suit } from "@/lib/types"
import type { User, RealtimeChannel } from "@supabase/supabase-js"

interface PlayerWithProfile extends RoomPlayer {
  profiles: Profile
}

export default function GamePage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<PlayerWithProfile[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myHand, setMyHand] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const initializedRef = useRef(false)
  const dealtForRoundRef = useRef(0)
  const finishedHandledRef = useRef(false)
  const trickResolveKeyRef = useRef<string>("")

  const fetchGameData = useCallback(async () => {
    // Fetch room
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single()

    if (roomError || !roomData) {
      setError("Sala no encontrada")
      setLoading(false)
      return
    }

    if (roomData.status === "waiting") {
      router.push(`/sala/${roomData.code}`)
      return
    }

    setRoom(roomData)

    // Fetch players
    const { data: playersData } = await supabase
      .from("room_players")
      .select("*, profiles(*)")
      .eq("room_id", roomData.id)
      .order("seat_position")

    if (playersData) {
      setPlayers(playersData as PlayerWithProfile[])
    }

    // Fetch game state
    const { data: gameStateData } = await supabase
      .from("game_state")
      .select("*")
      .eq("room_id", roomData.id)
      .single()

    if (gameStateData) {
      setGameState(gameStateData)
    }

    // Fetch my hand (RLS filtra automáticamente por auth.uid())
    if (gameStateData) {
      const { data: handData } = await supabase
        .from("player_hands")
        .select("cards")
        .eq("game_state_id", gameStateData.id)
        .maybeSingle()

      if (handData) {
        setMyHand(handData.cards as Card[])
      }
    }

    setLoading(false)
  }, [code, router, supabase])

  // Initialize user and game data
  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)
      await fetchGameData()
    }
    init()
  }, [fetchGameData, router, supabase.auth])

  // Initialize game if host and no game state exists
  useEffect(() => {
    const initializeGame = async () => {
      if (initializedRef.current || !user || !room || !players.length || loading) return
      if (room.host_id !== user.id) return

      // Check if game state already exists
      const { data: existingState } = await supabase
        .from("game_state")
        .select("id")
        .eq("room_id", room.id)
        .single()

      if (existingState) {
        initializedRef.current = true
        return
      }

      initializedRef.current = true

      // Create initial game state
      const playerIds = players.map(p => p.player_id)
      const dealerIndex = 0
      const dealerId = playerIds[dealerIndex]
      const firstPlayerId = playerIds[(dealerIndex + 1) % playerIds.length]
      
      // Create deck and deal cards
      const deck = shuffleDeck(createDeck())
      const cardsPerRound = getCardsForRound(1)
      const { hands, trumpCard } = dealCards(deck, playerIds, cardsPerRound)

      // Create game state
      const { data: newGameState, error: gameError } = await supabase
        .from("game_state")
        .insert({
          room_id: room.id,
          current_round: 1,
          cards_per_round: cardsPerRound,
          trump_suit: trumpCard?.suit,
          trump_card: trumpCard,
          current_phase: "predicting",
          current_turn_player_id: firstPlayerId,
          dealer_player_id: dealerId,
          lead_suit: null,
          current_trick: [],
          tricks_played: 0,
          round_scores: {},
          total_scores: Object.fromEntries(playerIds.map(id => [id, 0])),
          predictions: {},
          tricks_won: Object.fromEntries(playerIds.map(id => [id, 0]))
        })
        .select()
        .single()

      if (gameError) {
        console.error("Error creating game state:", gameError)
        return
      }

      // Create player hands
      for (const playerId of playerIds) {
        await supabase
          .from("player_hands")
          .insert({
            game_state_id: newGameState.id,
            player_id: playerId,
            cards: hands[playerId]
          })
      }

      // Broadcast game started
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game_update",
          payload: { type: "game_started" }
        })
      }

      await fetchGameData()
    }

    initializeGame()
  }, [user, room, players, loading, supabase, fetchGameData])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!room || !user) return

    const channel = supabase
      .channel(`game-${room.id}`)
      .on("broadcast", { event: "game_update" }, () => {
        fetchGameData()
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `room_id=eq.${room.id}`
        },
        () => {
          fetchGameData()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room, user, fetchGameData, supabase])

  // Polling cada 3s como fallback al realtime
  useEffect(() => {
    if (!room || !user) return
    const interval = setInterval(fetchGameData, 3000)
    return () => clearInterval(interval)
  }, [room, user, fetchGameData])

  // Host-only: resolve a completed trick after 1.5s (so all players can see the cards)
  useEffect(() => {
    if (!gameState || !user || !room || loading) return
    if (user.id !== room.host_id) return
    if (gameState.current_turn_player_id !== null) return

    const currentTrick = (gameState.current_trick || []) as PlayedCard[]
    const playerIds = players.map(p => p.player_id)

    const isCompleteTrick =
      gameState.current_phase === "playing" && currentTrick.length === playerIds.length
    const isCompleteTiebreak =
      gameState.current_phase === "tiebreaking" &&
      currentTrick.length > 0 &&
      currentTrick.length === ((gameState.tiebreak_players as string[]) || []).length

    if (!isCompleteTrick && !isCompleteTiebreak) return

    const trickKey = currentTrick.map(p => p.card.id).join(",")

    const timer = setTimeout(async () => {
      if (trickResolveKeyRef.current === trickKey) return
      trickResolveKeyRef.current = trickKey

      const leadSuit = gameState.lead_suit as Suit

      if (isCompleteTiebreak) {
        const stillTied = findTiedPlayers(currentTrick, gameState.trump_suit as Suit | null)

        if (stillTied) {
          const newTiedInOrder = playerIds.filter(id => stillTied.includes(id))
          await supabase.from("game_state").update({
            current_trick: [],
            tiebreak_players: newTiedInOrder,
            current_turn_player_id: newTiedInOrder[0],
            lead_suit: null
          }).eq("id", gameState.id)
        } else {
          const winnerId = determineTrickWinner(currentTrick, gameState.trump_suit as Suit, leadSuit)
          const newTricksWon = { ...gameState.tricks_won }
          newTricksWon[winnerId] = (newTricksWon[winnerId] || 0) + 1
          const tricksPlayed = gameState.tricks_played + 1
          const roundComplete = tricksPlayed === gameState.cards_per_round

          if (roundComplete) {
            const roundScores = calculateRoundScores(gameState.predictions || {}, newTricksWon)
            const newTotalScores = { ...gameState.total_scores }
            for (const [pid, score] of Object.entries(roundScores)) {
              newTotalScores[pid] = (newTotalScores[pid] || 0) + score
            }
            const gameFinished = gameState.current_round + 1 > 14
            await supabase.from("game_state").update({
              current_phase: gameFinished ? "finished" : "scoring",
              current_trick: [],
              tiebreak_players: null,
              tricks_played: tricksPlayed,
              tricks_won: newTricksWon,
              round_scores: roundScores,
              total_scores: newTotalScores
            }).eq("id", gameState.id)
          } else {
            await supabase.from("game_state").update({
              current_phase: "playing",
              current_trick: [],
              tiebreak_players: null,
              tricks_played: tricksPlayed,
              tricks_won: newTricksWon,
              current_turn_player_id: winnerId,
              lead_suit: null
            }).eq("id", gameState.id)
          }
        }
      } else {
        // Normal completed trick
        const tiedPlayers = findTiedPlayers(currentTrick, gameState.trump_suit as Suit | null)

        if (tiedPlayers) {
          const tiedInOrder = playerIds.filter(id => tiedPlayers.includes(id))
          await supabase.from("game_state").update({
            current_phase: "tiebreaking",
            current_trick: [],
            tiebreak_players: tiedInOrder,
            current_turn_player_id: tiedInOrder[0],
            lead_suit: null
          }).eq("id", gameState.id)
        } else {
          const winnerId = determineTrickWinner(currentTrick, gameState.trump_suit as Suit, leadSuit)
          const newTricksWon = { ...gameState.tricks_won }
          newTricksWon[winnerId] = (newTricksWon[winnerId] || 0) + 1
          const tricksPlayed = gameState.tricks_played + 1
          const roundComplete = tricksPlayed === gameState.cards_per_round

          if (roundComplete) {
            const roundScores = calculateRoundScores(gameState.predictions || {}, newTricksWon)
            const newTotalScores = { ...gameState.total_scores }
            for (const [pid, score] of Object.entries(roundScores)) {
              newTotalScores[pid] = (newTotalScores[pid] || 0) + score
            }
            const gameFinished = gameState.current_round + 1 > 14
            await supabase.from("game_state").update({
              current_trick: [],
              tricks_played: tricksPlayed,
              tricks_won: newTricksWon,
              round_scores: roundScores,
              total_scores: newTotalScores,
              current_phase: gameFinished ? "finished" : "scoring"
            }).eq("id", gameState.id)
          } else {
            await supabase.from("game_state").update({
              current_trick: [],
              tricks_played: tricksPlayed,
              tricks_won: newTricksWon,
              current_turn_player_id: winnerId,
              lead_suit: null
            }).eq("id", gameState.id)
          }
        }
      }

      channelRef.current?.send({
        type: "broadcast",
        event: "game_update",
        payload: { type: "trick_resolved" }
      })

      await fetchGameData()
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState, players, user, room, loading, fetchGameData, supabase])

  // Host-only: deal new cards when any player ends a round (phase = "scoring")
  useEffect(() => {
    if (!gameState || !user || !room || loading) return
    if (gameState.current_phase !== "scoring") return
    if (user.id !== room.host_id) return
    if (dealtForRoundRef.current === gameState.current_round) return

    dealtForRoundRef.current = gameState.current_round

    const startNextRound = async () => {
      const playerIds = players.map(p => p.player_id)
      const nextRound = gameState.current_round + 1
      const newDealerIndex = (playerIds.indexOf(gameState.dealer_player_id!) + 1) % playerIds.length
      const newDealerId = playerIds[newDealerIndex]
      const firstPlayerId = playerIds[(newDealerIndex + 1) % playerIds.length]

      const deck = shuffleDeck(createDeck())
      const cardsPerRound = getCardsForRound(nextRound)
      const { hands, trumpCard } = dealCards(deck, playerIds, cardsPerRound)

      // Deal cards via RPC (SECURITY DEFINER bypasses RLS for player_hands UPDATE)
      const handsJson: Record<string, Card[]> = {}
      for (const playerId of playerIds) {
        handsJson[playerId] = hands[playerId]
      }
      const { error: dealError } = await supabase.rpc("deal_new_round", {
        p_game_state_id: gameState.id,
        p_player_hands: handsJson
      })
      if (dealError) {
        console.error("Error dealing cards:", dealError)
        dealtForRoundRef.current = 0
        return
      }

      await supabase
        .from("game_state")
        .update({
          current_round: nextRound,
          cards_per_round: cardsPerRound,
          trump_suit: trumpCard?.suit,
          trump_card: trumpCard,
          current_phase: "predicting",
          current_turn_player_id: firstPlayerId,
          dealer_player_id: newDealerId,
          lead_suit: null,
          current_trick: [],
          tricks_played: 0,
          predictions: {},
          tricks_won: Object.fromEntries(playerIds.map(id => [id, 0]))
        })
        .eq("id", gameState.id)

      channelRef.current?.send({
        type: "broadcast",
        event: "game_update",
        payload: { type: "round_started" }
      })

      await fetchGameData()
    }

    startNextRound()
  }, [gameState, players, user, room, loading, fetchGameData, supabase])

  // Host-only: finalize game (update room + save history) when phase = "finished"
  useEffect(() => {
    if (!gameState || !user || !room || loading) return
    if (gameState.current_phase !== "finished") return
    if (user.id !== room.host_id) return
    if (finishedHandledRef.current) return

    finishedHandledRef.current = true

    const finalizeGame = async () => {
      const playerIds = players.map(p => p.player_id)
      const winner = Object.entries(gameState.total_scores || {}).sort((a, b) => b[1] - a[1])[0]

      await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id)
      await supabase.from("game_history").insert({
        room_id: room.id,
        room_name: room.name,
        winner_id: winner[0],
        final_scores: gameState.total_scores,
        player_ids: playerIds,
        rounds_played: 14
      })
    }

    finalizeGame()
  }, [gameState, players, user, room, loading, supabase])

  const handlePredict = async (prediction: number) => {
    if (!gameState || !user || gameState.current_turn_player_id !== user.id) return

    const playerIds = players.map(p => p.player_id)
    const currentIndex = playerIds.indexOf(user.id)
    const nextIndex = (currentIndex + 1) % playerIds.length
    const nextPlayerId = playerIds[nextIndex]

    const newPredictions = { ...gameState.predictions, [user.id]: prediction }
    const allPredicted = Object.keys(newPredictions).length === playerIds.length

    // Update game state
    await supabase
      .from("game_state")
      .update({
        predictions: newPredictions,
        current_phase: allPredicted ? "playing" : "predicting",
        current_turn_player_id: allPredicted 
          ? playerIds[(playerIds.indexOf(gameState.dealer_player_id!) + 1) % playerIds.length]
          : nextPlayerId
      })
      .eq("id", gameState.id)

    // Broadcast update
    channelRef.current?.send({
      type: "broadcast",
      event: "game_update",
      payload: { type: "prediction_made" }
    })

    await fetchGameData()
  }

  const handlePlayCard = async (card: Card) => {
    if (!gameState || !user || gameState.current_turn_player_id !== user.id) return
    if (gameState.current_phase !== "playing" && gameState.current_phase !== "tiebreaking") return

    const playerIds = players.map(p => p.player_id)

    // Remove card from hand
    const newHand = myHand.filter(c => !(c.suit === card.suit && c.value === card.value))
    setMyHand(newHand)
    await supabase
      .from("player_hands")
      .update({ cards: newHand })
      .eq("game_state_id", gameState.id)
      .eq("player_id", user.id)

    if (gameState.current_phase === "tiebreaking") {
      const tiedPlayers = (gameState.tiebreak_players || []) as string[]
      const trickSoFar = (gameState.current_trick || []) as PlayedCard[]
      const newTrick: PlayedCard[] = [...trickSoFar, { playerId: user.id, card }]
      const leadSuit = trickSoFar.length === 0 ? card.suit : gameState.lead_suit

      if (newTrick.length === tiedPlayers.length) {
        // All tied players played — show trick, host resolves after delay
        await supabase.from("game_state").update({
          current_trick: newTrick,
          lead_suit: leadSuit,
          current_turn_player_id: null
        }).eq("id", gameState.id)
      } else {
        // Next tied player's turn
        const nextTiedPlayer = tiedPlayers[tiedPlayers.indexOf(user.id) + 1]
        await supabase.from("game_state").update({
          current_trick: newTrick,
          lead_suit: leadSuit,
          current_turn_player_id: nextTiedPlayer
        }).eq("id", gameState.id)
      }

    } else {
      // Normal playing phase
      const currentTrick = (gameState.current_trick || []) as PlayedCard[]
      const newTrick: PlayedCard[] = [...currentTrick, { playerId: user.id, card }]
      const leadSuit = currentTrick.length === 0 ? card.suit : gameState.lead_suit
      const trickComplete = newTrick.length === playerIds.length

      if (trickComplete) {
        // Show complete trick to all players, host resolves after delay
        await supabase.from("game_state").update({
          current_trick: newTrick,
          lead_suit: leadSuit,
          current_turn_player_id: null
        }).eq("id", gameState.id)
      } else {
        // Trick still in progress
        const nextPlayerId = playerIds[(playerIds.indexOf(user.id) + 1) % playerIds.length]
        await supabase.from("game_state").update({
          current_trick: newTrick,
          lead_suit: leadSuit,
          current_turn_player_id: nextPlayerId
        }).eq("id", gameState.id)
      }
    }

    channelRef.current?.send({
      type: "broadcast",
      event: "game_update",
      payload: { type: "card_played" }
    })

    await fetchGameData()
  }

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground">Cargando partida...</p>
        </div>
      </main>
    )
  }

  if (error || !room || !gameState) {
    return (
      <main className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Error al cargar la partida"}</p>
        <Button onClick={() => router.push("/")}>Volver al Inicio</Button>
      </main>
    )
  }

  // Game finished screen
  if (gameState.current_phase === "finished") {
    const sortedScores = Object.entries(gameState.total_scores || {})
      .map(([id, score]) => ({
        player: players.find(p => p.player_id === id)?.profiles,
        score
      }))
      .sort((a, b) => b.score - a.score)

    return (
      <main className="h-screen flex flex-col items-center justify-center gap-8 p-4">
        <h1 className="text-4xl font-bold text-primary">Partida Terminada</h1>
        
        <div className="flex flex-col gap-4 w-full max-w-md">
          {sortedScores.map(({ player, score }, index) => (
            <div
              key={player?.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                index === 0 ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{index + 1}</span>
                <span className="font-medium">{player?.display_name}</span>
              </div>
              <span className="text-2xl font-bold">{score} pts</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Button>
          <Button onClick={() => router.push(`/sala/crear`)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Nueva Partida
          </Button>
        </div>
      </main>
    )
  }

  const playerOrder = players.map(p => p.player_id)
  const playerCardCounts: Record<string, number> = {}
  
  // We only know our own hand count exactly, estimate others based on round
  for (const playerId of playerOrder) {
    if (playerId === user?.id) {
      playerCardCounts[playerId] = myHand.length
    } else {
      // Estimate based on tricks played
      const tricksPlayed = gameState.tricks_played || 0
      playerCardCounts[playerId] = gameState.cards_per_round - tricksPlayed
    }
  }

  const playableCards = getPlayableCards(
    myHand,
    gameState.lead_suit as Suit | null,
    gameState.trump_suit as Suit
  )

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none flex items-center justify-between p-2 border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{room.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Ronda {gameState.current_round}/14 - {gameState.cards_per_round} cartas
        </span>
      </header>

      {/* Game Table */}
      <div className="flex-1 overflow-hidden">
        <GameTable
          currentUserId={user!.id}
          myHand={myHand}
          gameState={gameState}
          players={players.map(p => p.profiles)}
          playerOrder={playerOrder}
          playerCardCounts={playerCardCounts}
          currentTrick={(gameState.current_trick || []) as PlayedCard[]}
          onPlayCard={handlePlayCard}
          onPredict={handlePredict}
          playableCards={playableCards}
        />
      </div>
    </main>
  )
}
