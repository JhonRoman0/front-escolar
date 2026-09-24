"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, FileDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import {
  CampoAcceso,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useCrudDocentes,
  useDocentes,
  useEliminarFotoDocente,
  useSubirFotoDocente,
} from "@/hooks/use-academico"
import { useConsultarDni } from "@/hooks/use-reniec"
import type {
  DocenteRequest,
  DocenteResponse,
} from "@/lib/api/academico"
import { docenteSchema, type DocenteValues } from "@/lib/schemas/academico"
import { BuscarDniButton } from "@/components/shared/buscar-dni-button"
import { usePuede } from "@/hooks/use-permisos"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfDocentes } from "@/lib/reportes/generar-pdf"
import { generarExcelDocentes } from "@/lib/reportes/generar-excel"
import { generarCsvDocentes } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"

const TIPOS_CONTRATO = ["Nombrado", "Contratado", "CAS"]

export default function DocentesTab() {
  const { data, isLoading, isError, refetch } = useDocentes()
  const crud = useCrudDocentes()
  const puedeCrear = usePuede("DOCENTES", "CREAR")
  const puedeActualizar = usePuede("DOCENTES", "ACTUALIZAR")
  const puedeEliminar = usePuede("DOCENTES", "ELIMINAR")
  const puedeExportar = usePuede("DOCENTES", "IMPRIMIR_EXPORTAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<DocenteResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("")
  const [filtroContrato, setFiltroContrato] = useState("")

  const opcionesEspecialidad = useMemo(() => {
    const vals = new Set<string>()
    for (const d of data ?? []) {
      if (d.especialidad) vals.add(d.especialidad)
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }))
  }, [data])

  const opcionesContrato = useMemo(() => {
    const vals = new Set<string>()
    for (const d of data ?? []) {
      if (d.tipoContrato) vals.add(d.tipoContrato)
    }
    return [...vals].sort().map((v) => ({ value: v, label: v }))
  }, [data])

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.docentes(inicio, fin, {
      especialidad: filtros.especialidad || undefined,
      tipoContrato: filtros.tipoContrato || undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay docentes en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfDocentes({ datos, inicio, fin })
    else if (formato === "excel") generarExcelDocentes({ datos, inicio, fin })
    else generarCsvDocentes({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  async function handleEliminar(docente: DocenteResponse) {
    try {
      await crud.eliminar.mutateAsync(docente.idDocente)
      toast.success(
        `Docente "${docente.nombre} ${docente.apellidoPat}" eliminado`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Docentes</h2>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Cada docente crea su usuario de acceso (código D2026####).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puedeExportar && (
              <Button variant="outline" size="sm" onClick={() => setReporteOpen(true)}>
                <FileDown data-icon="inline-start" />
                Generar reporte
              </Button>
            )}
            {puedeCrear && (
              <Button
                className="bg-[#274CB4] text-white hover:bg-[#274CB4]/85"
                onClick={() => {
                  setEditando(null)
                  setDialogOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Nuevo docente
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Docente</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={6} />
            ) : isError ? (
              <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={6} mensaje="Aún no hay docentes." />
            ) : (
              data.map((docente) => {
                const nombreCompleto = `${docente.nombre} ${docente.apellidoPat} ${docente.apellidoMat}`.trim()
                const iniciales = `${docente.nombre[0] ?? ""}${docente.apellidoPat[0] ?? ""}`.toUpperCase()
                return (
                  <TableRow key={docente.idDocente}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {docente.urlFoto ? (
                            <AvatarImage
                              src={docente.urlFoto}
                              alt={nombreCompleto}
                            />
                          ) : (
                            <AvatarFallback className="rounded-full text-xs">
                              {iniciales}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{nombreCompleto}</p>
                          <p className="text-xs text-muted-foreground">
                            {docente.documentoIdentidad || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {docente.codigo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {docente.gmail || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {docente.tipoContrato || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={docente.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar ${nombreCompleto}`}
                            onClick={() => {
                              setEditando(docente)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar docente"
                            descripcion={
                              docente.accesoId !== 2
                                ? "Solo se pueden eliminar docentes INACTIVOS. Primero suspenda al docente."
                                : `Se eliminará el acceso de "${nombreCompleto}". Esta acción no se puede deshacer.`
                            }
                            onConfirm={() => handleEliminar(docente)}
                            disabled={docente.accesoId !== 2}
                          />
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

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        <DocenteFormDialog
          key={editando?.idDocente ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          docente={editando}
        />

        <ReporteModal
          open={reporteOpen}
          onOpenChange={setReporteOpen}
          titulo="Reporte de docentes"
          descripcion="Descarga el listado de docentes del rango en PDF, Excel o CSV."
          presets={["ultimos_7", "este_mes", "personalizado"]}
          filtros={[
            {
              id: "especialidad",
              label: "Especialidad",
              opciones: opcionesEspecialidad,
              valor: filtroEspecialidad,
              onChange: setFiltroEspecialidad,
            },
            {
              id: "tipoContrato",
              label: "Tipo de contrato",
              opciones: opcionesContrato,
              valor: filtroContrato,
              onChange: setFiltroContrato,
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}

function DocenteFormDialog({
  open,
  onOpenChange,
  docente,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente?: DocenteResponse | null
}) {
  const crud = useCrudDocentes()
  const subirFoto = useSubirFotoDocente()
  const eliminarFoto = useEliminarFotoDocente()
  const consultarDni = useConsultarDni()
  const esEdicion = !!docente

  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    docente?.urlFoto ?? null
  )
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const form = useForm<DocenteValues>({
    resolver: zodResolver(docenteSchema),
    defaultValues: {
      nombre: docente?.nombre ?? "",
      apellidoPat: docente?.apellidoPat ?? "",
      apellidoMat: docente?.apellidoMat ?? "",
      documentoIdentidad: docente?.documentoIdentidad ?? "",
      contraseña: "",
      gmail: docente?.gmail ?? "",
      fechaNaci: docente?.fechaNaci ?? "",
      tipoContrato: docente?.tipoContrato ?? "",
      fechaContratacion: docente?.fechaContratacion ?? "",
      especialidad: docente?.especialidad ?? "",
      gradoAcademico: docente?.gradoAcademico ?? "",
      accesoId: docente?.accesoId ?? 1,
    },
  })

  function buildRequest(values: DocenteValues): DocenteRequest {
    const data: DocenteRequest = {
      nombre: values.nombre,
      apellidoPat: values.apellidoPat,
      apellidoMat: values.apellidoMat,
      documentoIdentidad: values.documentoIdentidad || null,
      gmail: values.gmail || null,
      fechaNaci: values.fechaNaci,
      tipoContrato: values.tipoContrato || null,
      especialidad: values.especialidad || null,
      gradoAcademico: values.gradoAcademico || null,
    }
    if (values.fechaContratacion) data.fechaContratacion = values.fechaContratacion
    if (esEdicion) {
      data.accesoId = values.accesoId
    }
    if (values.contraseña) {
      data.contraseña = values.contraseña
    }
    return data
  }

  function handleArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFotoNueva(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleQuitarFoto() {
    if (!docente) return
    try {
      await eliminarFoto.mutateAsync(docente.idUsuario)
      setPreview(null)
      setFotoNueva(null)
      if (inputFotoRef.current) inputFotoRef.current.value = ""
      toast.success("Foto eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al quitar la foto")
    }
  }

  async function handleBuscarDni() {
    const dni = form.getValues("documentoIdentidad")?.trim()
    if (!dni || !/^\d{8}$/.test(dni)) {
      toast.error("Ingresa un DNI de 8 dígitos")
      return
    }
    try {
      const r = await consultarDni.mutateAsync(dni)
      form.setValue("nombre", r.nombres ?? "", { shouldValidate: true })
      form.setValue("apellidoPat", r.apellidoPaterno ?? "", { shouldValidate: true })
      form.setValue("apellidoMat", r.apellidoMaterno ?? "", { shouldValidate: true })
      const origen = r.origen === "LOCAL" ? "Registro local" : "RENIEC"
      toast.success(`Datos cargados (${origen})`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo consultar el DNI")
    }
  }

  async function onSubmit(values: DocenteValues) {
    if (!esEdicion && !values.contraseña) {
      toast.error("La contraseña es obligatoria (mín 8: mayúscula, número y símbolo)")
      return
    }
    const guardando = toast.loading(
      esEdicion ? "Guardando docente..." : "Creando docente..."
    )
    try {
      if (esEdicion && docente) {
        await crud.actualizar.mutateAsync({
          id: docente.idDocente,
          data: buildRequest(values),
        })
        if (fotoNueva) {
          await subirFoto.mutateAsync({
            idUsuario: docente.idUsuario,
            file: fotoNueva,
          })
        }
        toast.success("Docente actualizado", { id: guardando })
      } else {
        const creado = await crud.crear.mutateAsync(buildRequest(values))
        if (fotoNueva) {
          try {
            await subirFoto.mutateAsync({
              idUsuario: creado.idUsuario,
              file: fotoNueva,
            })
          } catch {
            toast.warning("Docente creado, pero no se pudo subir la foto.", {
              id: guardando,
            })
          }
        } else {
          toast.success("Docente creado", { id: guardando })
        }
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar",
        { id: guardando }
      )
    }
  }

  const enviando =
    crud.crear.isPending ||
    crud.actualizar.isPending ||
    subirFoto.isPending

  const iniciales = `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {esEdicion ? "Editar docente" : "Nuevo docente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3">
              <Avatar className="size-16 rounded-full">
                {preview ? (
                  <AvatarImage src={preview} alt="Foto del docente" />
                ) : (
                  <AvatarFallback className="rounded-full text-lg">{iniciales || "D"}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={handleArchivo} />
                <Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}>
                  <Camera data-icon="inline-start" />
                  {fotoNueva || preview ? "Cambiar foto" : "Subir foto"}
                </Button>
                {(fotoNueva || (esEdicion && docente?.urlFoto)) && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleQuitarFoto} disabled={eliminarFoto.isPending}>
                    <Trash2 className="text-destructive" data-icon="inline-start" />
                    Quitar
                  </Button>
                )}
              </div>
            </div>

            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Identidad</FieldLegend>
              <FieldDescription className="text-xs">Ingresa el DNI primero y usa Buscar para autocompletar desde RENIEC/BD.</FieldDescription>
              <div className="flex flex-col gap-4">
                <Controller
                  control={form.control}
                  name="documentoIdentidad"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>DNI — Documento de identidad</FieldLabel>
                      <FieldContent>
                        <div className="flex gap-2">
                          <Input placeholder="8 dígitos" maxLength={8} autoFocus {...field} className="flex-1" />
                          <BuscarDniButton dni={field.value} cargando={consultarDni.isPending} onBuscar={handleBuscarDni} />
                        </div>
                        <FieldDescription className="text-xs">8 dígitos exactos. Busca en BD local o RENIEC.</FieldDescription>
                        <FieldError errors={[form.formState.errors.documentoIdentidad]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Controller
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Nombres *</FieldLabel>
                        <FieldContent>
                          <Input placeholder="María" {...field} />
                          <FieldError errors={[form.formState.errors.nombre]} />
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="apellidoPat"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Ap. paterno *</FieldLabel>
                        <FieldContent>
                          <Input placeholder="López" {...field} />
                          <FieldError errors={[form.formState.errors.apellidoPat]} />
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="apellidoMat"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Ap. materno *</FieldLabel>
                        <FieldContent>
                          <Input placeholder="Ramírez" {...field} />
                          <FieldError errors={[form.formState.errors.apellidoMat]} />
                        </FieldContent>
                      </Field>
                    )}
                  />
                </div>
                <Controller
                  control={form.control}
                  name="fechaNaci"
                  render={({ field }) => (
                    <Field className="sm:max-w-[240px]">
                      <FieldLabel>Fecha de nacimiento *</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...field} />
                        <FieldError errors={[form.formState.errors.fechaNaci]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Contacto</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                <Controller
                  control={form.control}
                  name="gmail"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Correo electrónico *</FieldLabel>
                      <FieldContent>
                        <Input type="email" placeholder="docente@correo.com" {...field} />
                        <FieldDescription className="text-xs">Obligatorio para notificaciones.</FieldDescription>
                        <FieldError errors={[form.formState.errors.gmail]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Datos laborales</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Controller
                  control={form.control}
                  name="fechaContratacion"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Fecha de contratación</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...field} />
                        <FieldError errors={[form.formState.errors.fechaContratacion]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="tipoContrato"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Tipo de contrato</FieldLabel>
                      <FieldContent>
                        <Input placeholder="Nombrado" list="tipos-contrato" {...field} />
                        <datalist id="tipos-contrato">
                          {TIPOS_CONTRATO.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                        <FieldError errors={[form.formState.errors.tipoContrato]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="especialidad"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Especialidad</FieldLabel>
                      <FieldContent>
                        <Input placeholder="Matemática" {...field} />
                        <FieldError errors={[form.formState.errors.especialidad]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="gradoAcademico"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Grado académico</FieldLabel>
                      <FieldContent>
                        <Input placeholder="Licenciatura" {...field} />
                        <FieldError errors={[form.formState.errors.gradoAcademico]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            <FieldSet>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="contraseña"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Contraseña</FieldLabel>
                      <FieldContent>
                        <Input
                          type="password"
                          placeholder={esEdicion ? "Dejar en blanco para no cambiar" : "Mín 8: mayúscula, número y símbolo"}
                          {...field}
                        />
                        <FieldError errors={[form.formState.errors.contraseña]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                {esEdicion && (
                  <Controller
                    control={form.control}
                    name="accesoId"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Estado</FieldLabel>
                        <FieldContent>
                          <CampoAcceso value={field.value} onChange={field.onChange} />
                        </FieldContent>
                      </Field>
                    )}
                  />
                )}
              </div>
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {esEdicion ? "Guardar cambios" : "Crear docente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}