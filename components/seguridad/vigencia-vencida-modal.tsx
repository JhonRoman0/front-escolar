"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UsuarioResponse } from "@/lib/api/auth"
import { formatearFecha } from "@/lib/fechas"
import type { DetalleSesionBloqueada } from "@/lib/sesion-bloqueada"
import {
  CODIGOS_VIGENCIA,
  TEXTO_SIN_FIN,
  tituloBloqueoVigencia,
} from "@/lib/vigencia"

interface VigenciaVencidaModalProps {
  detalle: DetalleSesionBloqueada
  usuario: UsuarioResponse | null
  onCerrarSesion: () => void
}

export function VigenciaVencidaModal({
  detalle,
  usuario,
  onCerrarSesion,
}: VigenciaVencidaModalProps) {
  const inicio = detalle.fechaInicio ?? usuario?.fechaInicioVigencia
  const fin = detalle.fechaFin ?? usuario?.fechaFinVigencia
  const rango =
    detalle.codigo !== CODIGOS_VIGENCIA.NO_DISPONIBLE && inicio
      ? ` Periodo: ${formatearFecha(inicio)} – ${fin ? formatearFecha(fin) : TEXTO_SIN_FIN}.`
      : ""

  return (
    <Dialog open onOpenChange={undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {tituloBloqueoVigencia(detalle.codigo, detalle.estado)}
          </DialogTitle>
          <DialogDescription>
            {detalle.mensaje}
            {rango}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onCerrarSesion}>Cerrar sesión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
