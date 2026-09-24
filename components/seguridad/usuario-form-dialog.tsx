"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarFotoUsuario,
  useRoles,
  useSubirFotoUsuario,
} from "@/hooks/use-seguridad"
import { useConsultarDni } from "@/hooks/use-reniec"
import type { UsuarioResponse, UsuarioRequest } from "@/lib/api/seguridad"
import {
  usuarioSchema,
  type UsuarioValues,
} from "@/lib/schemas/seguridad"
import { BuscarDniButton } from "@/components/shared/buscar-dni-button"
import { CampoAcceso } from "./shared"

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: UsuarioResponse | null
}

export default function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
}: UsuarioFormDialogProps) {
  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario()
  const subirFoto = useSubirFotoUsuario()
  const eliminarFoto = useEliminarFotoUsuario()

  const { data: roles = [] } = useRoles()
  const consultarDni = useConsultarDni()

  const esEdicion = !!usuario
  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    usuario?.urlFoto ?? null
  )
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const form = useForm<UsuarioValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      apellidoPat: usuario?.apellidoPat ?? "",
      apellidoMat: usuario?.apellidoMat ?? "",
      documentoIdentidad: usuario?.documentoIdentidad ?? "",
      gmail: usuario?.gmail ?? "",
      celular: "",
      fechaNaci: usuario?.fechaNaci ?? "",
      accesoId: usuario?.accesoId ?? 1,
      rolIds: usuario?.roles.map((r) => r.idRol) ?? [],
      contraseña: "",
    },
  })

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
    return data
  }

  function handleArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFotoNueva(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleQuitarFoto() {
    if (!usuario) return
    try {
      await eliminarFoto.mutateAsync(usuario.idUsuario)
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
        if (fotoNueva) {
          try {
            await subirFoto.mutateAsync({ id: creado.idUsuario, file: fotoNueva })
          } catch {
            toast.warning(
              "Usuario creado, pero no se pudo subir la foto.",
              { id: guardando }
            )
          }
        } else {
          toast.success("Usuario creado", { id: guardando })
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
    crear.isPending || actualizar.isPending || subirFoto.isPending

  const iniciales = `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            {/* Foto */}
            <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3">
              <Avatar className="size-16 rounded-full">
                {preview ? (
                  <AvatarImage src={preview} alt="Foto del usuario" />
                ) : (
                  <AvatarFallback className="rounded-full text-lg">{iniciales || "U"}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={handleArchivo} />
                <Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}>
                  <Camera data-icon="inline-start" />
                  {fotoNueva || preview ? "Cambiar foto" : "Subir foto"}
                </Button>
                {(fotoNueva || (esEdicion && usuario?.urlFoto)) && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleQuitarFoto} disabled={eliminarFoto.isPending}>
                    <Trash2 className="text-destructive" data-icon="inline-start" />
                    Quitar
                  </Button>
                )}
              </div>
              {esEdicion && usuario && !usuario.urlFoto && <span className="text-xs text-muted-foreground">Sin foto</span>}
            </div>

            {/* Identidad — DNI primero para flujo RENIEC */}
            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Identidad</FieldLegend>
              <FieldDescription className="text-xs">Ingresa el DNI primero y usa Buscar para autocompletar desde RENIEC/BD.</FieldDescription>
              <div className="flex flex-col gap-4">
                <Controller
                  control={form.control}
                  name="documentoIdentidad"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>DNI — Documento de identidad *</FieldLabel>
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

            {/* Contacto */}
            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Contacto</FieldLegend>
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
                      <FieldLabel>Celular</FieldLabel>
                      <FieldContent>
                        <Input placeholder="9 dígitos" maxLength={9} {...field} />
                        <FieldDescription className="text-xs">Opcional. 9 dígitos si lo ingresas.</FieldDescription>
                        <FieldError errors={[form.formState.errors.celular]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            {/* Acceso */}
            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Acceso</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="contraseña"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Contraseña {esEdicion ? "(opcional)" : "*"}</FieldLabel>
                      <FieldContent>
                        <Input
                          type="password"
                          placeholder={esEdicion ? "Dejar en blanco para no cambiar" : "Mín 8: mayúscula, número y símbolo"}
                          {...field}
                        />
                        <FieldDescription className="text-xs">{esEdicion ? "Solo si deseas cambiarla." : "Mín 8 caracteres, 1 mayúscula, 1 número y 1 símbolo."}</FieldDescription>
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

            {/* Roles — mejor diseño conservando estructura */}
            <FieldSet>
              <FieldLegend className="text-sm font-semibold">Roles *</FieldLegend>
              <FieldDescription className="text-xs">El código de acceso se genera según el primer rol. Mínimo 1.</FieldDescription>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="rolIds"
                  render={({ field }) => (
                    <div className="rounded-lg border bg-muted/10 p-3">
                      {!roles.length ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">Crea roles primero (pestaña Roles).</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {roles.map((rol) => {
                            const checked = field.value.includes(rol.idRol)
                            return (
                              <label
                                key={rol.idRol}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${checked ? "border-[#274CB4]/30 bg-[#E1E7F9] dark:bg-[#1a2744]" : "border-transparent bg-background hover:bg-muted/60"}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => field.onChange(v ? [...field.value, rol.idRol] : field.value.filter((id: number) => id !== rol.idRol))}
                                />
                                <span className={`font-medium ${checked ? "text-[#274CB4] dark:text-white" : "text-foreground"}`}>{rol.nombre}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                />
                <FieldError errors={[form.formState.errors.rolIds]} />
              </FieldContent>
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {esEdicion ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}