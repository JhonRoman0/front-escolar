"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Laptop, ShieldCheck, Smartphone, Trash2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { useAuth } from "@/components/auth-provider"
import { authApi, CLAVE_DISPOSITIVOS, type DispositivoResponse } from "@/lib/api/auth"
import { formatearFecha } from "@/lib/fechas"

const CLAVE = CLAVE_DISPOSITIVOS

function fechaHora(valor: string | null): string {
  if (!valor) return "—"
  return `${formatearFecha(valor)} ${valor.slice(11, 16)}`
}

function esMovil(navegador: string): boolean {
  return /Android|iPhone|iPad/.test(navegador)
}

/** Navegadores desde los que el usuario inició sesión (Mi perfil → Seguridad). */
export function DispositivosCard() {
  const queryClient = useQueryClient()
  const { logout } = useAuth()
  const { data, isLoading, isError } = useQuery({
    queryKey: CLAVE,
    queryFn: () => authApi.dispositivos(),
  })
  const recargar = () => queryClient.invalidateQueries({ queryKey: CLAVE })
  const olvidar = useMutation({ mutationFn: (id: number) => authApi.olvidarDispositivo(id) })

  async function quitarDispositivo(d: DispositivoResponse) {
    try {
      await olvidar.mutateAsync(d.idDispositivo)
      if (d.actual) {
        // Era esta sesión: ya no vale.
        logout()
        return
      }
      void recargar()
      toast.success("Dispositivo quitado: su sesión se cerró")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar el dispositivo")
      throw error
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Laptop className="size-4 text-muted-foreground" />
          <CardTitle>Dispositivos</CardTitle>
        </div>
        <CardDescription>
          Navegadores desde los que iniciaste sesión. Al quitar uno se cierra su sesión y, para volver a
          entrar desde ahí, se pedirá el código. Si ves uno que no reconoces, quítalo y cambia tu contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading &&
          Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        {isError && (
          <p className="text-sm text-muted-foreground">No se pudieron cargar tus dispositivos.</p>
        )}
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay dispositivos registrados.</p>
        )}
        {data?.map((d) => {
          const Icono = esMovil(d.navegador) ? Smartphone : Laptop
          return (
            <div
              key={d.idDispositivo}
              className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <Icono className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold">{d.navegador}</p>
                    {d.actual && <Badge variant="secondary">Este dispositivo</Badge>}
                    {d.confiableHasta && (
                      <Badge variant="success">
                        <ShieldCheck />
                        De confianza hasta {formatearFecha(d.confiableHasta)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs break-words text-muted-foreground">
                    Último uso: {fechaHora(d.ultimoUso)} · Primer uso: {formatearFecha(d.primerUso)}
                    {d.ip ? ` · IP ${d.ip}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 justify-end">
                <ConfirmarEliminar
                  titulo="Quitar dispositivo"
                  descripcion={
                    d.actual
                      ? `Es el dispositivo que estás usando: se cerrará tu sesión ahora y, para volver a entrar, te pediremos el código del correo.`
                      : `Se cerrará la sesión abierta en "${d.navegador}" y se quitará de la lista. Para volver a entrar desde ahí se pedirá el código y te avisaremos por correo.`
                  }
                  textoBoton="Quitar"
                  icono={<Trash2 className="text-destructive" />}
                  onConfirm={() => quitarDispositivo(d)}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
