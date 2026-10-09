"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { FileDown, Loader2, Pencil } from "lucide-react"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { BloqueFoto } from "@/components/shared/bloque-foto"
import { CampoChip } from "@/components/shared/campo-chip"
import { CampoContrasena } from "@/components/shared/campo-contrasena"
import { CamposNombres } from "@/components/shared/campos-nombres"
import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import {
  useActualizarDocente,
  useDocentes,
  useEliminarDocente,
  useEliminarFotoDocente,
  useGradosAcademicos,
  useNiveles,
  useSubirFotoDocente,
  useTiposContrato,
} from "@/hooks/use-academico"
import { useConsultarDni } from "@/hooks/use-reniec"
import type {
  DocenteRequest,
  DocenteResponse,
} from "@/lib/api/academico"
import { docenteSchema, type DocenteValues } from "@/lib/schemas/academico"
import { CampoDni } from "@/components/shared/campo-dni"
import { usePuede } from "@/hooks/use-permisos"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfDocentes } from "@/lib/reportes/generar-pdf"
import { generarExcelDocentes } from "@/lib/reportes/generar-excel"
import { generarCsvDocentes } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"

export default function DocentesTab() {
  const { data, isLoading, isError, refetch } = useDocentes()
  const eliminar = useEliminarDocente()
  const { data: tiposContrato = [] } = useTiposContrato()
  const puedeActualizar = usePuede("DOCENTES", "ACTUALIZAR")
  const puedeEliminar = usePuede("DOCENTES", "ELIMINAR")
  const puedeExportar = usePuede("DOCENTES", "IMPRIMIR_EXPORTAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<DocenteResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroContrato, setFiltroContrato] = useState("")

  const opcionesContrato = useMemo(
    () =>
      tiposContrato.map((t) => ({
        value: String(t.idTipoContrato),
        label: t.nombre,
      })),
    [tiposContrato]
  )

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.docentes(inicio, fin, {
      tipoContratoId: filtros.tipoContrato
        ? Number(filtros.tipoContrato)
        : undefined,
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
      await eliminar.mutateAsync(docente.idDocente)
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
              Gestión de docentes y su información de contacto.
            </p>
          </div>
<div className="flex flex-wrap items-center gap-2">
            {puedeExportar && (
              <Button variant="outline" size="sm" onClick={() => setReporteOpen(true)}>
                <FileDown data-icon="inline-start" />
                Generar reporte
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
              <TableHead>Nivel</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay docentes." />
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
                        {docente.tipoContratoNombre || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {docente.niveles.length > 0
                          ? docente.niveles.map((n) => n.nombre).join(", ")
                          : "—"}
                      </span>
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
  const actualizar = useActualizarDocente()
  const subirFoto = useSubirFotoDocente()
  const eliminarFoto = useEliminarFotoDocente()
  const consultarDni = useConsultarDni()
  const { data: tiposContrato = [] } = useTiposContrato()
  const { data: gradosAcademicos = [] } = useGradosAcademicos()
  const { data: niveles = [] } = useNiveles()
  const esEdicion = !!docente

  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    docente?.urlFoto ?? null
  )

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
      tipoContratoId: docente?.tipoContratoId ?? null,
      fechaContratacion: docente?.fechaContratacion ?? "",
      gradoAcademicoId: docente?.gradoAcademicoId ?? null,
      niveles: docente?.niveles.map((n) => n.idNivel) ?? [],
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
      tipoContratoId: values.tipoContratoId ?? null,
      gradoAcademicoId: values.gradoAcademicoId ?? null,
      niveles: values.niveles,
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

  function handleArchivo(file: File) {
    setFotoNueva(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleQuitarFoto() {
    if (!docente) return
    try {
      await eliminarFoto.mutateAsync(docente.idUsuario)
      setPreview(null)
      setFotoNueva(null)
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
      const mensaje = r.origen === "RENIEC" || r.origen === "CACHE" ? "Datos completados desde RENIEC" : "Datos completados automáticamente"
      toast.success(mensaje)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo consultar el DNI")
    }
  }

  async function onSubmit(values: DocenteValues) {
    if (!docente) return
    const guardando = toast.loading("Guardando docente...")
    try {
      await actualizar.mutateAsync({
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
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar",
        { id: guardando }
      )
    }
  }

  const enviando = actualizar.isPending || subirFoto.isPending

  const iniciales = `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Editar docente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto">
            <TarjetaSeccion>
              <FieldSet>
                <FieldLegend>Identidad</FieldLegend>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <BloqueFoto
                    preview={preview}
                    alt="Foto del docente"
                    iniciales={iniciales}
                    fallback="D"
                    hayFotoNueva={!!fotoNueva}
                    mostrarQuitar={!!(fotoNueva || (esEdicion && docente?.urlFoto))}
                    quitarDisabled={eliminarFoto.isPending}
                    notaSinFoto={esEdicion && docente && !docente.urlFoto ? "Sin foto" : null}
                    onChangeArchivo={handleArchivo}
                    onQuitar={handleQuitarFoto}
                  />
                  <div className="grid min-w-0 flex-1 gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="documentoIdentidad"
                        render={({ field }) => (
                          <CampoDni
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            inputRef={field.ref}
                            cargando={consultarDni.isPending}
                            onBuscar={handleBuscarDni}
                            error={form.formState.errors.documentoIdentidad}
                            autoFocus
                            label="DNI *"
                            placeholder="12345678"
                          />
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="fechaNaci"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Fecha de nacimiento *</FieldLabel>
                            <FieldContent>
                              <Input type="date" {...field} />
                              <FieldError errors={[form.formState.errors.fechaNaci]} />
                            </FieldContent>
                          </Field>
                        )}
                      />
                    </div>
                    <CamposNombres control={form.control} errors={form.formState.errors} />
                  </div>
                </div>
              </FieldSet>
            </TarjetaSeccion>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <TarjetaSeccion className="min-w-0">
                <FieldSet>
                  <FieldLegend>Contacto</FieldLegend>
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
              </TarjetaSeccion>

              <TarjetaSeccion className="min-w-0">
                <FieldSet>
                  <FieldLegend>Acceso</FieldLegend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="contraseña"
                      render={({ field }) => (
                        <CampoContrasena
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          inputRef={field.ref}
                          error={form.formState.errors.contraseña}
                          label="Contraseña (opcional)"
                          descripcion="Si la dejas vacía, se conserva la contraseña actual."
                        />
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
              </TarjetaSeccion>
            </div>

            <TarjetaSeccion destacada>
              <FieldSet>
                <FieldLegend>Datos laborales</FieldLegend>
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
                  name="tipoContratoId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Tipo de contrato</FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? null : Number(v))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {tiposContrato.find((t) => t.idTipoContrato === field.value)?.nombre ?? "Selecciona..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {tiposContrato.map((t) => (
                                <SelectItem key={t.idTipoContrato} value={String(t.idTipoContrato)}>
                                  {t.nombre}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[form.formState.errors.tipoContratoId]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="gradoAcademicoId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Grado académico</FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? null : Number(v))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {gradosAcademicos.find((g) => g.idGradoAcademico === field.value)?.nombre ?? "Selecciona..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {gradosAcademicos.map((g) => (
                                <SelectItem key={g.idGradoAcademico} value={String(g.idGradoAcademico)}>
                                  {g.nombre}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[form.formState.errors.gradoAcademicoId]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
              <Controller
                control={form.control}
                name="niveles"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Niveles que atiende *</FieldLabel>
                    <FieldDescription className="text-xs">
                      Selecciona al menos un nivel.
                    </FieldDescription>
                    <FieldContent>
                      {!niveles.length ? (
                        <p className="text-sm text-muted-foreground">
                          No hay niveles registrados.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {niveles.map((nivel) => {
                            const checked = field.value.includes(nivel.idNivel)
                            return (
                              <CampoChip
                                key={nivel.idNivel}
                                checked={checked}
                                onCheckedChange={(v) =>
                                  field.onChange(
                                    v
                                      ? [...field.value, nivel.idNivel]
                                      : field.value.filter((id: number) => id !== nivel.idNivel)
                                  )
                                }
                              >
                                {nivel.nombre}
                              </CampoChip>
                            )
                          })}
                        </div>
                      )}
                    </FieldContent>
                    <FieldError errors={[form.formState.errors.niveles]} />
                  </Field>
                )}
              />
            </FieldSet>
            </TarjetaSeccion>
          </FieldGroup>

          <DialogFooter className="shrink-0">
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