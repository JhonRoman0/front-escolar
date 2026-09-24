"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Plus } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

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
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  useActualizarRol,
  useCrearRol,
  useEliminarRol,
  useRoles,
} from "@/hooks/use-seguridad"
import type { RolResponse } from "@/lib/api/seguridad"
import { rolSchema, type RolValues } from "@/lib/schemas/seguridad"
import { usePuede } from "@/hooks/use-permisos"
import { cn } from "@/lib/utils"
import { ConfirmarEliminar } from "./confirmar-eliminar"
import { CampoAcceso, CargandoTarjetas } from "./shared"

const COLORES_FALLBACK = [
  { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", darkBg: "dark:bg-emerald-900/40", darkText: "dark:text-emerald-300" },
  { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", darkBg: "dark:bg-amber-900/40", darkText: "dark:text-amber-300" },
  { bg: "bg-[#DC2626]/10", text: "text-[#DC2626]", darkBg: "dark:bg-rose-900/40", darkText: "dark:text-rose-300" },
  { bg: "bg-[#F5F3FF]", text: "text-[#8427FE]", darkBg: "dark:bg-violet-900/40", darkText: "dark:text-violet-300" },
]

function getRolColor(color: string | null, index: number) {
  if (color) {
    return {
      bg: "",
      text: "",
      darkBg: "",
      darkText: "",
      inline: { backgroundColor: `${color}20`, color },
    }
  }
  const fallback = COLORES_FALLBACK[index % COLORES_FALLBACK.length]
  return { ...fallback, inline: null }
}

export default function RolesTab() {
  const { data, isLoading, isError, refetch } = useRoles()
  const eliminar = useEliminarRol()
  const puedeCrear = usePuede("ROLES", "CREAR")
  const puedeActualizar = usePuede("ROLES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ROLES", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<RolResponse | null>(null)

  const rolesActivos = data?.filter((r) => r.accesoId === 1) ?? []

  async function handleEliminar(rol: RolResponse) {
    try {
      await eliminar.mutateAsync(rol.idRol)
      toast.success(`Rol "${rol.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Roles</h2>
            <p className="text-[14px] leading-5 text-muted-foreground">Roles que se asignan a cada usuario para definir sus accesos.</p>
          </div>
          {puedeCrear && (
            <Button className="bg-[#274CB4] text-white hover:bg-[#274CB4]/85" onClick={() => { setEditando(null); setDialogOpen(true) }}>
              <Plus data-icon="inline-start" />
              Nuevo rol
            </Button>
          )}
        </div>

        {isLoading ? (
            <CargandoTarjetas filas={2} />
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No se pudo cargar. Recarga la pantalla.
            </p>
          ) : !rolesActivos.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay roles activos.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-12 gap-y-6">
              {rolesActivos.map((rol, i) => {
                const color = getRolColor(rol.color, i)
                return (
                  <div
                    key={rol.idRol}
                    className={cn(
                      "group relative flex h-[105px] w-[210px] shrink-0 items-center justify-center rounded-2xl px-4 py-3 transition-shadow hover:shadow-md",
                      color.inline ? "" : color.bg,
                      color.inline ? "" : color.darkBg
                    )}
                    style={color.inline ?? undefined}
                  >
                    <span
                      className={cn(
                        "text-[16px] font-normal",
                        color.inline ? "" : color.text,
                        color.inline ? "" : color.darkText
                      )}
                      style={color.inline ? { color: color.inline.color } : undefined}
                    >
                      {rol.nombre}
                    </span>
                    {(puedeActualizar || puedeEliminar) && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-xs"
                            className="size-6 rounded-lg border-transparent bg-white/70 hover:bg-white dark:bg-white/20 dark:hover:bg-white/30"
                            aria-label={`Editar ${rol.nombre}`}
                            onClick={() => {
                              setEditando(rol)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar rol"
                            descripcion={`Se marcará "${rol.nombre}" como eliminado. No podrá asignarse a nuevos usuarios.`}
                            onConfirm={() => handleEliminar(rol)}
                            className="size-6 rounded-lg border-transparent bg-white/70 hover:bg-white dark:bg-white/20 dark:hover:bg-white/30"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        <RolFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rol={editando}
        />
      </CardContent>
    </Card>
  )
}

function RolFormDialog({
  open,
  onOpenChange,
  rol,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rol?: RolResponse | null
}) {
  const crear = useCrearRol()
  const actualizar = useActualizarRol()
  const esEdicion = !!rol

  const form = useForm<RolValues>({
    resolver: zodResolver(rolSchema),
    defaultValues: { nombre: "", color: "", accesoId: 1 },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: rol?.nombre ?? "",
        color: rol?.color ?? "",
        accesoId: rol?.accesoId ?? 1,
      })
    }
  }, [open, rol, form])

  async function onSubmit(values: RolValues) {
    try {
      if (esEdicion && rol) {
        await actualizar.mutateAsync({ id: rol.idRol, data: values })
        toast.success("Rol actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Rol creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar rol" : "Nuevo rol"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nombre del rol</FieldLabel>
                <FieldContent>
                  <Input placeholder="Secretaria" {...field} />
                  <FieldError errors={[form.formState.errors.nombre]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <Field>
                <FieldLabel>Color del rol</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={field.value || "#3B82F6"}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border-0 p-0"
                    />
                    <Input
                      placeholder="#FF5733"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <FieldError errors={[form.formState.errors.color]} />
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
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button
              type="submit"
              disabled={crear.isPending || actualizar.isPending}
            >
              {(crear.isPending || actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}