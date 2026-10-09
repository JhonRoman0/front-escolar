"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const SEGUNDOS_CUENTA_REGRESIVA = 3

interface PermisosActualizadosModalProps {
  abierto: boolean
  onCerrarSesion: () => void
}

// Modal bloqueante: no tiene botón de cierre, no se cierra con Escape ni con
// clic fuera (onOpenChange indefinido) y, al ser un Dialog modal de Base UI,
// atrapa el foco y bloquea la interacción con la aplicación de fondo.
export function PermisosActualizadosModal({
  abierto,
  onCerrarSesion,
}: PermisosActualizadosModalProps) {
  const [segundos, setSegundos] = useState(SEGUNDOS_CUENTA_REGRESIVA)

  useEffect(() => {
    if (!abierto) return
    const id = window.setInterval(() => {
      setSegundos((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [abierto])

  useEffect(() => {
    if (abierto && segundos === 0) {
      onCerrarSesion()
    }
  }, [abierto, segundos, onCerrarSesion])

  if (!abierto) return null

  return (
    <Dialog open onOpenChange={undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-encabezado font-semibold">
            Tus permisos fueron actualizados
          </DialogTitle>
          <DialogDescription>
            Un administrador ha actualizado tus permisos de acceso. Por
            seguridad, tu sesión se cerrará para aplicar los cambios.
          </DialogDescription>
        </DialogHeader>
        <p
          aria-live="polite"
          className="text-center text-pequeno font-medium text-muted-foreground"
        >
          Cerrando sesión en {segundos} {segundos === 1 ? "segundo" : "segundos"}…
        </p>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onCerrarSesion}>Cerrar sesión ahora</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
