'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Las contrasenas no coinciden')
      setIsLoading(false)
      return
    }

    if (displayName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName.trim(),
          },
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocurrio un error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-emerald-950 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-amber-400 tracking-tight">Pronostico</h1>
            <p className="mt-2 text-amber-200/70">Juego de cartas espanolas</p>
          </div>
          <Card className="border-amber-900/30 bg-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">Crear Cuenta</CardTitle>
              <CardDescription className="text-amber-200/70">
                Registrate para jugar con amigos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName" className="text-amber-200">Nombre de jugador</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Tu nombre en el juego"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="border-amber-900/50 bg-emerald-950/50 text-amber-100 placeholder:text-amber-200/40"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-amber-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-amber-900/50 bg-emerald-950/50 text-amber-100 placeholder:text-amber-200/40"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-amber-200">Contrasena</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-amber-900/50 bg-emerald-950/50 text-amber-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password" className="text-amber-200">Repetir contrasena</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="border-amber-900/50 bg-emerald-950/50 text-amber-100"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-amber-600 text-emerald-950 hover:bg-amber-500" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creando cuenta...' : 'Registrarme'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-amber-200/70">
                  Ya tienes cuenta?{' '}
                  <Link
                    href="/auth/login"
                    className="text-amber-400 underline underline-offset-4 hover:text-amber-300"
                  >
                    Inicia sesion
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
