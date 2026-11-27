"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  datosVigencia,
  ESTADO_CAMBIO,
  ETIQUETA_ESTADO_CAMBIO,
  ETIQUETA_TIPO_CAMBIO,
  VARIANTE_ESTADO_CAMBIO,
  VARIANTE_TIPO_CAMBIO,
} from "@/components/academico/cambios-docente-constantes"
import {
  fechaDetalle,
  origenDetalle,
  SeccionDatos,
} from "@/components/academico/detalle-dialog-comunes"
import {
  DIAS_CLASE,
  horaCorta,
  type CambioDocenteDetalle,
  type CambioDocenteResponse,
} from "@/lib/api/academico"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cambio: CambioDocenteResponse | null
}

function diaTexto(diaSemana: number): string {
  return DIAS_CLASE.find((dia) => dia.value === diaSemana)?.label ?? `Día ${diaSemana}`
}

function textoAsignacion(detalle: CambioDocenteDetalle): string | null {
  const curso = detalle.curso?.trim()
  const gradoSeccion = [detalle.grado?.trim(), detalle.seccion?.trim()].filter(Boolean).join(" ")
  return [curso, gradoSeccion].filter(Boolean).join(" · ") || null
}

export default function CambioDocenteDetalleDialog({ open, onOpenChange, cambio }: Props) {
  if (!cambio) return null

  const detalles = cambio.detalles ?? []
  const primeraTransferencia = detalles[0]?.fechaTransferencia
  const inicioComun = detalles.every((detalle) => detalle.fechaTransferencia === primeraTransferencia)
    ? primeraTransferencia : null
  const inicioReal = fechaDetalle(cambio.fechaAplicacion ?? inicioComun)
  const finReal = fechaDetalle(cambio.fechaFinalizacion)
  const vigencia = datosVigencia({
    inicio: fechaDetalle(cambio.fechaInicio),
    inicioReal,
    finPrevisto: fechaDetalle(cambio.fechaFin),
    finReal,
    programado: cambio.estado === ESTADO_CAMBIO.PROGRAMADO,
    cancelado: cambio.estado === ESTADO_CAMBIO.CANCELADO,
  })
  const hayIncidencia = Boolean(
    cambio.incidencia ||
      cambio.fechaResolucion ||
      cambio.motivoIncidencia?.trim() ||
      cambio.resolucionAdministrativa?.trim() ||
      cambio.motivoResolucion?.trim()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" scroll="sticky">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-4">
            <DialogTitle>Detalle del cambio de docente</DialogTitle>
            <Badge variant={VARIANTE_TIPO_CAMBIO}>
              {ETIQUETA_TIPO_CAMBIO[cambio.tipo]}
            </Badge>
            <Badge variant={VARIANTE_ESTADO_CAMBIO[cambio.estado]}>
              {ETIQUETA_ESTADO_CAMBIO[cambio.estado]}
            </Badge>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5 pb-6">
          <SeccionDatos
            columnas={3}
            titulo="Motivo"
            datos={[
              { etiqueta: "Motivo", valor: cambio.motivo },
              { etiqueta: "Observaciones", valor: cambio.motivoDetalle },
              { etiqueta: "Año", valor: cambio.anio },
            ]}
          />

          <SeccionDatos
            columnas={3}
            titulo="Docentes"
            datos={[
              { etiqueta: "Docente titular", valor: cambio.docenteAnterior },
              { etiqueta: "Docente sustituto", valor: cambio.docenteNuevo ?? "Sin cobertura" },
              { etiqueta: "Registrado por", valor: cambio.usuarioRegistro },
            ]}
          />

          <SeccionDatos columnas={3} titulo="Vigencia" datos={vigencia} />

          <SeccionDatos
            columnas={3}
            titulo="Seguimiento"
            datos={[
              { etiqueta: "Fecha de registro", valor: fechaDetalle(cambio.fechaCambio) },
              { etiqueta: "Origen del registro", valor: origenDetalle(cambio.origenRegistro) },
              {
                etiqueta: "Última operación",
                valor: origenDetalle(cambio.origenUltimaOperacion),
              },
            ]}
          />

          {hayIncidencia && (
            <SeccionDatos
              columnas={3}
              titulo="Incidencia y observación"
              datos={[
                { etiqueta: "Motivo de incidencia", valor: cambio.motivoIncidencia },
                { etiqueta: "Observación", valor: cambio.resolucionAdministrativa },
                { etiqueta: "Fecha de la observación", valor: fechaDetalle(cambio.fechaResolucion) },
                { etiqueta: "Detalle de la observación", valor: cambio.motivoResolucion },
              ]}
            />
          )}

          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h3 className="text-sm font-semibold">Asignaciones</h3>
              {cambio.anio && (
                <p className="text-xs text-muted-foreground">Año {cambio.anio}</p>
              )}
            </div>
            {!detalles.length ? (
              <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                No hay asignaciones registradas en este cambio.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {detalles.map((detalle) => {
                  const horarios = [...(detalle.horarios ?? [])].sort(
                    (a, b) =>
                      a.diaSemana - b.diaSemana ||
                      horaCorta(a.horaInicio).localeCompare(horaCorta(b.horaInicio))
                  )
                  const fechaTransferencia = fechaDetalle(detalle.fechaTransferencia)
                  const fechaDevolucion = fechaDetalle(detalle.fechaDevolucion)
                  const transferencia = [
                    fechaTransferencia !== inicioReal ? fechaTransferencia : null,
                    origenDetalle(detalle.origenTransferencia),
                  ].filter(Boolean).join(" · ")
                  const devolucion = [
                    fechaDevolucion !== finReal ? fechaDevolucion : null,
                    origenDetalle(detalle.origenDevolucion),
                  ].filter(Boolean).join(" · ")
                  const asignacion = textoAsignacion(detalle)

                  return (
                    <div key={detalle.idAsignacion} className="space-y-2 rounded-lg border p-3">
                      {asignacion && <p className="font-medium">{asignacion}</p>}
                      <SeccionDatos
                        columnas={3}
                        titulo="Seguimiento de la asignación"
                        datos={[
                          { etiqueta: "Transferencia", valor: transferencia },
                          { etiqueta: "Devolución", valor: devolucion },
                          { etiqueta: "Cobertura", valor: detalle.sinCobertura ? "Sin cobertura" : null },
                          { etiqueta: "Devuelta", valor: detalle.devuelta ? "Sí" : null },
                        ]}
                      />
                      {horarios.length > 0 && (
                        <div>
                          <p className="text-xs font-medium">Horarios</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {horarios.map((horario) => (
                              <span
                                key={horario.idHorario}
                                className="rounded bg-muted px-1.5 py-0.5 text-[11px]"
                              >
                                {diaTexto(horario.diaSemana)} {horaCorta(horario.horaInicio)}–
                                {horaCorta(horario.horaFin)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
