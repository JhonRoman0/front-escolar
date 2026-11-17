"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CalendarClock, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { BotonGuardar } from "@/components/shared/boton-guardar"
import { CampoCalificacion } from "@/components/shared/campo-calificacion"
import { CargandoTarjetas } from "@/components/shared/table-helpers"
import { useDetalleNotaAnual, useGuardarNotasAnuales, useReabrirNotaFinal } from "@/hooks/use-notas-finales"
import type { CeldaNotaAnual, CursoFinal, DetalleNotaAnual, NotaFinalItem } from "@/lib/api/notas-finales"
import { ESCALAS, errorCalificacion, errorConclusion } from "@/lib/calificaciones"
import { Conclusion, MOTIVO_MAXIMO, ReabrirNota, type ValorNotaFinal } from "./celda-nota-final"

function clave(idMatricula: number, idCompetencia: number) {
  return `${idMatricula}-${idCompetencia}`
}

/** Nota final del año de cada competencia, con el resumen de sus periodos. */
export function NotasAnuales({ curso }: { curso: CursoFinal }) {
  const { data: detalle, isLoading } = useDetalleNotaAnual(curso.idGradoSeccion, curso.idArea)
  if (isLoading || !detalle) return <CargandoTarjetas filas={2} />
  return (
    <TablaAnual
      // Cambiar de curso o guardar arranca la tabla limpia.
      key={JSON.stringify([detalle.curso.idGradoSeccion, detalle.curso.idArea, detalle.alumnos])}
      detalle={detalle}
    />
  )
}

