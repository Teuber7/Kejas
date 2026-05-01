"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Pencil, Check, X, LogOut } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", currentUser.id)
          .single()

        if (profile?.display_name) {
          setDisplayName(profile.display_name)
          setNewName(profile.display_name)
        }
      }

      setLoading(false)
    }
    checkUser()
  }, [supabase])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    setError("")

    const { data, error: signInError } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: name.trim() } },
    })

    if (signInError) {
      setError("Error al conectar. Asegurate de habilitar 'Anonymous sign-ins' en tu proyecto de Supabase.")
      setJoining(false)
      return
    }

    setUser(data.user)
    setDisplayName(name.trim())
    setNewName(name.trim())
    setJoining(false)
  }

  const handleSaveName = async () => {
    if (!newName.trim() || !user) return
    setSavingName(true)

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: newName.trim() })
      .eq("id", user.id)

    if (!updateError) {
      setDisplayName(newName.trim())
    }
    setEditingName(false)
    setSavingName(false)
  }

  const cancelEdit = () => {
    setEditingName(false)
    setNewName(displayName)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDisplayName("")
    setNewName("")
    setName("")
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tighter text-primary">
            Pronóstico
          </h1>
          <p className="mt-2 text-muted-foreground">
            El clásico juego de cartas en tiempo real.
          </p>
        </div>

        {!user ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>¿Cómo te llamas?</CardTitle>
              <CardDescription>Ingresa un apodo para empezar a jugar. No necesitas cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Apodo</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Jugador1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" disabled={joining || !name.trim()}>
                  {joining ? <Spinner className="h-4 w-4 mr-2" /> : null}
                  Entrar a Jugar
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-start justify-between">
              <CardTitle>Bienvenido</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground"
                onClick={handleSignOut}
                title="Cambiar usuario"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {editingName ? (
                  <>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") cancelEdit() }}
                      maxLength={20}
                      className="h-7 text-sm w-40"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName} disabled={savingName || !newName.trim()}>
                      {savingName ? <Spinner className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <CardDescription>
                      Jugando como <span className="text-foreground font-semibold">{displayName}</span>
                    </CardDescription>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditingName(true)}
                      title="Cambiar nombre"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button asChild size="lg" className="w-full">
                <Link href="/sala/crear">Crear Sala</Link>
              </Button>
              <div className="flex gap-2">
                <Input
                  placeholder="Código de sala"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  disabled={!roomCode.trim()}
                  asChild={roomCode.trim().length > 0}
                >
                  {roomCode.trim() ? (
                    <Link href={`/sala/${roomCode.trim()}`}>Unirse</Link>
                  ) : (
                    <span>Unirse</span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground pt-2">
                Comparte el código de sala con tus amigos para que se unan.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
