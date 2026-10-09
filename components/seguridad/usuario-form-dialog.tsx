"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, RefreshCcw } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
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
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarFotoUsuario,
  useReactivarUsuario,
  useRoles,
  useSubirFotoUsuario,
} from "@/hooks/use-seguridad"
import {
  useDocenteDeUsuario,
  useGradosAcademicos,
  useNiveles,
  useTiposContrato,
} from "@/hooks/use-academico"
import { useConsultarDni } from "@/hooks/use-reniec"
import type { UsuarioResponse, UsuarioRequest } from "@/lib/api/seguridad"
import {
  crearUsuarioSchema,
  type UsuarioValues,
} from "@/lib/schemas/seguridad"
import { REGEX_DNI } from "@/lib/schemas/comun"
import { BloqueFoto } from "@/components/shared/bloque-foto"
import { CampoChip } from "@/components/shared/campo-chip"
import { CampoContrasena } from "@/components/shared/campo-contrasena"
import { CampoDni } from "@/components/shared/campo-dni"
import { CamposNombres } from "@/components/shared/campos-nombres"
import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { CampoAcceso } from "./shared"
import { ConfirmarEliminar } from "./confirmar-eliminar"

interface ReactivacionPendiente {
  idUsuario: number
  nombre: string
  codigo: string
  fechaCreacion: string
  request: UsuarioRequest
  foto: File | null
}

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: UsuarioResponse | null
}

function mensajeConCredenciales(respuesta: UsuarioResponse, textoExito: string): string {
  return respuesta.credencialesEnviadas === true
    ? `${textoExito}. Las credenciales de acceso fueron enviadas a su correo electrónico.`
    : `${textoExito}.`
}

