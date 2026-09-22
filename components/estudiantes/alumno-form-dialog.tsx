"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { CampoAcceso } from "@/components/shared/table-helpers"
import {
  useApoderadoPorDocumento,
  useCrudAlumnos,
  useEliminarFotoAlumno,
  useEliminarFotoApoderado,
  useSubirFotoAlumno,
  useSubirFotoApoderado,
} from "@/hooks/use-estudiantes"
import { ApiError } from "@/lib/api"
import type {
  AlumnoRequest,
  AlumnoResponse,
  ApoderadoResponse,
} from "@/lib/api/estudiantes"
import {
  alumnoSchema,
  apoderadoDefault,
  estaVacioApoderado,
  type AlumnoValues,
  type ApoderadoValues,
} from "@/lib/schemas/estudiantes"

interface AlumnoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno?: AlumnoResponse | null
  /** Se invoca tras crear un alumno (útil para auto-seleccionarlo desde Matrícula). */
  onCreado?: (alumno: AlumnoResponse) => void
  /** Pre-rellena campos al crear (p. ej. documentoIdentidad desde Matrícula). */
  initialValues?: Partial<Pick<AlumnoValues, "documentoIdentidad">>
}

function construirApoderadosPrecargados(
  apoderados: ApoderadoResponse[]
): ApoderadoValues[] {
  const pre = apoderados.map<ApoderadoValues>((ap) => ({
    _modo: ap.idUsuario != null ? "reutilizar" : "crear",
    _idUsuario: ap.idUsuario ?? undefined,
    _urlFoto: ap.urlFoto ?? undefined,
    nombre: ap.nombre,
    apellidoPat: ap.apellidoPat,
    apellidoMat: ap.apellidoMat,
    gmail: ap.gmail ?? "",
    contraseña: "",
    fechaNaci: ap.fechaNaci ?? "",
    documentoIdentidad: ap.documentoIdentidad ?? "",
    celular: ap.celular ?? "",
    direccion: ap.direccion ?? "",
    parentesco: ap.parentesco ?? "",
  }))
  return pre.length ? pre : [{ ...apoderadoDefault }]
}

