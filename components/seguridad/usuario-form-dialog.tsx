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
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarFotoUsuario,
  useRoles,
  useSubirFotoUsuario,
} from "@/hooks/use-seguridad"
import type { UsuarioResponse, UsuarioRequest } from "@/lib/api/seguridad"
import {
  usuarioSchema,
  type UsuarioValues,
} from "@/lib/schemas/seguridad"
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
      fechaNaci: usuario?.fechaNaci ?? "",
      acceso: usuario?.acceso ?? 1,
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
      fechaNaci: values.fechaNaci,
      rolIds: values.rolIds,
    }
    if (esEdicion) {
      data.acceso = values.acceso
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

  async function onSubmit(values: UsuarioValues) {
    if (!esEdicion && !values.contraseña) {
      toast.error("La contraseña es obligatoria (mínimo 6 caracteres)")
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Foto */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-full">
              {preview ? (
                <AvatarImage src={preview} alt="Foto del usuario" />
              ) : (
                <AvatarFallback className="rounded-full text-lg">
                  {iniciales || "U"}
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
              {(fotoNueva || (esEdicion && usuario?.urlFoto)) && (
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
            {esEdicion && usuario && !usuario.urlFoto && (
              <span className="text-xs text-muted-foreground">
                Sin foto
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombres</FieldLabel>
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
                  <FieldLabel>Ap. paterno</FieldLabel>
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
                  <FieldLabel>Ap. materno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Ramírez" {...field} />
                    <FieldError errors={[form.formState.errors.apellidoMat]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="documentoIdentidad"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Documento de identidad</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Opcional" {...field} />
                    <FieldError
                      errors={[form.formState.errors.documentoIdentidad]}
                    />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="gmail"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Correo</FieldLabel>
                  <FieldContent>
                    <Input type="email" placeholder="usuario@correo.com" {...field} />
                    <FieldError errors={[form.formState.errors.gmail]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fechaNaci"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[form.formState.errors.fechaNaci]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="contraseña"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Contraseña</FieldLabel>
                  <FieldContent>
                    <Input
                      type="password"
                      placeholder={
                        esEdicion
                          ? "Dejar en blanco para no cambiar"
                          : "Mínimo 6 caracteres"
                      }
                      {...field}
                    />
                    <FieldError errors={[form.formState.errors.contraseña]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <Field>
            <FieldLabel>Roles</FieldLabel>
            <FieldContent>
              <div className="grid gap-2 rounded-lg border p-3">
                {!roles.length && (
                  <p className="text-sm text-muted-foreground">
                    Crea roles primero (pestaña Roles).
                  </p>
                )}
                {roles.map((rol) => (
                  <label
                    key={rol.idRol}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Controller
                      control={form.control}
                      name="rolIds"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value.includes(rol.idRol)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, rol.idRol]
                                : field.value.filter((id) => id !== rol.idRol)
                            )
                          }}
                        />
                      )}
                    />
                    {rol.nombre}
                  </label>
                ))}
              </div>
              <FieldError errors={[form.formState.errors.rolIds]} />
            </FieldContent>
          </Field>

          {esEdicion && (
            <Controller
              control={form.control}
              name="acceso"
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
              {esEdicion ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}