function TablaAnual({ detalle }: { detalle: DetalleNotaAnual }) {
  const guardar = useGuardarNotasAnuales()
  const reabrir = useReabrirNotaFinal()
  const [motivo, setMotivo] = useState("")
  const { escala, competencias, periodos } = detalle
  const vigesimal = escala === "VIGESIMAL"
  const puedeGuardar = detalle.puedeRegistrar || detalle.puedeCorregir

  // Lo guardado, o en vigesimal el promedio de los periodos (se registra al guardar).
  const originales: Record<string, ValorNotaFinal> = {}
  const iniciales: Record<string, ValorNotaFinal> = {}
  for (const alumno of detalle.alumnos) {
    for (const celda of alumno.notas) {
      const k = clave(alumno.idMatricula, celda.idCompetencia)
      originales[k] = { calificacion: celda.calificacion ?? "", conclusion: celda.conclusionDescriptiva ?? "" }
      iniciales[k] = celda.calificacion == null && vigesimal && celda.promedio != null
        ? { calificacion: String(celda.promedio), conclusion: "" }
        : originales[k]
    }
  }
  const [valores, setValores] = useState(iniciales)

  /** Literal: se elige (la ya puesta solo con permiso de corregir). Vigesimal: nunca se escribe. */
  function editable(celda: CeldaNotaAnual) {
    if (celda.faltan.length || vigesimal) return false
    return celda.calificacion == null ? puedeGuardar : detalle.puedeCorregir
  }

  const pendientes = detalle.alumnos.flatMap((alumno) =>
    alumno.notas
      .filter((celda) => celda.calificacion == null ? puedeGuardar && !celda.faltan.length : editable(celda))
      .map((celda) => ({ alumno, celda, k: clave(alumno.idMatricula, celda.idCompetencia) }))
      .filter(({ k }) => JSON.stringify(valores[k]) !== JSON.stringify(originales[k]))
      .filter(({ celda, k }) => celda.calificacion != null || valores[k].calificacion.trim())
  )
  const corregidas = pendientes.filter(({ celda }) => celda.calificacion != null)

  async function onReabrir(idMatricula: number, idCompetencia: number, motivoReapertura: string) {
    try {
      await reabrir.mutateAsync({
        idGradoSeccion: detalle.curso.idGradoSeccion,
        idArea: detalle.curso.idArea,
        periodo: null,
        idMatricula,
        idCompetencia,
        motivo: motivoReapertura,
      })
      toast.success("Nota del año reabierta")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reabrir la nota")
      return false
    }
  }

  async function onGuardar() {
    if (corregidas.some(({ k }) => !valores[k].calificacion.trim())) {
      toast.error("Para quitar una nota ya registrada, usa Reabrir")
      return
    }
    const conError = pendientes.filter(({ k }) =>
      errorCalificacion(escala, valores[k].calificacion) ||
      (!vigesimal && errorConclusion(escala, valores[k].calificacion, valores[k].conclusion))
    )
    if (conError.length) {
      toast.error(`Revisa ${conError.length} ${conError.length === 1 ? "nota" : "notas"}: falta la conclusión o el valor no es válido`)
      return
    }
    if (corregidas.length && !motivo.trim()) {
      toast.error("Escribe el motivo de la corrección")
      return
    }
    const item = ({ alumno, celda, k }: (typeof pendientes)[number]): NotaFinalItem => ({
      idMatricula: alumno.idMatricula,
      idCompetencia: celda.idCompetencia,
      calificacion: valores[k].calificacion.trim() || null,
      conclusionDescriptiva: vigesimal ? null : valores[k].conclusion.trim() || null,
    })
    const base = { idGradoSeccion: detalle.curso.idGradoSeccion, idArea: detalle.curso.idArea, motivo: motivo.trim() || null }
    const nuevas = pendientes.filter(({ celda }) => celda.calificacion == null).map(item)
    const correcciones = corregidas.map(item)
    try {
      // Sin permiso de registrar, las nuevas van por la ruta de corregir.
      await guardar.mutateAsync({
        nuevas: detalle.puedeRegistrar && nuevas.length ? { ...base, notas: nuevas } : null,
        correcciones: correcciones.length || (!detalle.puedeRegistrar && nuevas.length)
          ? { ...base, notas: detalle.puedeRegistrar ? correcciones : [...nuevas, ...correcciones] }
          : null,
      })
      toast.success("Notas del año guardadas")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las notas")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Escala {ESCALAS.find((e) => e.value === escala)?.detalle}</Badge>
        <span>
          {vigesimal
            ? "La nota del año es el promedio de los periodos: se registra al guardar."
            : "Elige la nota del año mirando las notas de cada periodo."}
        </span>
      </div>

      {!detalle.disponible ? (
        <p className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <CalendarClock className="size-3.5 text-amber-600" />
          {detalle.noDisponible}
        </p>
      ) : !puedeGuardar ? (
        <p className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          No tienes permiso para registrar notas del año: solo lectura.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[220px]">Alumno</TableHead>
              {competencias.map((c) => (
                <TableHead key={c.idCompetencia} className="min-w-[200px] text-center">
                  <Tooltip>
                    <TooltipTrigger render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}>
                      Competencia {c.codigo}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{c.nombre}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.alumnos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2 + competencias.length} className="h-20 text-center text-muted-foreground">
                  No hay alumnos matriculados en esta sección.
                </TableCell>
              </TableRow>
            ) : (
              detalle.alumnos.map((alumno, i) => (
                <TableRow key={alumno.idMatricula}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{alumno.nombre}</p>
                    <p className="text-xs text-muted-foreground">{alumno.codigo}</p>
                  </TableCell>
                  {alumno.notas.map((celda) => {
                    const k = clave(alumno.idMatricula, celda.idCompetencia)
                    const codigoCompetencia = competencias.find((c) => c.idCompetencia === celda.idCompetencia)?.codigo ?? ""
                    return (
                      <TableCell key={celda.idCompetencia}>
                        <CeldaAnual
                          celda={celda}
                          periodos={periodos}
                          escala={escala}
                          valor={valores[k]}
                          onChange={(v) => setValores((actual) => ({ ...actual, [k]: v }))}
                          editable={editable(celda)}
                          alumno={alumno.nombre}
                          competencia={codigoCompetencia}
                          onReabrir={
                            detalle.puedeCorregir && celda.calificacion != null
                              ? (m) => onReabrir(alumno.idMatricula, celda.idCompetencia, m)
                              : undefined
                          }
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {puedeGuardar && (
        <form
          className="flex items-center justify-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void onGuardar()
          }}
        >
          {corregidas.length > 0 && (
            <Input
              className="h-8 max-w-xs"
              placeholder="Motivo de la corrección *"
              maxLength={MOTIVO_MAXIMO}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-label="Motivo de la corrección"
            />
          )}
          <span className="text-xs text-muted-foreground">
            {pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? "nota" : "notas"} por guardar` : ""}
          </span>
          <BotonGuardar etiqueta="Guardar notas del año" enviando={guardar.isPending} disabled={!pendientes.length} />
        </form>
      )}
    </div>
  )
}

/** "B1 A · B2 B · …" de la competencia y, al lado, la nota del año. */
function CeldaAnual({
  celda,
  periodos,
  escala,
  valor,
  onChange,
  editable,
  alumno,
  competencia,
  onReabrir,
}: {
  celda: CeldaNotaAnual
  periodos: DetalleNotaAnual["periodos"]
  escala: DetalleNotaAnual["escala"]
  valor: ValorNotaFinal
  onChange: (valor: ValorNotaFinal) => void
  editable: boolean
  alumno: string
  competencia: string
  onReabrir?: (motivo: string) => Promise<boolean>
}) {
  const vigesimal = escala === "VIGESIMAL"
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap justify-center gap-1">
        {celda.periodos.map((p) => (
          <Tooltip key={p.numero}>
            <TooltipTrigger render={<span className="rounded border px-1.5 py-0.5 font-mono text-[11px]" />}>
              <span className="text-muted-foreground">P{p.numero} </span>
              {p.calificacion ?? "—"}
            </TooltipTrigger>
            <TooltipContent>{periodos.find((x) => x.numero === p.numero)?.nombre}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {celda.faltan.length > 0 ? (
        <span className="text-center text-[11px] text-amber-700 dark:text-amber-400">Falta: {celda.faltan.join(", ")}</span>
      ) : (
        <div className="flex items-center gap-0.5">
          <span className="text-[11px] text-muted-foreground">Año:</span>
          {editable ? (
            <CampoCalificacion
              escala={escala}
              value={valor.calificacion}
              onChange={(calificacion) => onChange({ ...valor, calificacion })}
              ariaLabel={`Nota del año de ${alumno} en la competencia ${competencia}`}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span className="min-w-8 text-center font-mono font-semibold" />}>
                {valor.calificacion || "—"}
              </TooltipTrigger>
              <TooltipContent>
                {celda.registradoPor
                  ? `Registrada por ${celda.registradoPor}`
                  : vigesimal
                    ? "Promedio de los periodos: se registra al guardar"
                    : "Sin nota registrada"}
              </TooltipContent>
            </Tooltip>
          )}
          {!vigesimal && (
            <Conclusion
              escala={escala}
              valor={valor}
              editable={editable}
              onChange={(conclusion) => onChange({ ...valor, conclusion })}
            />
          )}
          {onReabrir && (
            <ReabrirNota
              descripcion={`La nota del año de ${alumno} en la competencia ${competencia} se anula; luego podrás reabrir o corregir las de los periodos.`}
              onReabrir={onReabrir}
            />
          )}
        </div>
      )}
    </div>
  )
}
