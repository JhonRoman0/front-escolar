"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, FileDown, Pencil, Plus, QrCode, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { useCrudAlumnos, useAlumnos } from "@/hooks/use-estudiantes"
import { useGradosPorNivel, useNiveles, useSeccionesPorGrado, useTurnos } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import type { AlumnoResponse } from "@/lib/api/estudiantes"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfAlumnos } from "@/lib/reportes/generar-pdf"
import { generarExcelAlumnos } from "@/lib/reportes/generar-excel"
import { generarCsvAlumnos } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { AlumnoFormDialog } from "./alumno-form-dialog"
import { AlumnoQrModal } from "./alumno-qr-modal"

const TAMANIO_PAGINA = 10

const AVATAR_COLORS = ["bg-[#3A62D4]", "bg-[#16A34A]", "bg-[#8EA5E6]", "bg-[#FAA94B]", "bg-[#DC2626]", "bg-[#E1E7F9]"]

function avatarColor(nombre: string) {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function SinMatriculaBadge() {
  return <Badge variant="outline" className="text-[11px] font-normal">Sin matrícula</Badge>
}

export function AlumnosTab() {
  const [page, setPage] = useState(0)
  const [busqueda, setBusqueda] = useState("")
  const [idNivel, setIdNivel] = useState<number | null>(null)
  const [idGrado, setIdGrado] = useState<number | null>(null)
  const [idSeccion, setIdSeccion] = useState<number | null>(null)
  const [idTurno, setIdTurno] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: niveles = [] } = useNiveles()
  const { data: gradosPorNivel } = useGradosPorNivel(idNivel)
  const { data: secciones } = useSeccionesPorGrado(idGrado)
  const { data: turnos = [] } = useTurnos()

  // Reset cascada
  useEffect(() => {
    setIdGrado(null)
    setIdSeccion(null)
  }, [idNivel])
  useEffect(() => {
    setIdSeccion(null)
  }, [idGrado])
  useEffect(() => {
    setPage(0)
  }, [idNivel, idGrado, idSeccion, idTurno, busqueda])

  const filtros = useMemo(
    () => ({
      idNivel: idNivel ?? undefined,
      idGrado: idGrado ?? undefined,
      idSeccion: idSeccion ?? undefined,
      idTurno: idTurno ?? undefined,
    }),
    [idNivel, idGrado, idSeccion, idTurno]
  )

  const { data, isLoading, isError, refetch } = useAlumnos(page, TAMANIO_PAGINA, filtros)
  const crud = useCrudAlumnos()
  const puedeCrear = usePuede("ALUMNOS", "CREAR")
  const puedeActualizar = usePuede("ALUMNOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("ALUMNOS", "ELIMINAR")
  const puedeExportar = usePuede("ALUMNOS", "IMPRIMIR_EXPORTAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AlumnoResponse | null>(null)
  const [dialogSeq, setDialogSeq] = useState(0)
  const [qrAlumno, setQrAlumno] = useState<AlumnoResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)

  const gradosOpciones = idNivel ? (gradosPorNivel ?? []) : []
  // Si no hay nivel seleccionado, no mostrar grados (elige nivel primero)

  const alumnosFiltrados = useMemo(() => {
    if (!data?.content) return []
    if (!busqueda.trim()) return data.content
    const q = busqueda.trim().toLowerCase()
    return data.content.filter((a) => {
      const nombre = `${a.nombre} ${a.apellidoPat} ${a.apellidoMat}`.toLowerCase()
      return nombre.includes(q) || a.codigo.toLowerCase().includes(q) || (a.documentoIdentidad ?? "").toLowerCase().includes(q)
    })
  }, [data?.content, busqueda])

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string,
    _filtros: Record<string, string>
  ) {
    const datos = await reportesApi.alumnos(inicio, fin, {
      idGradoSeccion: filtroGradoSeccion ?? undefined,
    })
    if (datos.length === 0) {
      toast.warning("No hay alumnos en el rango y filtros seleccionados")
      return
    }
    if (formato === "pdf") generarPdfAlumnos({ datos, inicio, fin })
    else if (formato === "excel") generarExcelAlumnos({ datos, inicio, fin })
    else generarCsvAlumnos({ datos, inicio, fin })
    toast.success(`Reporte ${formato.toUpperCase()} generado (${datos.length} registros)`)
  }

  async function handleEliminar(alumno: AlumnoResponse) {
    try {
      await crud.eliminar.mutateAsync(alumno.idAlumno)
      toast.success(`Alumno "${alumno.nombre} ${alumno.apellidoPat}" eliminado`)
      if (data?.content.length === 1 && page > 0) {
        setPage((p) => p - 1)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card className="rounded-[20px] border-[0.80px] border-[#D9DBE9]">
      <CardContent className="flex flex-col gap-4 p-4">
        {/* Filtros Figma: Buscar + 4 selects + Generar reporte */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-[358px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por alumno, codigo o DNI"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white pl-9 text-[13px] placeholder:text-[12px]"
            />
          </div>

          <Select value={idNivel ? String(idNivel) : "__all"} onValueChange={(v) => setIdNivel(v === "__all" ? null : Number(v))}>
            <SelectTrigger className="h-8 w-[162px] rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px]">
              <SelectValue>{niveles.find((n) => n.idNivel === idNivel)?.nombre ?? "Todos los niveles"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all">Todos los niveles</SelectItem>
                {niveles.map((n) => (
                  <SelectItem key={n.idNivel} value={String(n.idNivel)}>
                    {n.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {/* Grados depende de nivel */}
          <Select
            value={idGrado ? String(idGrado) : "__all"}
            onValueChange={(v) => setIdGrado(v === "__all" ? null : Number(v))}
            disabled={!idNivel}
          >
            <SelectTrigger className="h-8 w-[162px] rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px] disabled:opacity-50">
              <SelectValue>{gradosOpciones.find((g) => g.idGrado === idGrado)?.nombre ?? "Todos los grados"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all">Todos los grados</SelectItem>
                {gradosOpciones.map((g) => (
                  <SelectItem key={g.idGrado} value={String(g.idGrado)}>
                    {g.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={idSeccion ? String(idSeccion) : "__all"}
            onValueChange={(v) => setIdSeccion(v === "__all" ? null : Number(v))}
            disabled={!idGrado}
          >
            <SelectTrigger className="h-8 w-[162px] rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px] disabled:opacity-50">
              <SelectValue>{secciones?.find((s) => s.idSeccion === idSeccion)?.nombre ?? "Todas las secciones"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all">Todas las secciones</SelectItem>
                {(secciones ?? []).map((s) => (
                  <SelectItem key={s.idSeccion} value={String(s.idSeccion)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={idTurno ? String(idTurno) : "__all"} onValueChange={(v) => setIdTurno(v === "__all" ? null : Number(v))}>
            <SelectTrigger className="h-8 w-[162px] rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px]">
              <SelectValue>{turnos.find((t) => t.idTurno === idTurno)?.nombre ?? "Todos los turnos"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all">Todos los turnos</SelectItem>
                {turnos.map((t) => (
                  <SelectItem key={t.idTurno} value={String(t.idTurno)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            {puedeExportar && (
              <Button variant="outline" size="sm" className="h-8 rounded-[8px] border-[#A9A9AA] text-[12px] font-semibold text-[#495057]" onClick={() => setReporteOpen(true)}>
                <FileDown data-icon="inline-start" />
                Generar reporte
              </Button>
            )}
            {puedeCrear && (
              <Button
                className="h-8 rounded-[8px] bg-[#274CB4] text-white hover:bg-[#274CB4]/85 text-[12px] font-semibold"
                onClick={() => {
                  setEditando(null)
                  setDialogSeq((s) => s + 1)
                  setDialogOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Nuevo alumno
              </Button>
            )}
          </div>
        </div>

        {/* Tabla Figma: 10 cols compactas, sin bulto */}
        <div className="overflow-x-auto rounded-[8px] border border-[#D9DBE9]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8F9FA] hover:bg-[#F8F9FA]">
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Alumno</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Codigo</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">DNI</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Apoderado</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Nivel</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Grado</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Sección</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Turno</TableHead>
                <TableHead className="whitespace-nowrap text-[12px] font-semibold text-[#495057]">Estado</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[12px] font-semibold text-[#495057]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={10} />
              ) : isError ? (
                <MensajeSinDatos columnas={10} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !alumnosFiltrados.length ? (
                <MensajeSinDatos columnas={10} mensaje={busqueda ? "Sin resultados para la búsqueda." : "Aún no hay alumnos."} />
              ) : (
                alumnosFiltrados.map((alumno) => {
                  const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPat} ${alumno.apellidoMat}`.trim()
                  const iniciales = `${alumno.nombre[0] ?? ""}${alumno.apellidoPat[0] ?? ""}`.toUpperCase()
                  const bg = avatarColor(nombreCompleto)
                  const isExpanded = expandedId === alumno.idAlumno
                  return (
                    <Fragment key={alumno.idAlumno}>
                      <TableRow
                        key={alumno.idAlumno}
                        className={`cursor-pointer hover:bg-muted/40 ${isExpanded ? "bg-muted/30" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : alumno.idAlumno)}
                      >
                        <TableCell className="min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-6 shrink-0 rounded-md"
                              aria-label={isExpanded ? "Contraer" : "Expandir apoderados"}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(isExpanded ? null : alumno.idAlumno)
                              }}
                            >
                              <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </Button>
                            <Avatar className={`size-8 rounded-full border-[0.50px] border-[#A9A9AA] ${alumno.urlFoto ? "" : bg}`}>
                              {alumno.urlFoto ? (
                                <AvatarImage src={alumno.urlFoto} alt={nombreCompleto} />
                              ) : (
                                <AvatarFallback className={`rounded-full text-[12px] font-semibold text-white ${bg}`}>{iniciales}</AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-[12px] font-normal text-[#212529]">{nombreCompleto}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[12px] text-[#7D7D7F] whitespace-nowrap">{alumno.codigo}</TableCell>
                        <TableCell className="text-center text-[12px] text-[#7D7D7F]">{alumno.documentoIdentidad || "—"}</TableCell>
                        <TableCell className="max-w-[160px] text-[12px]">
                          {alumno.apoderados.length ? (
                            <span className="truncate text-[#212529]">
                              {`${alumno.apoderados[0].nombre} ${alumno.apoderados[0].apellidoPat}`.trim()}
                              {alumno.apoderados[1] ? ` +1` : ""}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[11px] font-normal border-dashed">Sin apoderado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.nivel === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.nivel}
                        </TableCell>
                        <TableCell className="text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.grado === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.grado}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-[#7D7D7F]">{alumno.seccion === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.seccion}</TableCell>
                        <TableCell className="text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.turno === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.turno}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge accesoId={alumno.accesoId} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="size-7 rounded-[8px] border-[0.50px] border-[#A9A9AA]"
                              aria-label={`QR de ${nombreCompleto}`}
                              onClick={(e) => { e.stopPropagation(); setQrAlumno(alumno) }}
                            >
                              <QrCode className="size-3.5" />
                            </Button>
                            {puedeActualizar && (
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="size-7 rounded-[8px] border-[0.50px] border-[#A9A9AA]"
                                aria-label={`Editar ${nombreCompleto}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditando(alumno)
                                  setDialogSeq((s) => s + 1)
                                  setDialogOpen(true)
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {puedeEliminar && (
                              <span onClick={(e) => e.stopPropagation()}>
                                <ConfirmarEliminar titulo="Eliminar alumno" descripcion={`Se marcará a "${nombreCompleto}" como eliminado.`} onConfirm={() => handleEliminar(alumno)} />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${alumno.idAlumno}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={10} className="p-3">
                            <div className="flex flex-col gap-3">
                              <p className="text-[12px] font-semibold text-[#495057]">Apoderados — máx 2</p>
                              {alumno.apoderados.length ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {alumno.apoderados.slice(0, 2).map((ap, idx) => (
                                    <div key={ap.idApoderado ?? idx} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                                      <Avatar className="size-9 rounded-full">
                                        {ap.urlFoto ? (
                                          <AvatarImage src={ap.urlFoto} alt={`${ap.nombre} ${ap.apellidoPat}`} />
                                        ) : (
                                          <AvatarFallback className="rounded-full text-xs">
                                            {(ap.nombre[0] ?? "") + (ap.apellidoPat[0] ?? "")}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-foreground">
                                          {`${ap.nombre} ${ap.apellidoPat} ${ap.apellidoMat}`.trim()}{" "}
                                          <Badge variant="secondary" className="ml-1 text-[10px]">{idx === 0 ? "Principal" : "Secundario"}</Badge>
                                        </p>
                                        <p className="truncate text-[12px] text-muted-foreground">
                                          {ap.documentoIdentidad ? `DNI ${ap.documentoIdentidad} · ` : ""}
                                          {ap.parentesco || "—"} {ap.celular ? `· ${ap.celular}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {alumno.apoderados.length === 1 && (
                                    <div className="flex items-center justify-center rounded-lg border border-dashed p-3 text-[12px] text-muted-foreground">
                                      Sin apoderado secundario
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center rounded-lg border border-dashed bg-white p-3 text-[12px] text-muted-foreground">
                                  Sin apoderados registrados — edita el alumno para agregar
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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

        {!!data?.totalPages && data.totalPages > 1 && <TablaPaginacion data={data} onPage={setPage} />}

        <AlumnoFormDialog
          key={`${editando ? `edit-${editando.idAlumno}` : "create"}-${dialogSeq}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          alumno={editando}
        />

        {qrAlumno && <AlumnoQrModal alumno={qrAlumno} open={!!qrAlumno} onOpenChange={(open) => { if (!open) setQrAlumno(null) }} />}

        <ReporteModal
          open={reporteOpen}
          onOpenChange={setReporteOpen}
          titulo="Reporte de alumnos"
          descripcion="Descarga el padrón de alumnos del rango en PDF, Excel o CSV."
          presets={["ultimos_7", "este_mes", "personalizado"]}
          filtros={[
            {
              id: "idGradoSeccion",
              label: "Grado y sección",
              opciones: [],
              valor: "",
              onChange: () => {},
              render: () => <GradoSeccionCascada value={filtroGradoSeccion} onChange={setFiltroGradoSeccion} />,
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}
