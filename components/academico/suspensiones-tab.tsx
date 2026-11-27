"use client"

import { FiltrosCambiosDocente, opcionesFiltro } from "./filtros-cambios-docente"
import { paginarFilas, TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { coincideBusqueda, tokensBusqueda } from "@/lib/busqueda"

import { SelectorDocente } from "./selector-docente"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Ban, Check, Eye, MessageSquareText, Pencil, StopCircle } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import SuspensionDetalleDialog from "@/components/academico/suspension-detalle-dialog"
import {
  ESTADO_SUSPENSION,
  ETIQUETA_ESTADO_SUSPENSION,
  VARIANTE_ESTADO_SUSPENSION,
  estadoSuspension,
} from "@/components/academico/cambios-docente-constantes"
import {
  useActualizarSuspension,
  useCancelarSuspension,
  useCrearSuspension,
  useDocentes,
  useFinalizarSuspension,
  useSuspensiones,
} from "@/hooks/use-academico"
import { usePuede, usePuedeLeer } from "@/hooks/use-permisos"
import type {
  SuspensionRequest,
  SuspensionResponse,
} from "@/lib/api/academico"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"
import { REGEX_FECHA } from "@/lib/schemas/academico"

const suspensionSchema = z
  .object({
    idDocente: z.number().int().min(1, "Selecciona un docente"),
    idSustituto: z.number().int().min(1).optional(),
    motivo: z.string().min(1, "El motivo es requerido").max(100),
    motivoDetalle: z.string().max(300).optional(),
    fechaInicio: z.string().regex(REGEX_FECHA, "Fecha requerida (aaaa-mm-dd)"),
    fechaFin: z
      .string()
      .regex(REGEX_FECHA, "Fecha requerida (aaaa-mm-dd)")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fechaFin && data.fechaFin < data.fechaInicio) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      })
    }
  })

type SuspensionFormValues = z.infer<typeof suspensionSchema>

function valoresIniciales(
  suspension?: SuspensionResponse | null
): SuspensionFormValues {
  return {
    idDocente: suspension?.idDocente ?? 0,
    idSustituto: suspension?.idSustituto ?? undefined,
    motivo: suspension?.motivo ?? "",
    motivoDetalle: suspension?.motivoDetalle ?? "",
    fechaInicio: suspension?.fechaInicio ?? fechaHoyISO(),
    fechaFin: suspension?.fechaFin ?? "",
  }
}

type Formulario = { suspension?: SuspensionResponse } | null

