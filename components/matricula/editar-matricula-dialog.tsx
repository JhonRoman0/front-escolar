"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDownLeft, ArrowUpRight, Lock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { useCrudMatriculas, useOpcionesMatricula } from "@/hooks/use-matricula"
import { useMetodosPago } from "@/hooks/use-pagos"
import { estadoAnioTexto } from "@/lib/api/academico"
import { ANIO_CERRADO, ANIO_POR_COMENZAR, type MatriculaResponse } from "@/lib/api/matricula"

import { CamposPago, erroresDePago, formatoSoles } from "./campos-pago"
import { agruparGrados, grupoDe, SelectorSeccion, type SeleccionSeccion } from "./selector-seccion"

/**
 * Qué se edita depende del año: por comenzar, grado, turno y sección (con
 * diferencia o devolución si cambia de nivel); vigente, solo cambio de sección
 * dentro del mismo grado y observaciones; cerrado, nada.
 */
export function EditarMatriculaDialog({
  matricula,
  open,
  onOpenChange,
}: {
  matricula: MatriculaResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Editar matrícula</DialogTitle>
        </DialogHeader>
        {open && matricula && <Contenido matricula={matricula} onCerrar={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ matricula, onCerrar }: { matricula: MatriculaResponse; onCerrar: () => void }) {
  const cabecera = (
    <TarjetaSeccion>
      <p className="font-medium">{matricula.alumno}</p>
      <p className="text-xs text-muted-foreground">
        {matricula.grado} {matricula.nivel} {matricula.seccion} · {matricula.turno} · {matricula.anio} ({estadoAnioTexto(matricula.estadoAnio)})
      </p>
      <p className="text-xs text-muted-foreground">
        Monto {formatoSoles(matricula.monto)} · Pagado {formatoSoles(matricula.pagadoNeto)}
      </p>
    </TarjetaSeccion>
  )

  if (matricula.estadoAnio === ANIO_CERRADO) {
    return (
      <div className="flex flex-col gap-4">
        {cabecera}
        <div className="flex gap-3 rounded-lg border p-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" />
          El año {matricula.anio} está cerrado: su matrícula ya no se modifica.
        </div>
        <DialogFooter>
          <DialogTrigger render={<Button variant="outline" />}>Cerrar</DialogTrigger>
        </DialogFooter>
      </div>
    )
  }
  return matricula.estadoAnio === ANIO_POR_COMENZAR ? (
    <EdicionPorComenzar matricula={matricula} cabecera={cabecera} onCerrar={onCerrar} />
  ) : (
    <EdicionVigente matricula={matricula} cabecera={cabecera} onCerrar={onCerrar} />
  )
}

function EdicionPorComenzar({
  matricula,
  cabecera,
  onCerrar,
}: {
  matricula: MatriculaResponse
  cabecera: React.ReactNode
  onCerrar: () => void
}) {
  const crud = useCrudMatriculas()
  const { data: opciones, isLoading } = useOpcionesMatricula(matricula.idAnio, matricula.idAlumno, matricula.idMatricula)
  const { data: metodos = [] } = useMetodosPago(true)
  const grados = useMemo(() => agruparGrados(opciones?.grados ?? []), [opciones])
  const [seleccion, setSeleccion] = useState<SeleccionSeccion>({
    idNivel: matricula.idNivel,
    idGrado: matricula.idGrado,
    idTurno: matricula.idTurno,
    idGradoSeccion: matricula.idGradoSeccion,
  })
  const [observaciones, setObservaciones] = useState(matricula.observaciones ?? "")
  const [idMetodoPago, setIdMetodoPago] = useState(0)
  const [codigo, setCodigo] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)

  const grado = grupoDe(grados, seleccion.idGrado)
  const cambiaNivel = seleccion.idNivel !== matricula.idNivel && !!grado
  const nuevoMonto = cambiaNivel ? grado?.monto ?? null : null
  const diferencia = nuevoMonto != null ? nuevoMonto - matricula.pagadoNeto : 0
  const metodo = metodos.find((m) => m.idMetodoPago === idMetodoPago)
  const erroresPago = intentado && diferencia !== 0 ? erroresDePago(metodo, codigo, comprobante) : undefined

  async function handleGuardar() {
    setIntentado(true)
    if (!seleccion.idGradoSeccion) {
      toast.error("Selecciona la sección")
      return
    }
    if (cambiaNivel && nuevoMonto == null) {
      toast.error(`El monto de ${grado?.nivel} no está configurado en el módulo Pagos`)
      return
    }
    if (diferencia !== 0) {
      const e = erroresDePago(metodo, codigo, comprobante)
      if (e.metodo || e.codigo || e.comprobante) return
    }
    try {
      await crud.editar.mutateAsync({
        id: matricula.idMatricula,
        data: {
          idGradoSeccion: seleccion.idGradoSeccion,
          idMetodoPago: diferencia !== 0 ? idMetodoPago : null,
          codigoTransaccion: diferencia !== 0 ? codigo.trim() || null : null,
          observaciones: observaciones.trim(),
        },
        comprobante: diferencia !== 0 ? comprobante : null,
      })
      toast.success(
        diferencia > 0
          ? `Matrícula actualizada: se registró la diferencia de ${formatoSoles(diferencia)}`
          : diferencia < 0
            ? `Matrícula actualizada: se registró la devolución de ${formatoSoles(-diferencia)}`
            : "Matrícula actualizada"
      )
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la matrícula")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 pb-1">
        {cabecera}
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : opciones?.bloqueo ? (
          <p className="text-sm text-destructive">{opciones.bloqueo}</p>
        ) : opciones ? (
          <>
            {opciones.ultimoGrado && (
              <p className="text-xs text-muted-foreground">Último grado: {opciones.ultimoGrado}</p>
            )}
            <SelectorSeccion grados={grados} value={seleccion} onChange={setSeleccion} />
          </>
        ) : null}

        {cambiaNivel && diferencia !== 0 && (
          <TarjetaSeccion destacada>
            <div className="mb-3 flex items-center gap-2">
              {diferencia > 0 ? (
                <ArrowUpRight className="size-4 text-brand" />
              ) : (
                <ArrowDownLeft className="size-4 text-brand" />
              )}
              <p className="text-sm font-semibold">{diferencia > 0 ? "Pago de diferencia" : "Devolución"}</p>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Monto etiqueta="Pagado antes" valor={matricula.pagadoNeto} />
              <Monto etiqueta={`Monto de ${grado?.nivel}`} valor={nuevoMonto} />
              <Monto etiqueta={diferencia > 0 ? "Falta pagar" : "Monto devuelto"} valor={Math.abs(diferencia)} />
            </div>
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
          </TarjetaSeccion>
        )}

        <Field>
          <FieldLabel>Observaciones</FieldLabel>
          <FieldContent>
            <Textarea rows={2} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </FieldContent>
        </Field>
      </div>
      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" onClick={handleGuardar} disabled={crud.editar.isPending || !opciones || !!opciones.bloqueo}>
          {crud.editar.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </div>
  )
}

function EdicionVigente({
  matricula,
  cabecera,
  onCerrar,
}: {
  matricula: MatriculaResponse
  cabecera: React.ReactNode
  onCerrar: () => void
}) {
  const crud = useCrudMatriculas()
  const { data: opciones } = useOpcionesMatricula(matricula.idAnio, matricula.idAlumno, matricula.idMatricula)
  // Solo otras secciones de su mismo grado: el grado ya no cambia con el año en curso.
  const secciones = (opciones?.grados ?? [])
    .filter((g) => g.idNivel === matricula.idNivel && g.grado === matricula.grado)
    .flatMap((g) => g.secciones)
  const [idGradoSeccion, setIdGradoSeccion] = useState(matricula.idGradoSeccion)
  const [motivo, setMotivo] = useState("")
  const [observaciones, setObservaciones] = useState(matricula.observaciones ?? "")
  const [intentado, setIntentado] = useState(false)
  const cambiaSeccion = idGradoSeccion !== matricula.idGradoSeccion
  const enviando = crud.cambioSeccion.isPending || crud.editar.isPending

  async function handleGuardar() {
    setIntentado(true)
    if (cambiaSeccion && !motivo.trim()) return
    try {
      if (cambiaSeccion) {
        await crud.cambioSeccion.mutateAsync({ id: matricula.idMatricula, idGradoSeccion, motivo: motivo.trim() })
      }
      if (observaciones.trim() !== (matricula.observaciones ?? "")) {
        await crud.editar.mutateAsync({
          id: matricula.idMatricula,
          data: { observaciones: observaciones.trim() },
          comprobante: null,
        })
      }
      toast.success(cambiaSeccion ? "Sección cambiada" : "Matrícula actualizada")
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la matrícula")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 pb-1">
        {cabecera}
        <p className="text-xs text-muted-foreground">
          Con el año en curso, el grado y el pago ya no cambian. Puedes pasar al alumno a otra sección de su mismo grado.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Sección</FieldLabel>
            <FieldContent>
              <Select value={String(idGradoSeccion)} onValueChange={(v) => setIdGradoSeccion(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {idGradoSeccion === matricula.idGradoSeccion
                      ? `${matricula.seccion} · ${matricula.turno} (actual)`
                      : (() => {
                          const s = secciones.find((x) => x.idGradoSeccion === idGradoSeccion)
                          return s ? `${s.seccion} · ${s.turno}` : ""
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={String(matricula.idGradoSeccion)}>
                      {matricula.seccion} · {matricula.turno} (actual)
                    </SelectItem>
                    {secciones
                      .filter((s) => s.idGradoSeccion !== matricula.idGradoSeccion)
                      .map((s) => (
                        <SelectItem key={s.idGradoSeccion} value={String(s.idGradoSeccion)}>
                          {s.seccion} · {s.turno} · {s.ocupados}/{s.capacidad}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription className="text-xs">Solo secciones con aula y cupo.</FieldDescription>
            </FieldContent>
          </Field>
          {cambiaSeccion && (
            <Field>
              <FieldLabel>Motivo del cambio *</FieldLabel>
              <FieldContent>
                <Input maxLength={150} placeholder="Ej. cambio de turno" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <FieldError errors={intentado && !motivo.trim() ? [{ message: "Escribe el motivo" }] : []} />
              </FieldContent>
            </Field>
          )}
        </div>
        <Field>
          <FieldLabel>Observaciones</FieldLabel>
          <FieldContent>
            <Textarea rows={2} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </FieldContent>
        </Field>
      </div>
      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <Button variant="brand" onClick={handleGuardar} disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </div>
  )
}

function Monto({ etiqueta, valor }: { etiqueta: string; valor: number | null }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="text-sm font-semibold">{formatoSoles(valor)}</p>
    </div>
  )
}
