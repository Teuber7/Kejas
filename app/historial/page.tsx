"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Calendar, Users } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface GameHistoryEntry {
  id: string
  room_name: string
  winner_id: string
  final_scores: Record<string, number>
  player_ids: string[]
  rounds_played: number
  created_at: string
  winner_profile?: {
    display_name: string
  }
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [history, setHistory] = useState<GameHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)

      // Fetch game history where user participated
      const { data: historyData } = await supabase
        .from("game_history")
        .select("*")
        .contains("player_ids", [currentUser.id])
        .order("created_at", { ascending: false })
        .limit(20)

      if (historyData) {
        // Fetch winner profiles
        const winnerIds = [...new Set(historyData.map(h => h.winner_id))]
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", winnerIds)

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

        const enrichedHistory = historyData.map(h => ({
          ...h,
          winner_profile: profileMap.get(h.winner_id)
        }))

        setHistory(enrichedHistory)

        // Calculate stats
        const gamesPlayed = historyData.length
        const gamesWon = historyData.filter(h => h.winner_id === currentUser.id).length
        const totalScore = historyData.reduce((sum, h) => {
          return sum + (h.final_scores[currentUser.id] || 0)
        }, 0)

        setStats({ gamesPlayed, gamesWon, totalScore })
      }

      setLoading(false)
    }

    fetchHistory()
  }, [router, supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
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
        <h1 className="text-xl font-bold text-primary">Historial de Partidas</h1>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.gamesPlayed}</p>
              <p className="text-xs text-muted-foreground">Partidas</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.gamesWon}</p>
              <p className="text-xs text-muted-foreground">Victorias</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.totalScore}</p>
              <p className="text-xs text-muted-foreground">Puntos Total</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No hay partidas en tu historial</p>
              <Button onClick={() => router.push("/")} className="mt-4">
                Jugar tu primera partida
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((game) => {
              const myScore = game.final_scores[user!.id] || 0
              const isWinner = game.winner_id === user!.id
              const sortedScores = Object.entries(game.final_scores)
                .sort((a, b) => b[1] - a[1])
              const myPosition = sortedScores.findIndex(([id]) => id === user!.id) + 1

              return (
                <Card key={game.id} className="border-border/50 bg-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {game.room_name}
                        {isWinner && (
                          <Badge className="bg-primary/20 text-primary">
                            <Trophy className="h-3 w-3 mr-1" />
                            Victoria
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge variant="outline">#{myPosition}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(game.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {game.player_ids.length} jugadores
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Tu puntuación</p>
                        <p className="text-2xl font-bold">{myScore} pts</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Ganador</p>
                        <p className="font-medium">
                          {isWinner ? "Tú" : game.winner_profile?.display_name || "Desconocido"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
