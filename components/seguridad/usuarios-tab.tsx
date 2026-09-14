"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Lock, LockOpen, FileDown, Pencil, Plus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { useEliminarUsuario, useDesbloquearUsuario, useUsuarios, useRoles } from "@/hooks/use-seguridad"
import { usePuede } from "@/hooks/use-permisos"
import type { UsuarioResponse } from "@/lib/api/seguridad"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfUsuarios } from "@/lib/reportes/generar-pdf"
import { generarExcelUsuarios } from "@/lib/reportes/generar-excel"
import { generarCsvUsuarios } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { ConfirmarEliminar } from "./confirmar-eliminar"
import { EstadoBadge } from "./estado-badge"
import { FilasCargando, MensajeSinDatos } from "./shared"
import UsuarioFormDialog from "./usuario-form-dialog"

const TAMANIO_PAGINA = 10

const MINUTOS_BLOQUEO = 30

function estaBloqueado(usuario: UsuarioResponse): boolean {
  if (!usuario.fechaBloqueo) return false
  const finBloqueo = new Date(usuario.fechaBloqueo)
  if (Number.isNaN(finBloqueo.getTime())) return false
  finBloqueo.setMinutes(finBloqueo.getMinutes() + MINUTOS_BLOQUEO)
  return new Date() < finBloqueo
}

export default function UsuariosTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, refetch } = useUsuarios(
    page,
    TAMANIO_PAGINA
  )
  const eliminar = useEliminarUsuario()
  const desbloquear = useDesbloquearUsuario()
  const puedeCrear = usePuede("USUARIOS", "CREAR")
  const puedeActualizar = usePuede("USUARIOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("USUARIOS", "ELIMINAR")
  const puedeExportar = usePuede("USUARIOS", "IMPRIMIR_EXPORTAR")
  const { data: roles = [] } = useRoles()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<UsuarioResponse | null>(null)
  const [dialogSeq, setDialogSeq] = useState(0)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroRol, setFiltroRol] = useState("")

  const opcionesRol = useMemo(
    () => roles.map((r) => ({ value: String(r.idRol), label: r.nombre })),
    [roles]
  )

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    filtros: Record<string, string>
  ) {
    const datos = await reportesApi.usuarios(inicio, fin, {
      idRol: filtros.idRol ? Number(filtros.idRol) : undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay usuarios en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfUsuarios({ datos, inicio, fin })
    else if (formato === "excel") generarExcelUsuarios({ datos, inicio, fin })
    else generarCsvUsuarios({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  async function handleEliminar(usuario: UsuarioResponse) {
    try {
      await eliminar.mutateAsync(usuario.idUsuario)
      toast.success(`Usuario "${usuario.nombre} ${usuario.apellidoPat}" eliminado`)
      if (data?.content.length === 1 && page > 0) {
        setPage((p) => p - 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  async function handleDesbloquear(usuario: UsuarioResponse) {
    try {
      await desbloquear.mutateAsync(usuario.idUsuario)
      toast.success(`Usuario "${usuario.nombre} ${usuario.apellidoPat}" desbloqueado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desbloquear")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold">Usuarios</h2>
            <p className="text-[16px] text-[#7D7D7F]">
              El código de acceso se genera automáticamente según el primer rol.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puedeExportar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReporteOpen(true)}
              >
                <FileDown />
                Generar reporte
              </Button>
            )}
            {puedeCrear && (
              <Button
                className="bg-[#274CB4] text-white hover:bg-[#274CB4]/80"
                onClick={() => {
                  setEditando(null)
                  setDialogSeq((s) => s + 1)
                  setDialogOpen(true)
                }}
              >
                <Plus />
                Nuevo usuario
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Bloqueado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.content.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay usuarios." />
            ) : (
              data.content.map((usuario) => {
                const nombreCompleto = `${usuario.nombre} ${usuario.apellidoPat} ${usuario.apellidoMat}`.trim()
                const iniciales = `${usuario.nombre[0] ?? ""}${usuario.apellidoPat[0] ?? ""}`.toUpperCase()
                return (
                  <TableRow key={usuario.idUsuario}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {usuario.urlFoto ? (
                            <AvatarImage
                              src={usuario.urlFoto}
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
                            {usuario.documentoIdentidad || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{usuario.codigo}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {usuario.roles.map((rol) => (
                          <Badge key={rol.idRol} variant="rol">
                            {rol.nombre}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{usuario.gmail || "—"}</TableCell>
                    <TableCell>
                      <EstadoBadge acceso={usuario.acceso} />
                    </TableCell>
                    <TableCell>
                      {estaBloqueado(usuario) ? (
                        <Badge variant="warning">
                          <Lock />
                          Bloqueado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {estaBloqueado(usuario) && puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Desbloquear ${nombreCompleto}`}
                            onClick={() => handleDesbloquear(usuario)}
                            disabled={desbloquear.isPending}
                          >
                            <LockOpen />
                          </Button>
                        )}
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar ${nombreCompleto}`}
                            onClick={() => {
                              setEditando(usuario)
                              setDialogSeq((s) => s + 1)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar usuario"
                            descripcion={`Se marcará a "${nombreCompleto}" como eliminado. Perderá el acceso al sistema.`}
                            onConfirm={() => handleEliminar(usuario)}
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

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        {!!data?.totalPages && data.totalPages > 1 && (
          <TablaPaginacion data={data} onPage={setPage} />
        )}

        <UsuarioFormDialog
          key={`${editando ? `edit-${editando.idUsuario}` : "create"}-${dialogSeq}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          usuario={editando}
        />

        <ReporteModal
          open={reporteOpen}
          onOpenChange={setReporteOpen}
          titulo="Reporte de usuarios"
          descripcion="Descarga el listado de usuarios del rango en PDF, Excel o CSV."
          presets={["ultimos_7", "este_mes", "personalizado"]}
          filtros={[
            {
              id: "idRol",
              label: "Rol",
              opciones: opcionesRol,
              valor: filtroRol,
              onChange: setFiltroRol,
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}