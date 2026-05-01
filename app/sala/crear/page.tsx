"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { generateRoomCode } from "@/lib/game-utils"

export default function CreateRoomPage() {
  const [creating, setCreating] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [maxPlayers, setMaxPlayers] = useState("4")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/"); return }
      setUser(user)
    }
    getUser()
  }, [router, supabase])

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setError("Ingresa un nombre para la sala")
      return
    }

    setCreating(true)
    setError("")

    const code = generateRoomCode()
    
    try {
      const { error: roomError } = await supabase
        .from("rooms")
        .insert({
          code,
          name: roomName.trim(),
          max_players: parseInt(maxPlayers),
          host_id: user.id,
          status: 'waiting'
        })

      if (roomError) throw roomError

      router.push(`/sala/${code}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al crear la sala")
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-xl font-bold text-primary">Crear Sala</h1>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Nueva Sala de Pronóstico</CardTitle>
            <CardDescription>
              Configura tu sala y comparte el código con tus amigos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="roomName">Nombre de la Sala</Label>
              <Input
                id="roomName"
                placeholder="Ej: Partida de los viernes"
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value)
                  setError("")
                }}
                maxLength={50}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="maxPlayers">Número de Jugadores</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger id="maxPlayers">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 jugadores</SelectItem>
                  <SelectItem value="3">3 jugadores</SelectItem>
                  <SelectItem value="4">4 jugadores</SelectItem>
                  <SelectItem value="5">5 jugadores</SelectItem>
                  <SelectItem value="6">6 jugadores</SelectItem>
                  <SelectItem value="7">7 jugadores</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Máximo {Math.floor(40 / parseInt(maxPlayers))} cartas por ronda con {maxPlayers} jugadores
              </p>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button onClick={handleCreate} size="lg" disabled={creating}>
              {creating ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Crear Sala
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
