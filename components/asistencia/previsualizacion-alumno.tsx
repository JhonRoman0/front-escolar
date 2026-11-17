"use client"

import { CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { CapturaFoto } from "@/components/shared/captura-foto"
import { AsistenciaEstadoBadge } from "./asistencia-estado-badge"
import type { AsistenciaResponse } from "@/lib/api/asistencia"
import type { JustificacionResponse } from "@/lib/api/justificacion"
import { formatearHora } from "@/lib/fechas"
import { useTurnos } from "@/hooks/use-academico"

interface PrevisualizacionAlumnoProps {
  previsualizacion: AsistenciaResponse
  justificaciones: JustificacionResponse[] | undefined
  idJustificacion: number | null
  onIdJustificacionChange: (id: number | null) => void
  /** Ingreso justificado: quién lo trajo y la foto de evidencia (obligatorios). */
  acompanante: string
  onAcompananteChange: (valor: string) => void
  foto: File | null
  onFotoChange: (foto: File | null) => void
  onRegistrar: () => void
  /** Acción secundaria ("Escanear otro"); si se omite no se muestra. */
  onVolver?: () => void
  registrando: boolean
}

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

/** Tarjeta de alumno previsualizado + motivo de justificación + botón registrar.
 *  Se usa en el modal de registro (QR o búsqueda). */
export function PrevisualizacionAlumno({
  previsualizacion: previa,
  justificaciones,
  idJustificacion,
  onIdJustificacionChange,
  acompanante,
  onAcompananteChange,
  foto,
  onFotoChange,
  onRegistrar,
  onVolver,
  registrando,
}: PrevisualizacionAlumnoProps) {
  const requiereJustificacion = previa.estado === "Justificada"
  const puedeRegistrar =
    (!requiereJustificacion || (!!idJustificacion && acompanante.trim().length >= 3 && !!foto)) && !registrando
  // Solo informativo: horario del turno del alumno (GET /turnos, caché compartida).
  const { data: turnos } = useTurnos()
  const turno = turnos?.find((t) => t.nombre === previa.turno)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-lg border p-4">
        <Avatar className="h-16 w-16 text-base">
          {previa.urlFoto ? (
            <AvatarImage src={previa.urlFoto} alt={previa.alumno} />
          ) : null}
          <AvatarFallback>{iniciales(previa.alumno)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{previa.alumno}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {previa.codigo}
          </p>
          <p className="text-sm text-muted-foreground">
            {previa.grado} — Sección {previa.seccion} · Turno{" "}
            <span className="capitalize">{previa.turno}</span>
          </p>
          {turno && (
            <p className="text-xs text-muted-foreground">
              Horario: {formatearHora(turno.horaEntrada)} –{" "}
              {formatearHora(turno.horaSalida)} · puntual hasta{" "}
              {formatearHora(turno.horaEntradaLimite)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Hora: {formatearHora(previa.horaEntrada)}
          </p>
          <div className="mt-2">
            <AsistenciaEstadoBadge estado={previa.estado} />
          </div>
        </div>
      </div>

      {requiereJustificacion && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Motivo de justificación <span className="text-destructive">*</span>
          </p>
          <Select
            value={idJustificacion?.toString() ?? ""}
            onValueChange={(v) => onIdJustificacionChange(Number(v))}
          >
            <SelectTrigger className="w-full text-foreground">
              <SelectValue placeholder="Selecciona un motivo">
                {justificaciones?.find((x) => x.idJustificacion === idJustificacion)
                  ?.motivo ?? "Selecciona un motivo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(justificaciones ?? []).map((j) => (
                <SelectItem
                  key={j.idJustificacion}
                  value={j.idJustificacion.toString()}
                >
                  {j.motivo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Llegó pasado el límite de tardanza: solo ingresa justificado, con quien lo trajo y una foto de evidencia.
          </p>
          <p className="pt-1 text-sm font-medium">
            Persona que lo trajo <span className="text-destructive">*</span>
          </p>
          <Input
            placeholder="Nombre completo"
            maxLength={150}
            value={acompanante}
            onChange={(e) => onAcompananteChange(e.target.value)}
          />
          <p className="pt-1 text-sm font-medium">
            Foto de evidencia <span className="text-destructive">*</span>
          </p>
          <CapturaFoto foto={foto} onChange={onFotoChange} />
        </div>
      )}

      <div className={onVolver ? "flex flex-col gap-2 sm:flex-row" : undefined}>
        {onVolver && (
          <Button
            variant="outline"
            onClick={onVolver}
            className="flex-1"
            disabled={registrando}
          >
            Escanear otro
          </Button>
        )}
        <Button
          onClick={onRegistrar}
          disabled={!puedeRegistrar}
          className={`${onVolver ? "flex-1" : "w-full"}`}
          size={onVolver ? "default" : "lg"}
        >
          {registrando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {requiereJustificacion
                ? "Registrar como Justificada"
                : "Registrar asistencia"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
