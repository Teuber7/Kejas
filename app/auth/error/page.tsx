import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-emerald-950 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-amber-900/30 bg-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">
                Algo salio mal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {params?.error ? (
                <p className="text-sm text-amber-200/70">
                  Error: {params.error}
                </p>
              ) : (
                <p className="text-sm text-amber-200/70">
                  Ocurrio un error inesperado.
                </p>
              )}
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
