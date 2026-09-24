"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { iconoModulo } from "@/lib/modulos"
import { usePuedeEscritura } from "@/hooks/use-permisos"
import {
  useAcciones,
  useActualizarRolPermiso,
  useCrearRolPermiso,
  useEliminarRolPermiso,
  useRoles,
  useRolesPermiso,
} from "@/hooks/use-seguridad"
import { useModulos } from "@/hooks/use-modulos"
import { CargandoTarjetas } from "./shared"

export default function AccesosTab() {
  const { data: roles = [] } = useRoles()
  const { data: modulos = [], isLoading: modulosCargando } = useModulos()
  const { data: todos, isLoading: rpCargando } = useRolesPermiso()
  const { data: acciones = [] } = useAcciones()
  const puedeEscribir = usePuedeEscritura("ROLES_PERMISOS")

  const crear = useCrearRolPermiso()
  const actualizar = useActualizarRolPermiso()
  const eliminar = useEliminarRolPermiso()

  const [rolId, setRolId] = useState<string>("")
  const [pendiente, setPendiente] = useState<number | null>(null)

  const rolesActivos = useMemo(
    () => roles.filter((r) => r.accesoId === 1),
    [roles]
  )
  const rolEfectivo =
    rolId !== ""
      ? rolId
      : rolesActivos[0]
        ? String(rolesActivos[0].idRol)
        : ""
  const rolIdNum = rolEfectivo ? Number(rolEfectivo) : null

  // Nombres legibles de las acciones ("CREAR" → "Crear")
  const accionNombre = useMemo(() => {
    const mapa = new Map<string, string>()
    acciones.forEach((a) => mapa.set(a.codigo, a.nombre))
    return mapa
  }, [acciones])

  // permisoId -> { idRolPermiso, acciones concedidas }
  const concedido = useMemo(() => {
    const mapa = new Map<
      number,
      { idRolPermiso: number; acciones: Set<string> }
    >()
    if (!rolIdNum || !todos) return mapa
    todos.forEach((rp) => {
      if (rp.rol.idRol === rolIdNum) {
        mapa.set(rp.permiso.idPermiso, {
          idRolPermiso: rp.idRolPermiso,
          acciones: new Set(rp.acciones),
        })
      }
    })
    return mapa
  }, [todos, rolIdNum])

  async function asignarPermiso(idPermiso: number) {
    if (!rolIdNum || pendiente !== null) return
    setPendiente(idPermiso)
    try {
      await crear.mutateAsync({ idRol: rolIdNum, idPermiso, acciones: [] })
      toast.success("Permiso concedido (solo lectura)")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setPendiente(null)
    }
  }

  async function quitarPermiso(idPermiso: number, idRolPermiso: number) {
    if (pendiente !== null) return
    setPendiente(idPermiso)
    try {
      await eliminar.mutateAsync(idRolPermiso)
      toast.success("Permiso quitado del rol")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setPendiente(null)
    }
  }

  async function toggleAccion(
    idPermiso: number,
    accion: string,
    estaConcedida: boolean
  ) {
    if (!rolIdNum || pendiente !== null) return
    const actual = concedido.get(idPermiso)
    if (!actual) return

    const siguiente = new Set(actual.acciones)
    if (estaConcedida) siguiente.delete(accion)
    else siguiente.add(accion)
    const accionesLista = [...siguiente]

    setPendiente(idPermiso)
    try {
      if (accionesLista.length === 0) {
        await eliminar.mutateAsync(actual.idRolPermiso)
        toast.success("Permiso quitado del rol")
      } else {
        await actualizar.mutateAsync({
          id: actual.idRolPermiso,
          data: { idRol: rolIdNum, idPermiso, acciones: accionesLista },
        })
        toast.success("Acciones actualizadas")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setPendiente(null)
    }
  }

  const rolSeleccionado = roles.find((r) => r.idRol === rolIdNum)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="space-y-0.5">
          <h2 className="text-[20px] font-semibold tracking-tight">Accesos por rol</h2>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Elige un rol y marca qué puede ver y hacer. Cada área del sistema tiene sus opciones (ver, crear, editar, eliminar).
          </p>
        </div>

        {!puedeEscribir && (
          <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Estás en modo de solo lectura: tu usuario no puede modificar los
            accesos. Contacta al administrador para cambios.
          </div>
        )}

        <Field>
          <FieldLabel className="text-[14px] font-semibold">Rol</FieldLabel>
          <FieldContent>
            <Select value={rolEfectivo} onValueChange={(v) => setRolId(v ?? "")}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecciona un rol">
                  {rolSeleccionado?.nombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rolesActivos.map((rol) => (
                  <SelectItem key={rol.idRol} value={String(rol.idRol)}>
                    {rol.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>

        {rolSeleccionado && (
          <p className="text-[14px] font-semibold text-[#7D7D7F]">
            Permisos del rol{" "}
            <span className="font-medium text-foreground">
              {rolSeleccionado.nombre}
            </span>
          </p>
        )}

        {!rolIdNum ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay roles activos para configurar.
          </p>
        ) : modulosCargando || rpCargando ? (
          <CargandoTarjetas filas={4} />
        ) : (
          <div className="space-y-4">
            {modulos
              .filter((m) => m.accesoId !== 2)
              .map((modulo) => {
                const Icono = iconoModulo(modulo.icono)
                const permisosModulo = modulo.permisos.filter(
                  (p) => p.accesoId !== 2
                )
                const concedidos = permisosModulo.filter((p) =>
                  concedido.has(p.idPermiso)
                ).length
                return (
                  <div key={modulo.idModulo} className="rounded-3xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icono className="size-4 text-primary" />
                      <p className="text-[16px] font-semibold">{modulo.modulo}</p>
                    </div>
<Badge
                        variant="rol"
                        className="border border-[#F99119] text-[10px]"
                      >
                        {concedidos}/{permisosModulo.length} permitidos
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {permisosModulo.map((permiso) => {
                        const actual = concedido.get(permiso.idPermiso)
                        const asignado = !!actual
                        const bloqueado =
                          pendiente !== null || !puedeEscribir
                        return (
                          <div
                            key={permiso.idPermiso}
                            className="rounded-2xl border px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2">
                                <Checkbox
                                  checked={asignado}
                                  disabled={bloqueado}
                                  onCheckedChange={() =>
                                    asignado
                                      ? quitarPermiso(
                                          permiso.idPermiso,
                                          actual.idRolPermiso
                                        )
                                      : asignarPermiso(permiso.idPermiso)
                                  }
                                />
                                <span className="text-[14px] font-semibold">
                                  {permiso.nombre}
                                </span>
                              </label>
                              {pendiente === permiso.idPermiso && (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                            {asignado && permiso.acciones.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 pl-7">
                                {permiso.acciones.map((accion) => {
                                  const marcado = actual.acciones.has(accion)
                                  return (
                                    <label
                                      key={accion}
                                      className="flex items-center gap-1.5 text-[11px] font-light"
                                    >
                                      <Checkbox
                                        checked={marcado}
                                        disabled={bloqueado}
                                        onCheckedChange={() =>
                                          toggleAccion(
                                            permiso.idPermiso,
                                            accion,
                                            marcado
                                          )
                                        }
                                      />
                                      <span>
                                        {accionNombre.get(accion) ?? accion}
                                      </span>
                                    </label>
                                  )
                                })}
                                {actual.acciones.size === 0 && (
                                  <span className="text-[11px] font-light text-muted-foreground">
                                    Solo lectura
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}