export default function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
}: UsuarioFormDialogProps) {
  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario()
  const reactivar = useReactivarUsuario()
  const subirFoto = useSubirFotoUsuario()
  const eliminarFoto = useEliminarFotoUsuario()

  const { data: roles = [] } = useRoles()
  const {
    data: gradosAcademicos = [],
    isLoading: gradosAcademicosCargando,
    isError: gradosAcademicosError,
  } = useGradosAcademicos()
  const {
    data: tiposContrato = [],
    isLoading: tiposContratoCargando,
    isError: tiposContratoError,
  } = useTiposContrato()
  const { data: niveles = [] } = useNiveles()
  const consultarDni = useConsultarDni()

  const esEdicion = !!usuario
  const docenteActivo = useDocenteDeUsuario(usuario?.idUsuario)

  const rolDocente = roles.find((r) => r.nombre === "Docente")
  const rolApoderado = roles.find((r) => r.nombre === "Apoderado")
  // El apoderado se crea desde el módulo de Alumnos; aquí solo se muestra (si el
  // usuario ya lo tiene) como fijo, sin permitir quitarlo ni asignarlo.
  const rolesVisibles = roles.filter((r) => r.nombre !== "Apoderado")
  const esApoderado = !!usuario?.roles.some((r) => r.nombre === "Apoderado")

  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    usuario?.urlFoto ?? null
  )
  const [reactivacion, setReactivacion] = useState<ReactivacionPendiente | null>(null)

  const form = useForm<UsuarioValues>({
    /*
     * El resolver se arma en cada render desde el estado del formulario (rol
     * DOCENTE marcado y si el usuario ya tiene docente activo): así los datos
     * del docente se exigen solo cuando el bloque se está mostrando.
     */
    resolver: (values, context, options) => {
      const seleccionaDocente =
        !!rolDocente && values.rolIds.includes(rolDocente.idRol)
      const exige =
        seleccionaDocente && (esEdicion ? !docenteActivo : true)
      return zodResolver(crearUsuarioSchema(exige))(
        values,
        context,
        options
      )
    },
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      apellidoPat: usuario?.apellidoPat ?? "",
      apellidoMat: usuario?.apellidoMat ?? "",
      documentoIdentidad: usuario?.documentoIdentidad ?? "",
      gmail: usuario?.gmail ?? "",
      celular: usuario?.celular ?? "",
      fechaNaci: usuario?.fechaNaci ?? "",
      accesoId: usuario?.accesoId ?? 1,
      rolIds: usuario?.roles.map((r) => r.idRol) ?? [],
      contraseña: "",
      gradoAcademicoId: docenteActivo?.gradoAcademicoId ?? null,
      tipoContratoId: docenteActivo?.tipoContratoId ?? null,
      fechaContratacion: docenteActivo?.fechaContratacion ?? "",
      niveles: docenteActivo?.niveles.map((n) => n.idNivel) ?? [],
    },
  })

  const rolIds = useWatch({ control: form.control, name: "rolIds" })
  const seleccionaDocente =
    !!rolDocente && rolIds.includes(rolDocente.idRol)
  // Al editar un usuario que ya es docente activo, sus datos se gestionan en la
  // pestaña Docentes y el bloque no aparece ni se valida.
  const exigeDocente =
    seleccionaDocente && (esEdicion ? !docenteActivo : true)
  const mostrarDatosDocente = seleccionaDocente && exigeDocente

  function buildRequest(values: UsuarioValues): UsuarioRequest {
    const data: UsuarioRequest = {
      nombre: values.nombre,
      apellidoPat: values.apellidoPat,
      apellidoMat: values.apellidoMat,
      documentoIdentidad: values.documentoIdentidad || null,
      gmail: values.gmail || null,
      celular: values.celular || null,
      fechaNaci: values.fechaNaci,
      rolIds: values.rolIds,
    }
    if (esEdicion) {
      data.accesoId = values.accesoId
    }
    if (values.contraseña) {
      data.contraseña = values.contraseña
    }
    if (seleccionaDocente) {
      // Aunque el usuario ya sea docente (bloque oculto), el backend ignora
      // estos datos cuando hay un docente activo, así que es seguro enviarlos.
      data.gradoAcademicoId = values.gradoAcademicoId ?? null
      data.tipoContratoId = values.tipoContratoId ?? null
      data.fechaContratacion = values.fechaContratacion || null
      data.niveles = values.niveles
    }
    return data
  }

  function handleArchivo(file: File) {
    setFotoNueva(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleQuitarFoto() {
    if (!usuario) return
    try {
      await eliminarFoto.mutateAsync(usuario.idUsuario)
      setPreview(null)
      setFotoNueva(null)
      toast.success("Foto eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al quitar la foto")
    }
  }

  async function subirFotoConAviso(
    id: number,
    file: File,
    toastId: string | number,
    mensajeExito: string
  ) {
    try {
      await subirFoto.mutateAsync({ id, file })
      toast.success(mensajeExito, { id: toastId })
    } catch {
      toast.warning(`${mensajeExito}, pero no se pudo subir la foto.`, {
        id: toastId,
      })
    }
  }

  async function handleBuscarDni() {
    const dni = form.getValues("documentoIdentidad")?.trim()
    if (!dni || !REGEX_DNI.test(dni)) {
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

  async function onSubmit(values: UsuarioValues) {
    if (!esEdicion && !values.contraseña) {
      toast.error("La contraseña es obligatoria (mín 8: mayúscula, número y símbolo)")
      return
    }
    const guardando = toast.loading(
      esEdicion ? "Guardando usuario..." : "Creando usuario..."
    )
    try {
      if (esEdicion && usuario) {
        await actualizar.mutateAsync({
          id: usuario.idUsuario,
          data: buildRequest(values),
        })
        if (fotoNueva) {
          await subirFoto.mutateAsync({ id: usuario.idUsuario, file: fotoNueva })
        }
        toast.success("Usuario actualizado", { id: guardando })
      } else {
        const creado = await crear.mutateAsync(buildRequest(values))
        const mensaje = mensajeConCredenciales(creado, "Usuario creado correctamente")
        if (fotoNueva) {
          await subirFotoConAviso(creado.idUsuario, fotoNueva, guardando, mensaje)
        } else {
          toast.success(mensaje, { id: guardando })
        }
        if (creado.credencialesEnviadas === false) {
          toast.warning("No se pudieron enviar las credenciales al correo del usuario", { id: guardando })
        }
      }
      onOpenChange(false)
    } catch (error) {
      // El backend responde 409 con los datos del usuario eliminado cuando el
      // DNI ya existe: se ofrece reactivarlo en lugar de mostrar el error.
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.body?.idUsuario != null &&
        !esEdicion
      ) {
        const fecha = error.body.fechaCreacion
          ? new Date(String(error.body.fechaCreacion)).toLocaleDateString()
          : ""
        setReactivacion({
          idUsuario: Number(error.body.idUsuario),
          nombre: String(error.body.nombre ?? ""),
          codigo: String(error.body.codigo ?? ""),
          fechaCreacion: fecha,
          request: buildRequest(values),
          foto: fotoNueva,
        })
        toast.dismiss(guardando)
        return
      }
      toast.error(
        error instanceof Error ? error.message : "Error al guardar",
        { id: guardando }
      )
    }
  }

  async function handleConfirmarReactivacion() {
    if (!reactivacion) return
    const guardando = toast.loading("Reactivando usuario...")
    try {
      const reactivado = await reactivar.mutateAsync({
        id: reactivacion.idUsuario,
        data: reactivacion.request,
      })
      const mensaje = mensajeConCredenciales(reactivado, "Usuario reactivado correctamente")
      if (reactivacion.foto) {
        await subirFotoConAviso(reactivado.idUsuario, reactivacion.foto, guardando, mensaje)
      } else {
        toast.success(mensaje, { id: guardando })
      }
      if (reactivado.credencialesEnviadas === false) {
        toast.warning("No se pudieron enviar las credenciales al correo del usuario", { id: guardando })
      }
      setReactivacion(null)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al reactivar",
        { id: guardando }
      )
    }
  }

  const enviando =
    crear.isPending || actualizar.isPending || subirFoto.isPending

  const iniciales = `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto">
            <TarjetaSeccion>
            <FieldSet>
              <FieldLegend>Identidad</FieldLegend>
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Foto */}
                <BloqueFoto
                  preview={preview}
                  alt="Foto del usuario"
                  iniciales={iniciales}
                  fallback="U"
                  hayFotoNueva={!!fotoNueva}
                  mostrarQuitar={!!(fotoNueva || (esEdicion && usuario?.urlFoto))}
                  quitarDisabled={eliminarFoto.isPending}
                  notaSinFoto={esEdicion && usuario && !usuario.urlFoto ? "Sin foto" : null}
                  onChangeArchivo={handleArchivo}
                  onQuitar={handleQuitarFoto}
                />
                {/* Campos */}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="gmail"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Correo electrónico *</FieldLabel>
                          <FieldContent>
                            <Input type="email" placeholder="usuario@correo.com" {...field} />
                            <FieldDescription className="text-xs">Obligatorio para notificaciones.</FieldDescription>
                            <FieldError errors={[form.formState.errors.gmail]} />
                          </FieldContent>
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="celular"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Celular *</FieldLabel>
                          <FieldContent>
                            <Input
                              placeholder="9 dígitos"
                              maxLength={9}
                              inputMode="numeric"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                            />
                            <FieldDescription className="text-xs">Ingresa 9 dígitos.</FieldDescription>
                            <FieldError errors={[form.formState.errors.celular]} />
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
                  <div className={esEdicion ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
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
                          label={`Contraseña ${esEdicion ? "(opcional)" : "*"}`}
                          descripcion={
                            esEdicion
                              ? "Si la dejas vacía, se conserva la contraseña actual."
                              : "Mín. 8 caracteres, 1 mayúscula, 1 número y 1 símbolo."
                          }
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

            <TarjetaSeccion>
            <FieldSet>
              <FieldLegend>Roles *</FieldLegend>
              <FieldDescription className="text-xs">Selecciona al menos un rol. El código de acceso se genera automáticamente. El rol Apoderado se asigna desde el módulo de Alumnos.</FieldDescription>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="rolIds"
                  render={({ field }) => (
                    <div>
                      {!rolesVisibles.length ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">Crea roles primero (pestaña Roles).</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {rolesVisibles.map((rol) => {
                            const checked = field.value.includes(rol.idRol)
                            return (
                              <CampoChip
                                key={rol.idRol}
                                checked={checked}
                                onCheckedChange={(v) => field.onChange(v ? [...field.value, rol.idRol] : field.value.filter((id: number) => id !== rol.idRol))}
                              >
                                {rol.nombre}
                              </CampoChip>
                            )
                          })}
                          {esApoderado && rolApoderado && (
                            <CampoChip checked disabled>
                              {rolApoderado.nombre}
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(gestionado en Alumnos)</span>
                            </CampoChip>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                />
                <FieldError errors={[form.formState.errors.rolIds]} />
              </FieldContent>
              </FieldSet>
            </TarjetaSeccion>

            {mostrarDatosDocente && (
              <TarjetaSeccion destacada>
              <FieldSet>
                <FieldLegend>Datos del docente *</FieldLegend>
                <FieldDescription className="text-xs">
                  {esEdicion
                    ? "Se creará el registro del docente al guardar."
                    : "Datos obligatorios para crear el docente."}
                </FieldDescription>
                {(gradosAcademicosCargando || tiposContratoCargando) && (
                  <p className="text-xs text-muted-foreground">Cargando catálogos del docente…</p>
                )}
                {(gradosAcademicosError || tiposContratoError) && (
                  <p className="text-xs text-destructive">
                    No se pudieron cargar los catálogos del docente. Recarga la página e inténtalo de nuevo.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Controller
                    control={form.control}
                    name="tipoContratoId"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Tipo de contrato *</FieldLabel>
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
                        <FieldLabel>Grado académico *</FieldLabel>
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
                  <Controller
                    control={form.control}
                    name="fechaContratacion"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Fecha de contratación *</FieldLabel>
                        <FieldContent>
                          <Input type="date" {...field} />
                          <FieldError errors={[form.formState.errors.fechaContratacion]} />
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
                            <div className="flex flex-wrap gap-2">
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
            )}
          </FieldGroup>

          <DialogFooter className="shrink-0">
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {esEdicion ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      {reactivacion && (
        <ConfirmarEliminar
          open={!!reactivacion}
          onOpenChange={(v) => {
            if (!v) setReactivacion(null)
          }}
          titulo="Reactivar usuario"
          descripcion={`Ya existía un usuario con este DNI: "${reactivacion.nombre}" (código ${reactivacion.codigo}${
            reactivacion.fechaCreacion
              ? `, registrado el ${reactivacion.fechaCreacion}`
              : ""
          }). Se reutilizará ese registro con los datos ingresados y la nueva contraseña.`}
          textoBoton="Reactivar"
          icono={<RefreshCcw />}
          variantConfirmar="default"
          disabled={reactivar.isPending}
          onConfirm={handleConfirmarReactivacion}
        />
      )}
    </>
  )
}