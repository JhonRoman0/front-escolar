"use client"

import { useMemo, useState } from "react"
import { BookOpen, CircleAlert, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

import { useAniosEscolares } from "@/hooks/use-academico"
import { useOpcionesMatricula } from "@/hooks/use-matricula"
import { useMetodosPago } from "@/hooks/use-pagos"
import { ACCESO, ESTADO_ANIO, estadoAnioTexto } from "@/lib/api/academico"
import { formatearFecha, fechaHoyISO } from "@/lib/fechas"
import type { ApoderadoPasoValues } from "@/lib/schemas/matricula"

import type { AlumnoPaso } from "./paso-alumno"
import { CamposPago, erroresDePago, formatoSoles } from "./campos-pago"
import { agruparGrados, grupoDe, SELECCION_VACIA, SelectorSeccion, seleccionInicial, type SeleccionSeccion } from "./selector-seccion"

export interface DatosMatriculaPaso {
  idGradoSeccion: number
  idMetodoPago: number
  codigoTransaccion: string
  observaciones: string
}

interface PasoMatriculaProps {
  alumno: AlumnoPaso
  apoderados: ApoderadoPasoValues[]
  enviando: boolean
  onAtras: () => void
  onCrear: (datos: DatosMatriculaPaso, comprobante: File | null) => void
}

export function PasoMatricula({ alumno, apoderados, enviando, onAtras, onCrear }: PasoMatriculaProps) {
  const { data: anios = [] } = useAniosEscolares()
  const { data: metodos = [] } = useMetodosPago(true)
  // Solo se matricula en un año vigente o por comenzar; primero el por comenzar.
  const aniosMatricula = useMemo(
    () =>
      anios
        .filter((a) => a.accesoId !== ACCESO.ELIMINADO)
        .filter((a) => a.estado === ESTADO_ANIO.VIGENTE || a.estado === ESTADO_ANIO.POR_COMENZAR)
        .sort((a, b) => b.anio.localeCompare(a.anio)),
    [anios]
  )
  const [idAnioElegido, setIdAnioElegido] = useState(0)
  const idAnio = idAnioElegido || aniosMatricula[0]?.idAnio || 0
  const { data: opciones, isLoading } = useOpcionesMatricula(idAnio || null, alumno.idAlumno)
  const grados = useMemo(() => agruparGrados(opciones?.grados ?? []), [opciones])

  // La selección se reinicia con la sugerida cada vez que cambia el año.
  const [elegida, setElegida] = useState<{ idAnio: number; seleccion: SeleccionSeccion } | null>(null)
  const seleccion =
    elegida?.idAnio === idAnio ? elegida.seleccion : opciones ? seleccionInicial(grados) : SELECCION_VACIA
  const grado = grupoDe(grados, seleccion.idGrado)
  const seccion = grado?.secciones.find((s) => s.idGradoSeccion === seleccion.idGradoSeccion)

  const [idMetodoPago, setIdMetodoPago] = useState(0)
  const [codigo, setCodigo] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [observaciones, setObservaciones] = useState("")
  const [intentado, setIntentado] = useState(false)

  const metodo = metodos.find((m) => m.idMetodoPago === idMetodoPago)
  const erroresPago = intentado ? erroresDePago(metodo, codigo, comprobante) : undefined
  const erroresSeccion = intentado
    ? {
        idNivel: seleccion.idNivel ? undefined : "Selecciona el nivel",
        idGrado: seleccion.idGrado ? undefined : "Selecciona el grado",
        idTurno: seleccion.idTurno ? undefined : "Selecciona el turno",
        idGradoSeccion: seleccion.idGradoSeccion ? undefined : "Selecciona la sección",
      }
    : undefined
  const sinMonto = !!grado && grado.monto == null

  function handleCrear() {
    setIntentado(true)
    const pago = erroresDePago(metodo, codigo, comprobante)
    if (!seleccion.idGradoSeccion || sinMonto || pago.metodo || pago.codigo || pago.comprobante) return
    onCrear(
      { idGradoSeccion: seleccion.idGradoSeccion, idMetodoPago, codigoTransaccion: codigo, observaciones },
      comprobante
    )
  }

  const v = alumno.valores
  const nombreAlumno = `${v.nombre} ${v.apellidoPat} ${v.apellidoMat}`
  const principal = apoderados[0]

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel>Año escolar *</FieldLabel>
        <FieldContent>
          <Select value={idAnio ? String(idAnio) : ""} onValueChange={(valor) => setIdAnioElegido(Number(valor))}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecciona">
                {aniosMatricula.find((a) => a.idAnio === idAnio)?.anio}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {aniosMatricula.map((a) => (
                  <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                    {a.anio} · {estadoAnioTexto(a.estado)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {opciones?.ultimoGrado && (
            <FieldDescription className="text-xs">Último grado: {opciones.ultimoGrado}</FieldDescription>
          )}
        </FieldContent>
      </Field>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : opciones?.bloqueo ? (
        <AvisoError>{opciones.bloqueo}</AvisoError>
      ) : opciones && !opciones.grados.length ? (
        <AvisoError>No hay secciones con cupo disponible en {aniosMatricula.find((a) => a.idAnio === idAnio)?.anio}.</AvisoError>
      ) : opciones ? (
        <>
          <SelectorSeccion
            grados={grados}
            value={seleccion}
            onChange={(nueva) => setElegida({ idAnio, seleccion: nueva })}
            errores={erroresSeccion}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Monto de matrícula</FieldLabel>
              <FieldContent>
                <Input value={grado ? formatoSoles(grado.monto) : ""} placeholder="S/ 0.00" disabled />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Fecha de pago</FieldLabel>
              <FieldContent>
                <Input value={formatearFecha(fechaHoyISO())} disabled />
              </FieldContent>
            </Field>
          </div>
          {sinMonto && (
            <AvisoError>
              El monto de matrícula de {grado?.nivel} no está configurado para este año. Configúralo en el módulo Pagos.
            </AvisoError>
          )}

          <CamposPago
            metodos={metodos}
            idMetodoPago={idMetodoPago}
            onMetodo={setIdMetodoPago}
            codigo={codigo}
            onCodigo={setCodigo}
            comprobante={comprobante}
            onComprobante={setComprobante}
            errores={erroresPago}
          />

          <Field>
            <FieldLabel>Observaciones</FieldLabel>
            <FieldContent>
              <Textarea rows={2} maxLength={500} placeholder="Opcional" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </FieldContent>
          </Field>

          <div className="flex gap-4 rounded-lg bg-brand-subtle/60 p-4">
            <BookOpen className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Resumen</p>
              <p className="text-brand dark:text-white">
                {nombreAlumno}
                {grado && seccion ? ` · ${grado.grado} ${grado.nivel} ${seccion.seccion} (${seccion.turno})` : ""}
                {grado?.monto != null ? ` · ${formatoSoles(grado.monto)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Apoderado: {principal.nombre} {principal.apellidoPat}
                {apoderados[1] ? ` y ${apoderados[1].nombre} ${apoderados[1].apellidoPat}` : ""}. Revisa la información antes de crear la matrícula.
              </p>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onAtras} disabled={enviando}>Atrás</Button>
        <Button
          type="button"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={handleCrear}
          disabled={enviando || !opciones || !!opciones.bloqueo || sinMonto}
        >
          {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Crear matrícula
        </Button>
      </div>
    </div>
  )
}

function AvisoError({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p>{children}</p>
    </div>
  )
}
