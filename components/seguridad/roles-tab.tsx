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

const COLORES_ROL = [
  {
    bg: "bg-[#D1FAE5] dark:bg-emerald-900/40",
    text: "text-[#065F46] dark:text-emerald-300",
  },
  {
    bg: "bg-[#FEF3C7] dark:bg-amber-900/40",
    text: "text-[#92400E] dark:text-amber-300",
  },
  {
    bg: "bg-[#DC2626]/10 dark:bg-rose-900/40",
    text: "text-[#DC2626] dark:text-rose-300",
  },
  {
    bg: "bg-[#F5F3FF] dark:bg-violet-900/40",
    text: "text-[#8427FE] dark:text-violet-300",
  },
]

export default function RolesTab() {
  const { data, isLoading, isError, refetch } = useRoles()
  const eliminar = useEliminarRol()
  const puedeCrear = usePuede("ROLES", "CREAR")
  const puedeActualizar = usePuede("ROLES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ROLES", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<RolResponse | null>(null)

  const rolesActivos = data?.filter((r) => r.acceso === 1) ?? []

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
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold">Roles</h2>
            <p className="text-[16px] text-[#7D7D7F]">
              Roles que se va a asignar a cada usuario
            </p>
          </div>
          {puedeCrear && (
            <Button
              className="bg-[#274CB4] text-white hover:bg-[#274CB4]/80"
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            >
              <Plus />
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
                const color = COLORES_ROL[i % COLORES_ROL.length]
                return (
                  <div
                    key={rol.idRol}
                    className={cn(
                      "group relative flex h-[105px] w-[210px] shrink-0 items-center justify-center rounded-2xl px-4 py-3 transition-shadow hover:shadow-md",
                      color.bg
                    )}
                  >
                    <span className={cn("text-[16px] font-normal", color.text)}>
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
    defaultValues: { nombre: "", acceso: 1 },
  })

  useEffect(() => {
    if (open) {
      form.reset({ nombre: rol?.nombre ?? "", acceso: rol?.acceso ?? 1 })
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