export function AlumnoFormDialog({
  open,
  onOpenChange,
  alumno,
  onCreado,
  initialValues,
}: AlumnoFormDialogProps) {
  const crud = useCrudAlumnos()
  const subirFoto = useSubirFotoAlumno()
  const eliminarFoto = useEliminarFotoAlumno()
  const subirFotoApoderado = useSubirFotoApoderado()
  const esEdicion = !!alumno

  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(alumno?.urlFoto ?? null)
  const [modificarApoderados, setModificarApoderados] = useState(esEdicion)
  const [slotSecundario, setSlotSecundario] = useState(
    (alumno?.apoderados.length ?? 0) > 1
  )
  const [fotosApoderadoNuevo, setFotosApoderadoNuevo] = useState<
    Record<number, File>
  >({})
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const apoderadosActuales = alumno?.apoderados ?? []

  const form = useForm<AlumnoValues>({
    resolver: zodResolver(alumnoSchema),
    defaultValues: {
      nombre: alumno?.nombre ?? "",
      apellidoPat: alumno?.apellidoPat ?? "",
      apellidoMat: alumno?.apellidoMat ?? "",
      fechaNacimiento: alumno?.fechaNacimiento ?? "",
      direccion: alumno?.direccion ?? "",
      documentoIdentidad:
        alumno?.documentoIdentidad ?? initialValues?.documentoIdentidad ?? "",
      accesoId: alumno?.accesoId ?? 1,
      _quitarApoderados: false,
      apoderados: esEdicion
        ? construirApoderadosPrecargados(apoderadosActuales)
        : [{ ...apoderadoDefault }],
    },
  })

  function precargarApoderados() {
    const pre = construirApoderadosPrecargados(apoderadosActuales)
    form.setValue("apoderados", pre)
    form.setValue("_quitarApoderados", false)
    setSlotSecundario(pre.length > 1)
    setModificarApoderados(true)
  }

  function guardarFotoPendiente(index: number, file: File) {
    setFotosApoderadoNuevo((prev) => ({ ...prev, [index]: file }))
  }

  function quitarFotoPendiente(index: number) {
    setFotosApoderadoNuevo((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  function buildApoderado(values: ApoderadoValues | undefined) {
    if (!values || estaVacioApoderado(values)) return null
    if (values._modo === "reutilizar") {
      return {
        documentoIdentidad: values.documentoIdentidad || null,
        celular: values.celular || null,
        direccion: values.direccion || null,
        parentesco: values.parentesco || null,
      }
    }
    return {
      nombre: values.nombre || null,
      apellidoPat: values.apellidoPat || null,
      apellidoMat: values.apellidoMat || null,
      gmail: values.gmail || null,
      contraseña: values.contraseña || undefined,
      fechaNaci: values.fechaNaci || null,
      documentoIdentidad: values.documentoIdentidad || null,
      celular: values.celular || null,
      direccion: values.direccion || null,
      parentesco: values.parentesco || null,
    }
  }

  function buildRequest(values: AlumnoValues): AlumnoRequest {
    const data: AlumnoRequest = {
      nombre: values.nombre,
      apellidoPat: values.apellidoPat,
      apellidoMat: values.apellidoMat,
      fechaNacimiento: values.fechaNacimiento,
      direccion: values.direccion || null,
      documentoIdentidad: values.documentoIdentidad || null,
    }
    if (esEdicion) data.accesoId = values.accesoId

    if (!esEdicion) {
      data.apoderados = (values.apoderados ?? [])
        .map(buildApoderado)
        .filter((a): a is NonNullable<typeof a> => a !== null)
    } else if (modificarApoderados) {
      data.apoderados = values._quitarApoderados
        ? []
        : (values.apoderados ?? []).map(buildApoderado).filter((a): a is NonNullable<typeof a> => a !== null)
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
    if (!alumno) return
    try {
      await eliminarFoto.mutateAsync(alumno.idAlumno)
      setPreview(null)
      setFotoNueva(null)
      if (inputFotoRef.current) inputFotoRef.current.value = ""
      toast.success("Foto eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al quitar la foto")
    }
  }

  async function subirFotosPendientesApoderados(respuesta: AlumnoResponse) {
    const indices = Object.keys(fotosApoderadoNuevo).map(Number)
    if (!indices.length) return
    for (const i of indices) {
      const file = fotosApoderadoNuevo[i]
      const apoderado = respuesta.apoderados?.[i]
      if (!file || apoderado?.idUsuario == null) continue
      try {
        await subirFotoApoderado.mutateAsync({
          idUsuario: apoderado.idUsuario,
          file,
        })
      } catch {
        toast.warning(
          `No se pudo subir la foto del apoderado "${apoderado.nombre} ${apoderado.apellidoPat}".`
        )
      }
    }
  }

  async function onSubmit(values: AlumnoValues) {
    const guardando = toast.loading(
      esEdicion ? "Guardando alumno..." : "Creando alumno..."
    )
    try {
      if (esEdicion && alumno) {
        const actualizado = await crud.actualizar.mutateAsync({
          id: alumno.idAlumno,
          data: buildRequest(values),
        })
        if (fotoNueva) {
          await subirFoto.mutateAsync({ id: alumno.idAlumno, file: fotoNueva })
        }
        await subirFotosPendientesApoderados(actualizado)
        toast.success("Alumno actualizado", { id: guardando })
      } else {
        const creado = await crud.crear.mutateAsync(buildRequest(values))
        if (fotoNueva) {
          try {
            await subirFoto.mutateAsync({ id: creado.idAlumno, file: fotoNueva })
            toast.success("Alumno creado", { id: guardando })
          } catch {
            toast.warning("Alumno creado, pero no se pudo subir la foto.", {
              id: guardando,
            })
          }
        } else {
          toast.success("Alumno creado", { id: guardando })
        }
        await subirFotosPendientesApoderados(creado)
        onCreado?.(creado)
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
    subirFoto.isPending ||
    subirFotoApoderado.isPending

  const iniciales = `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()
  const errorGlobalApoderados = form.formState.errors.apoderados?.message

  function agregarSecundario() {
    const actuales = form.getValues("apoderados") ?? []
    form.setValue("apoderados", [...actuales, { ...apoderadoDefault }])
    form.setValue("_quitarApoderados", false)
    setSlotSecundario(true)
  }

  function quitarSecundario() {
    const actuales = form.getValues("apoderados") ?? []
    form.setValue("apoderados", actuales.slice(0, 1))
    setSlotSecundario(false)
  }

  function quitarTodos() {
    form.setValue("apoderados", [])
    form.setValue("_quitarApoderados", true)
    setSlotSecundario(false)
  }

  const hayApoderados =
    !esEdicion || modificarApoderados

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar alumno" : "Nuevo alumno"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-full">
              {preview ? (
                <AvatarImage src={preview} alt="Foto del alumno" />
              ) : (
                <AvatarFallback className="rounded-full text-lg">
                  {iniciales || "A"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArchivo}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputFotoRef.current?.click()}
              >
                <Camera />
                {fotoNueva || preview ? "Cambiar foto" : "Subir foto"}
              </Button>
              {(fotoNueva || (esEdicion && alumno?.urlFoto)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleQuitarFoto}
                  disabled={eliminarFoto.isPending}
                >
                  <Trash2 className="text-destructive" />
                  Quitar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombres</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Luis" {...field} />
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
                  <FieldLabel>Ap. paterno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="García" {...field} />
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
                  <FieldLabel>Ap. materno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Torres" {...field} />
                    <FieldError errors={[form.formState.errors.apellidoMat]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fechaNacimiento"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError
                      errors={[form.formState.errors.fechaNacimiento]}
                    />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="documentoIdentidad"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Documento de identidad</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="Opcional"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <FieldError
                      errors={[form.formState.errors.documentoIdentidad]}
                    />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <Field>
                <FieldLabel>Dirección</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="Av. Los Pinos 123"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  <FieldError errors={[form.formState.errors.direccion]} />
                </FieldContent>
              </Field>
            )}
          />

          {esEdicion ? (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Apoderados</p>
                  <p className="text-xs text-muted-foreground">
                    {apoderadosActuales.length
                      ? apoderadosActuales
                          .map(
                            (a) =>
                              `${a.nombre} ${a.apellidoPat} ${a.apellidoMat}`.trim()
                          )
                          .join(" · ")
                      : "Sin apoderados registrados"}
                  </p>
                </div>
                <Switch
                  checked={modificarApoderados}
                  onCheckedChange={(checked) => {
                    if (checked) precargarApoderados()
                    else {
                      form.setValue("apoderados", undefined)
                      form.setValue("_quitarApoderados", false)
                      setSlotSecundario(false)
                      setModificarApoderados(false)
                    }
                  }}
                  aria-label="Modificar apoderados"
                />
              </div>
              {!modificarApoderados && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Si no modificas los apoderados, se conservan los actuales.
                </p>
              )}
            </div>
          ) : null}

          {hayApoderados && (
            <div className="space-y-4">
              <ApoderadoSlot
                form={form}
                index="0"
                titulo="Apoderado principal"
                fotoPendiente={fotosApoderadoNuevo[0] ?? null}
                onFotoPendiente={guardarFotoPendiente}
                onQuitarFotoPendiente={quitarFotoPendiente}
              />
              {slotSecundario && (
                <ApoderadoSlot
                  form={form}
                  index="1"
                  titulo="Apoderado secundario"
                  fotoPendiente={fotosApoderadoNuevo[1] ?? null}
                  onFotoPendiente={guardarFotoPendiente}
                  onQuitarFotoPendiente={quitarFotoPendiente}
                />
              )}

              {errorGlobalApoderados && (
                <p className="text-sm text-destructive">
                  {errorGlobalApoderados}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!slotSecundario && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarSecundario}
                  >
                    <Plus />
                    Agregar apoderado secundario
                  </Button>
                )}
                {slotSecundario && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={quitarSecundario}
                  >
                    <X />
                    Quitar secundario
                  </Button>
                )}
                {esEdicion && apoderadosActuales.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={quitarTodos}
                  >
                    <Trash2 className="text-destructive" />
                    Quitar todos
                  </Button>
                )}
              </div>
            </div>
          )}

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

          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear alumno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ApoderadoSlot({
  form,
  index,
  titulo,
  fotoPendiente,
  onFotoPendiente,
  onQuitarFotoPendiente,
}: {
  form: ReturnType<typeof useForm<AlumnoValues>>
  index: "0" | "1"
  titulo: string
  fotoPendiente: File | null
  onFotoPendiente: (index: number, file: File) => void
  onQuitarFotoPendiente: (index: number) => void
}) {
  const consulta = useApoderadoPorDocumento()
  const subirFoto = useSubirFotoApoderado()
  const eliminarFoto = useEliminarFotoApoderado()
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const path = <K extends keyof ApoderadoValues>(campo: K) =>
    `apoderados.${index}.${campo}` as const
  const errors = form.formState.errors.apoderados?.[Number(index)]
  const modo = form.watch(path("_modo"))
  const idUsuario = form.watch(path("_idUsuario"))
  const urlFoto = form.watch(path("_urlFoto"))

  async function handleArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (idUsuario != null) {
      try {
        const result = await subirFoto.mutateAsync({ idUsuario, file })
        form.setValue(path("_urlFoto"), result.urlFoto ?? undefined)
        toast.success("Foto del apoderado actualizada")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo subir la foto"
        )
      } finally {
        if (inputFotoRef.current) inputFotoRef.current.value = ""
      }
    } else {
      form.setValue(path("_urlFoto"), URL.createObjectURL(file))
      onFotoPendiente(Number(index), file)
      toast.info("La foto del apoderado se subirá al guardar el alumno")
    }
  }

  async function handleQuitarFoto() {
    if (idUsuario != null) {
      try {
        await eliminarFoto.mutateAsync(idUsuario)
        form.setValue(path("_urlFoto"), undefined)
        toast.success("Foto del apoderado eliminada")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo eliminar la foto"
        )
      }
    } else {
      form.setValue(path("_urlFoto"), undefined)
      onQuitarFotoPendiente(Number(index))
    }
  }

  async function consultarDocumento(documento: string) {
    const dni = documento.trim()
    if (!dni) return
    try {
      const apoderado = await consulta.mutateAsync(dni)
      rellenarReutilizable(apoderado)
      toast.success(
        `Se reutilizará: ${apoderado.nombre} ${apoderado.apellidoPat} ${apoderado.apellidoMat}`.trim()
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        form.setValue(path("_modo"), "crear")
        toast.info("El documento no está registrado: completa los datos del apoderado")
      } else {
        toast.error(
          error instanceof Error ? error.message : "No se pudo verificar el documento"
        )
      }
    }
  }

  function rellenarReutilizable(apoderado: ApoderadoResponse) {
    form.setValue(path("_modo"), "reutilizar")
    form.setValue(path("_idUsuario"), apoderado.idUsuario ?? undefined)
    form.setValue(path("_urlFoto"), apoderado.urlFoto ?? undefined)
    onQuitarFotoPendiente(Number(index))
    form.setValue(path("nombre"), apoderado.nombre)
    form.setValue(path("apellidoPat"), apoderado.apellidoPat)
    form.setValue(path("apellidoMat"), apoderado.apellidoMat)
    form.setValue(path("gmail"), apoderado.gmail ?? "")
    form.setValue(path("fechaNaci"), apoderado.fechaNaci ?? "")
    form.setValue(path("documentoIdentidad"), apoderado.documentoIdentidad ?? "")
    form.setValue(path("celular"), apoderado.celular ?? "")
    form.setValue(path("direccion"), apoderado.direccion ?? "")
    form.setValue(path("parentesco"), apoderado.parentesco ?? "")
  }

  const iniciales =
    `${form.getValues(path("nombre"))?.charAt(0) ?? ""}${form.getValues(path("apellidoPat"))?.charAt(0) ?? ""}`.toUpperCase()

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {urlFoto ? (
              <AvatarImage src={urlFoto} alt={titulo} />
            ) : (
              <AvatarFallback className="rounded-full text-xs">
                {iniciales || "A"}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="text-sm font-medium">{titulo}</p>
            {modo === "reutilizar" && (
              <Badge variant="secondary" className="text-xs">
                Se reutilizará el registrado
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleArchivo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputFotoRef.current?.click()}
              disabled={subirFoto.isPending}
            >
              <Camera />
              {urlFoto ? "Cambiar" : "Subir"}
            </Button>
            {urlFoto && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleQuitarFoto}
                disabled={eliminarFoto.isPending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
      </div>
      {fotoPendiente && (
        <p className="text-xs text-muted-foreground">
          Foto seleccionada: se subirá al guardar el alumno.
        </p>
      )}

      <Controller
        control={form.control}
        name={path("documentoIdentidad")}
        render={({ field }) => (
          <Field>
            <FieldLabel>Documento</FieldLabel>
            <FieldContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingresa el DNI o documento"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={() => consultarDocumento(field.value ?? "")}
                  name={field.name}
                  ref={field.ref}
                  disabled={consulta.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Consultar documento"
                  disabled={consulta.isPending}
                  onClick={() => consultarDocumento(field.value ?? "")}
                >
                  {consulta.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Search />
                  )}
                </Button>
              </div>
              <FieldError
                errors={[errors?.documentoIdentidad]}
              />
              <p className="text-xs text-muted-foreground">
                Si el documento ya existe, se reutiliza el apoderado registrado (sin contraseña).
              </p>
            </FieldContent>
          </Field>
        )}
      />

      {modo === "reutilizar" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Controller
            control={form.control}
            name={path("nombre")}
            render={({ field }) => (
              <Field>
                <FieldLabel>Nombres</FieldLabel>
                <FieldContent>
                  <Input {...field} disabled readOnly />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name={path("apellidoPat")}
            render={({ field }) => (
              <Field>
                <FieldLabel>Ap. paterno</FieldLabel>
                <FieldContent>
                  <Input {...field} disabled readOnly />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name={path("apellidoMat")}
            render={({ field }) => (
              <Field>
                <FieldLabel>Ap. materno</FieldLabel>
                <FieldContent>
                  <Input {...field} disabled readOnly />
                </FieldContent>
              </Field>
            )}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              control={form.control}
              name={path("nombre")}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombres</FieldLabel>
                  <FieldContent>
                    <Input placeholder="María" {...field} />
                    <FieldError errors={[errors?.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={path("apellidoPat")}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. paterno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="García" {...field} />
                    <FieldError errors={[errors?.apellidoPat]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={path("apellidoMat")}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. materno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Ríos" {...field} />
                    <FieldError errors={[errors?.apellidoMat]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name={path("fechaNaci")}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[errors?.fechaNaci]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={path("contraseña")}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Contraseña</FieldLabel>
                  <FieldContent>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      {...field}
                    />
                    <FieldError errors={[errors?.contraseña]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={form.control}
          name={path("celular")}
          render={({ field }) => (
            <Field>
              <FieldLabel>Celular</FieldLabel>
              <FieldContent>
                <Input placeholder="987654321" {...field} />
                <FieldError errors={[errors?.celular]} />
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name={path("parentesco")}
          render={({ field }) => (
            <Field>
              <FieldLabel>Parentesco</FieldLabel>
              <FieldContent>
                <Input placeholder="Madre / Padre" {...field} />
                <FieldError errors={[errors?.parentesco]} />
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={form.control}
          name={path("gmail")}
          render={({ field }) => (
            <Field>
              <FieldLabel>Correo</FieldLabel>
              <FieldContent>
                <Input
                  type="email"
                  placeholder="apoderado@correo.com"
                  {...field}
                />
                <FieldError errors={[errors?.gmail]} />
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name={path("direccion")}
          render={({ field }) => (
            <Field>
              <FieldLabel>Dirección</FieldLabel>
              <FieldContent>
                <Input placeholder="Opcional" {...field} />
                <FieldError errors={[errors?.direccion]} />
              </FieldContent>
            </Field>
          )}
        />
      </div>
    </div>
  )
}