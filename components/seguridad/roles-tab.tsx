"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { EllipsisVertical, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { FilterSelect } from "@/components/shared/filter-select"
import {
  useActualizarRol,
  useCrearRol,
  useEliminarRol,
  useRoles,
  useRolesPermiso,
} from "@/hooks/use-seguridad"
import type { RolResponse } from "@/lib/api/seguridad"
import { rolSchema, type RolValues } from "@/lib/schemas/seguridad"
import { usePuede } from "@/hooks/use-permisos"
import { cn } from "@/lib/utils"
import { ConfirmarEliminar } from "./confirmar-eliminar"
import { CampoAcceso, CargandoTarjetas } from "./shared"

const PALETA_COLORES = [
  "#1D4ED8",
  "#0E7490",
  "#15803D",
  "#B45309",
  "#C2410C",
  "#B91C1C",
  "#BE185D",
  "#6D28D9",
]

const ESTADO_OPCIONES = [
  { value: "1", label: "Activo" },
  { value: "3", label: "Inactivo" },
]

function esRolAdmin(rol: RolResponse) {
  return rol.nombre.trim().toUpperCase() === "ADMIN"
}

export default function RolesTab() {
  const { data, isLoading, isError, refetch } = useRoles()
  const { data: rolesPermisos = [] } = useRolesPermiso()
  const eliminar = useEliminarRol()
  const puedeCrear = usePuede("ROLES", "CREAR")
  const puedeActualizar = usePuede("ROLES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ROLES", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<RolResponse | null>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [rolAEliminar, setRolAEliminar] = useState<RolResponse | null>(null)

  const roles = data ?? []
  const rolesFiltrados = filtroEstado
    ? roles.filter((r) => String(r.accesoId) === filtroEstado)
    : roles

  function conteoPermisos(idRol: number) {
    return rolesPermisos.filter((rp) => rp.rol?.idRol === idRol).length
  }

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
          <div className="flex items-center gap-2">
            <FilterSelect
              label="Estado"
              value={filtroEstado}
              onValueChange={setFiltroEstado}
              options={ESTADO_OPCIONES}
              allLabel="Todos los estados"
            />
            {puedeCrear && (
              <Button variant="brand" onClick={() => { setEditando(null); setDialogOpen(true) }}>
                <Plus data-icon="inline-start" />
                Nuevo rol
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <CargandoTarjetas filas={2} />
        ) : isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se pudo cargar. Recarga la pantalla.
          </p>
        ) : !roles.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay roles.
          </p>
        ) : !rolesFiltrados.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay roles con este estado.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {rolesFiltrados.map((rol) => {
              const admin = esRolAdmin(rol)
              const inactivo = rol.accesoId === 3
              const puedeGestionar = !admin && (puedeActualizar || puedeEliminar)
              const permisos = conteoPermisos(rol.idRol)

              return (
                <div
                  key={rol.idRol}
                  className={cn(
                    "relative flex h-[116px] w-[220px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl px-4 py-3 transition-shadow hover:shadow-md",
                    inactivo ? "bg-muted" : "text-white"
                  )}
                  style={
                    inactivo
                      ? undefined
                      : { backgroundColor: admin ? "#0F172A" : (rol.color ?? PALETA_COLORES[0]) }
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    {admin ? (
                      <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                        <ShieldCheck />
                        Protegido
                      </Badge>
                    ) : inactivo ? (
                      <Badge variant="secondary">Inactivo</Badge>
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-white/20 text-white">
                        Activo
                      </Badge>
                    )}

                    {puedeGestionar && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Acciones de ${rol.nombre}`}
                              className={cn(
                                "size-6 rounded-lg",
                                inactivo
                                  ? "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                                  : "text-white/90 hover:bg-white/20 hover:text-white"
                              )}
                            />
                          }
                        >
                          <EllipsisVertical />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {puedeActualizar && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditando(rol)
                                setDialogOpen(true)
                              }}
                            >
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {puedeEliminar && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRolAEliminar(rol)}
                            >
                              <Trash2 />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium" title={rol.nombre}>
                      {rol.nombre}
                    </p>
                    <p
                      className={cn(
                        "truncate text-[12px]",
                        inactivo ? "text-muted-foreground" : "text-white/80"
                      )}
                    >
                      {admin
                        ? "Acceso total al sistema"
                        : `${permisos} ${permisos === 1 ? "permiso" : "permisos"}`}
                    </p>
                  </div>
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

        {rolAEliminar && (
          <ConfirmarEliminar
            open={!!rolAEliminar}
            onOpenChange={(v) => {
              if (!v) setRolAEliminar(null)
            }}
            titulo="Eliminar rol"
            descripcion={`Se marcará "${rolAEliminar.nombre}" como eliminado. No podrá asignarse a nuevos usuarios.`}
            disabled={eliminar.isPending}
            onConfirm={async () => {
              await handleEliminar(rolAEliminar)
              setRolAEliminar(null)
            }}
          />
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
    defaultValues: { nombre: "", color: PALETA_COLORES[0], accesoId: 1 },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: rol?.nombre ?? "",
        color: rol?.color ?? PALETA_COLORES[0],
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
                  <div className="flex flex-wrap gap-2">
                    {PALETA_COLORES.map((color) => {
                      const seleccionado =
                        (field.value ?? "").toUpperCase() === color.toUpperCase()
                      return (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Color ${color}`}
                          aria-pressed={seleccionado}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "size-8 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                            seleccionado
                              ? "ring-2 ring-foreground"
                              : "ring-1 ring-border hover:ring-foreground/40"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      )
                    })}
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