export default function SuspensionesTab() {
  const [formulario, setFormulario] = useState<Formulario>(null)
  const [detalle, setDetalle] = useState<SuspensionResponse | null>(null)
  const [cancelando, setCancelando] = useState<SuspensionResponse | null>(null)

  const puedeLeer = usePuedeLeer("SUSPENSIONES_DOCENTE")
  const puedeCrear = usePuede("SUSPENSIONES_DOCENTE", "CREAR")
  const puedeActualizar = usePuede("SUSPENSIONES_DOCENTE", "ACTUALIZAR")
  const { data: suspensiones = [], isLoading, isError, refetch } = useSuspensiones(puedeLeer)
  const { data: docentes = [] } = useDocentes(!!formulario)
  const finalizar = useFinalizarSuspension()
  const cancelar = useCancelarSuspension()

  async function handleFinalizar(id: number) {
    try {
      const respuesta = await finalizar.mutateAsync({ id })
      if (estadoSuspension(respuesta) === ESTADO_SUSPENSION.VIGENTE) {
        toast.error(respuesta.motivoIncidencia ?? "La devolución sigue pendiente.")
        return
      }
      toast.success("Suspensión finalizada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al finalizar")
    }
  }

  async function handleCancelar() {
    if (!cancelando) return
    try {
      await cancelar.mutateAsync({ id: cancelando.idSuspension })
      toast.success("Suspensión cancelada")
      setCancelando(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la suspensión")
    }
  }

  const [pagina, setPagina] = useState(0)
  const [busqueda, buscar] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const tokens = tokensBusqueda(busqueda)
  const visibles = suspensiones.filter(suspension => (!estadoFiltro || estadoSuspension(suspension) === estadoFiltro)
    && coincideBusqueda([suspension.docente, suspension.sustituto], tokens))
  const paginacion = paginarFilas(visibles, pagina)

  const docentesParaFormulario = docentes.map((docente) => ({
    id: docente.idDocente,
    nombre: `${docente.nombre} ${docente.apellidoPat} ${docente.apellidoMat}`,
  }))

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderSeccion
          titulo="Suspensiones de docente"
          descripcion="Registra suspensiones y sustituciones temporales de docentes."
          icono={StopCircle}
          acciones={
            <BotonNuevo
              texto="Nueva suspensión"
              puedeCrear={puedeCrear}
              onClick={() => setFormulario({})}
            />
          }
        />

        <FiltrosCambiosDocente busqueda={busqueda} onBuscar={buscar} placeholder="Buscar docente o sustituto"
          filtros={[
            { label: "Estado", value: estadoFiltro, onValueChange: setEstadoFiltro, options: opcionesFiltro(ETIQUETA_ESTADO_SUSPENSION) },
          ]}
          reiniciarPagina={() => setPagina(0)}
          limpiar={() => { buscar(""); setEstadoFiltro("") }}
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead>Sustituto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={7} />
              ) : isError ? (
                <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !visibles.length ? (
                <MensajeSinDatos columnas={7} mensaje="Aún no hay suspensiones registradas." />
              ) : (
                paginacion.content.map((suspension) => {
                  const estado = estadoSuspension(suspension)
                  const programada = estado === ESTADO_SUSPENSION.PROGRAMADA
                  const vigente = estado === ESTADO_SUSPENSION.VIGENTE
                  const puedeEditar = suspension.puedeEditar ?? (programada || vigente)
                  const puedeCancelar = suspension.puedeCancelar ?? programada
                  const puedeFinalizar = suspension.puedeFinalizar ?? vigente
                  const conIncidencia = Boolean(
                    suspension.incidencia ||
                      suspension.motivoIncidencia?.trim() ||
                      suspension.motivoResolucion?.trim()
                  )
                  return (
                    <TableRow key={suspension.idSuspension}>
                      <TableCell className="font-medium">{suspension.docente}</TableCell>
                      <TableCell>{suspension.sustituto?.trim() || "Sin sustituto"}</TableCell>
                      <TableCell className="text-xs">{suspension.motivo}</TableCell>
                      <TableCell className="text-xs">
                        {formatearFecha(suspension.fechaInicio)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatearFecha(suspension.fechaFin)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={VARIANTE_ESTADO_SUSPENSION[estado]}>
                          {ETIQUETA_ESTADO_SUSPENSION[estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {puedeLeer && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Ver detalle"
                              aria-label={`Ver detalle de la suspensión de ${suspension.docente}`}
                              onClick={() => setDetalle(suspension)}
                            >
                              <Eye />
                            </Button>
                          )}
                          {puedeLeer && conIncidencia && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Ver incidencia"
                              aria-label={`Ver incidencia de la suspensión de ${suspension.docente}`}
                              onClick={() => setDetalle(suspension)}
                            >
                              <MessageSquareText />
                            </Button>
                          )}
                          {puedeActualizar && puedeEditar && (programada || vigente) && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Editar"
                              aria-label={`Editar suspensión de ${suspension.docente}`}
                              onClick={() => setFormulario({ suspension })}
                            >
                              <Pencil />
                            </Button>
                          )}
                          {puedeActualizar && programada && puedeCancelar && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Cancelar"
                              aria-label={`Cancelar suspensión programada de ${suspension.docente}`}
                              onClick={() => setCancelando(suspension)}
                            >
                              <Ban />
                            </Button>
                          )}
                          {puedeActualizar && vigente && puedeFinalizar && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Finalizar"
                              aria-label={`Finalizar suspensión de ${suspension.docente}`}
                              disabled={finalizar.isPending}
                              onClick={() => void handleFinalizar(suspension.idSuspension)}
                            >
                              <Check />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablaPaginacion data={isLoading || isError ? null : paginacion} onPage={setPagina} />

        {isError && <BotonReintentar refetch={() => void refetch()} />}

        {formulario && (
          <SuspensionFormDialog
            key={formulario.suspension?.idSuspension ?? "crear"}
            open
            onOpenChange={(abierto) => !abierto && setFormulario(null)}
            suspension={formulario.suspension}
            docentes={docentesParaFormulario}
          />
        )}

        <SuspensionDetalleDialog
          open={!!detalle}
          onOpenChange={(abierto) => !abierto && setDetalle(null)}
          suspension={detalle}
        />

        <Dialog open={!!cancelando} onOpenChange={(abierto) => !abierto && setCancelando(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Cancelar suspensión</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-muted-foreground">
                Se cancelará la suspensión programada de {cancelando?.docente}. Esta acción no se
                puede deshacer.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCancelando(null)}>
                Cerrar
              </Button>
              <Button
                variant="brand"
                disabled={cancelar.isPending}
                onClick={() => void handleCancelar()}
              >
                Confirmar cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function SuspensionFormDialog({
  open,
  onOpenChange,
  suspension,
  docentes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suspension?: SuspensionResponse
  docentes: { id: number; nombre: string }[]
}) {
  const crear = useCrearSuspension()
  const actualizar = useActualizarSuspension()
  const esEdicion = !!suspension
  const form = useForm<SuspensionFormValues>({
    resolver: zodResolver(suspensionSchema),
    defaultValues: valoresIniciales(suspension),
  })

  const idDocenteSeleccionado = useWatch({ control: form.control, name: "idDocente" })

  function cerrar() {
    form.reset(valoresIniciales(suspension))
    onOpenChange(false)
  }

  async function onSubmit(values: SuspensionFormValues) {
    const data: SuspensionRequest = {
      idDocente: values.idDocente,
      motivo: values.motivo,
      motivoDetalle: values.motivoDetalle || null,
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin || null,
    }
    if (values.idSustituto) data.idSustituto = values.idSustituto

    try {
      if (esEdicion) {
        await actualizar.mutateAsync({ id: suspension!.idSuspension, data, vigente: suspension?.estado === ESTADO_SUSPENSION.VIGENTE })
      } else {
        await crear.mutateAsync(data)
      }
      toast.success(
        esEdicion ? "Suspensión actualizada" : "Suspensión registrada"
      )
      cerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la suspensión")
    }
  }

  const pendiente = crear.isPending || actualizar.isPending

  return (
    <Dialog open={open} onOpenChange={(siguiente) => !siguiente && cerrar()}>
      <DialogContent size="lg" scroll="sticky">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar suspensión" : "Nueva suspensión"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4" noValidate>
          <DialogBody className="space-y-4 pb-6">
            {esEdicion && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Solo puedes editar el motivo, las observaciones y la fecha de fin.
              </p>
            )}

            {!esEdicion && (
              <>
                <Controller
                  control={form.control}
                  name="idDocente"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Docente a suspender</FieldLabel>
                      <FieldContent>
                        <SelectorDocente docentes={docentes} valor={field.value} etiqueta="Docente a suspender"
                          onChange={(id) => {
                            field.onChange(id ?? 0)
                            if (id === form.getValues("idSustituto")) form.setValue("idSustituto", undefined)
                          }}
                        />
                        <FieldError errors={[form.formState.errors.idDocente]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="idSustituto"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Docente sustituto (opcional)</FieldLabel>
                      <FieldContent>
                        <SelectorDocente
                          docentes={docentes.filter((docente) => docente.id !== idDocenteSeleccionado)}
                          valor={field.value}
                          etiqueta="Docente sustituto"
                          onChange={(id) => field.onChange(id ?? undefined)}
                          sinSustituto
                        />
                      </FieldContent>
                    </Field>
                  )}
                />
              </>
            )}

            <FieldGroup columnas={2}>
              <Controller
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Motivo</FieldLabel>
                    <FieldContent>
                      <Input placeholder="Enfermedad, licencia, etc." {...field} />
                      <FieldError errors={[form.formState.errors.motivo]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="motivoDetalle"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Observaciones (opcional)</FieldLabel>
                    <FieldContent>
                      <Input placeholder="Descripción adicional" {...field} />
                    </FieldContent>
                  </Field>
                )}
              />
              {!esEdicion && (
                <Controller
                  control={form.control}
                  name="fechaInicio"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Fecha de inicio</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...field} />
                        <FieldError errors={[form.formState.errors.fechaInicio]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              )}
              <Controller
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Fecha de fin (opcional)</FieldLabel>
                    <FieldContent>
                      <Input type="date" {...field} />
                      <FieldError errors={[form.formState.errors.fechaFin]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </FieldGroup>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <BotonGuardar
              etiqueta={esEdicion ? "Guardar cambios" : "Registrar suspensión"}
              enviando={pendiente}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
