import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Page() {
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
              <CardTitle className="text-2xl text-amber-100">
                Cuenta creada
              </CardTitle>
              <CardDescription className="text-amber-200/70">
                Revisa tu email para confirmar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-200/70">
                Te hemos enviado un email de confirmacion. Haz clic en el enlace para activar tu cuenta y comenzar a jugar.
              </p>
              <Button asChild className="w-full bg-amber-600 text-emerald-950 hover:bg-amber-500">
                <Link href="/auth/login">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
