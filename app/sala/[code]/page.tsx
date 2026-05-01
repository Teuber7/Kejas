"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Check, Crown, Users, Play } from "lucide-react"
import type { Room, RoomPlayer, Profile } from "@/lib/types"
import type { User } from "@supabase/supabase-js"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface PlayerWithProfile extends RoomPlayer {
  profiles: Profile
}

export default function RoomLobbyPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<PlayerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const joiningRef = useRef(false)

  const fetchRoomData = useCallback(async () => {
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

    // If room is in playing state, redirect to game
    if (roomData.status === "playing") {
      router.push(`/juego/${roomData.code}`)
      return
    }

    setRoom(roomData)

    const { data: playersData } = await supabase
      .from("room_players")
      .select("*, profiles(*)")
      .eq("room_id", roomData.id)
      .order("seat_position")

    if (playersData) {
      setPlayers(playersData as PlayerWithProfile[])
    }

    setLoading(false)
  }, [code, router, supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)
      await fetchRoomData()
    }
    init()
  }, [fetchRoomData, router, supabase.auth])

  // Join room if not already joined
  useEffect(() => {
    const joinRoom = async () => {
      if (!user || !room || loading) return
      if (joiningRef.current) return

      const isInRoom = players.some(p => p.player_id === user.id)
      if (isInRoom) return

      if (players.length >= room.max_players) {
        setError("La sala está llena")
        return
      }

      joiningRef.current = true

      // Find next available seat
      const takenSeats = players.map(p => p.seat_position)
      let nextSeat = 0
      while (takenSeats.includes(nextSeat)) {
        nextSeat++
      }

      const { error: joinError } = await supabase
        .from("room_players")
        .upsert(
          {
            room_id: room.id,
            player_id: user.id,
            seat_position: nextSeat,
            is_ready: false
          },
          { onConflict: "room_id,player_id", ignoreDuplicates: true }
        )

      joiningRef.current = false

      if (joinError) {
        // 23503 = foreign key violation (perfil no existe aún), reintentar
        if (joinError.code === "23503") {
          joiningRef.current = false
          setTimeout(() => fetchRoomData(), 1000)
          return
        }
        console.error("Error joining room:", joinError.code, joinError.message)
        setError(`Error al unirse: ${joinError.message} (código: ${joinError.code})`)
        return
      }

      await fetchRoomData()
    }
    joinRoom()
  }, [user, room, players, loading, fetchRoomData, supabase])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!room) return

    let channel: RealtimeChannel

    const setupSubscription = async () => {
      channel = supabase
        .channel(`room-${room.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_players",
            filter: `room_id=eq.${room.id}`
          },
          () => {
            fetchRoomData()
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${room.id}`
          },
          (payload) => {
            const updatedRoom = payload.new as Room
            if (updatedRoom.status === "playing") {
              router.push(`/juego/${room.code}`)
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [room, fetchRoomData, router, supabase])

  // Polling fallback cada 3 segundos por si el realtime no funciona
  useEffect(() => {
    if (!room) return
    const interval = setInterval(fetchRoomData, 3000)
    return () => clearInterval(interval)
  }, [room, fetchRoomData])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code.toUpperCase())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleReady = async () => {
    if (!user || !room) return

    const currentPlayer = players.find(p => p.player_id === user.id)
    if (!currentPlayer) return

    await supabase
      .from("room_players")
      .update({ is_ready: !currentPlayer.is_ready })
      .eq("id", currentPlayer.id)

    await fetchRoomData()
  }

  const handleLeaveRoom = async () => {
    if (!user || !room) return

    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", room.id)
      .eq("player_id", user.id)

    // If host leaves, delete the room
    if (room.host_id === user.id) {
      await supabase.from("rooms").delete().eq("id", room.id)
    }

    router.push("/")
  }

  const handleStartGame = async () => {
    if (!room || !user || room.host_id !== user.id) return

    setStarting(true)

    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({ status: "playing" })
      .eq("id", room.id)
      .select()
      .single()

    if (updateError || !updatedRoom) {
      console.error("Error starting game:", updateError)
      setError(`No se pudo iniciar la partida: ${updateError?.message ?? "sin filas actualizadas"}`)
      setStarting(false)
      return
    }

    router.push(`/juego/${room.code}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  if (error || !room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Sala no encontrada"}</p>
        <Button onClick={() => router.push("/")}>Volver al Inicio</Button>
      </main>
    )
  }

  const isHost = user?.id === room.host_id
  const currentPlayer = players.find(p => p.player_id === user?.id)
  const allReady = players.length >= 2 && players.every(p => p.is_ready)
  const canStart = isHost && allReady

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Salir
          </Button>
          <h1 className="text-xl font-bold">{room.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="font-mono"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {code.toUpperCase()}
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Sala de Espera
            </CardTitle>
            <CardDescription>
              {players.length} / {room.max_players} jugadores
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Players List */}
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    {player.player_id === room.host_id && (
                      <Crown className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium">
                      {player.profiles.display_name}
                    </span>
                    {player.player_id === user?.id && (
                      <Badge variant="outline" className="text-xs">Tú</Badge>
                    )}
                  </div>
                  <Badge variant={player.is_ready ? "default" : "secondary"}>
                    {player.is_ready ? "Listo" : "Esperando"}
                  </Badge>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: room.max_players - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center p-3 rounded-lg border border-dashed border-border/50 text-muted-foreground"
                >
                  Esperando jugador...
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {currentPlayer && (
                <Button
                  onClick={handleToggleReady}
                  variant={currentPlayer.is_ready ? "secondary" : "default"}
                  size="lg"
                >
                  {currentPlayer.is_ready ? "Cancelar Listo" : "Estoy Listo"}
                </Button>
              )}

              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart || starting}
                  size="lg"
                  className="gap-2"
                >
                  {starting ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {canStart ? "Iniciar Partida" : `Esperando jugadores (${players.filter(p => p.is_ready).length}/${players.length})`}
                </Button>
              )}

              {isHost && !canStart && players.length < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  Se necesitan al menos 2 jugadores para comenzar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
