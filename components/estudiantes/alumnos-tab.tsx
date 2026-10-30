"use client"

import { Fragment, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, FileDown, Pencil, Plus, QrCode, RotateCcw, Search } from "lucide-react"

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

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { TablaPaginacion } from "@/components/shared/paginacion-tabla"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { useAlumnos } from "@/hooks/use-estudiantes"
import { useAniosEscolares, useGradosPorNivel, useNiveles, useSeccionesPorGrado, useTurnos } from "@/hooks/use-academico"
import { ESTADO_ANIO, estadoAnioTexto } from "@/lib/api/academico"
import { usePuede } from "@/hooks/use-permisos"
import type { AlumnoResponse, ApoderadoResponse } from "@/lib/api/estudiantes"
import { reportesApi } from "@/lib/api/reportes"
import { generarPdfAlumnos } from "@/lib/reportes/generar-pdf"
import { generarExcelAlumnos } from "@/lib/reportes/generar-excel"
import { generarCsvAlumnos } from "@/lib/reportes/generar-csv"
import { ReporteModal } from "@/components/reportes/reporte-modal"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { AlumnoEditarDialog } from "./alumno-editar-dialog"
import { ApoderadoAgregarDialog } from "./apoderado-agregar-dialog"
import { ApoderadoEditarDialog } from "./apoderado-editar-dialog"
import { AlumnoQrModal } from "./alumno-qr-modal"

const TAMANIO_PAGINA = 10

const AVATAR_COLORS = ["bg-brand-info", "bg-[#16A34A]", "bg-[#8EA5E6]", "bg-[#FAA94B]", "bg-[#DC2626]", "bg-brand-subtle"]

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
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const { data: anios = [], isLoading: cargandoAnios, isError: errorAnios, refetch: reintentarAnios } = useAniosEscolares()
  const anioVigente = anios.find((a) => a.estado === ESTADO_ANIO.VIGENTE)
  const idAnio = idAnioElegido ?? anioVigente?.idAnio ?? null
  const anioSeleccionado = anios.find((a) => a.idAnio === idAnio)
  const puedeConsultar = !!anioSeleccionado && !errorAnios && !cargandoAnios

  const { data: niveles = [] } = useNiveles()
  const { data: gradosPorNivel } = useGradosPorNivel(idNivel)
  const { data: secciones } = useSeccionesPorGrado(idGrado)
  const { data: turnos = [] } = useTurnos()

  function cambiarAnio(valor: number) {
    if (valor === idAnio) return
    setIdAnioElegido(valor)
    setIdGrado(null)
    setIdSeccion(null)
    setPage(0)
  }

  function cambiarNivel(valor: number | null) {
    if (valor === idNivel) return
    setIdNivel(valor)
    setIdGrado(null)
    setIdSeccion(null)
    setPage(0)
  }

  function cambiarGrado(valor: number | null) {
    if (valor === idGrado) return
    setIdGrado(valor)
    setIdSeccion(null)
    setPage(0)
  }

  function cambiarSeccion(valor: number | null) {
    if (valor === idSeccion) return
    setIdSeccion(valor)
    setPage(0)
  }

  function cambiarTurno(valor: number | null) {
    if (valor === idTurno) return
    setIdTurno(valor)
    setPage(0)
  }

  function cambiarBusqueda(valor: string) {
    if (valor === busqueda) return
    setBusqueda(valor)
    setPage(0)
  }

  const filtros = useMemo(
    () => ({
      idAnio: idAnio ?? undefined,
      idNivel: idNivel ?? undefined,
      idGrado: idGrado ?? undefined,
      idSeccion: idSeccion ?? undefined,
      idTurno: idTurno ?? undefined,
    }),
    [idAnio, idNivel, idGrado, idSeccion, idTurno]
  )

  const { data, isLoading, isError, refetch } = useAlumnos(page, TAMANIO_PAGINA, filtros, puedeConsultar)
  const puedeActualizar = usePuede("ALUMNOS", "ACTUALIZAR")
  const puedeEditarApoderado = usePuede("APODERADOS", "ACTUALIZAR")
  const puedeAgregarApoderado = usePuede("APODERADOS", "CREAR")
  const puedeExportar = usePuede("ALUMNOS", "IMPRIMIR_EXPORTAR")

  const [editando, setEditando] = useState<AlumnoResponse | null>(null)
  const [agregandoApoderado, setAgregandoApoderado] = useState<AlumnoResponse | null>(null)
  const [apoderadoEditando, setApoderadoEditando] = useState<{ alumno: AlumnoResponse; apoderado: ApoderadoResponse } | null>(null)
  const [qrAlumno, setQrAlumno] = useState<AlumnoResponse | null>(null)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<number | null>(null)

  const gradosOpciones = idNivel && idAnio
    ? (gradosPorNivel ?? []).filter((g) => g.secciones.some((s) => s.idAnio === idAnio))
    : []
  const seccionesOpciones = (secciones ?? []).filter((s) => s.idAnio === idAnio)
  const nombreSeccion = (s: (typeof seccionesOpciones)[number]) =>
    seccionesOpciones.some((otra) => otra.idGradoSeccion !== s.idGradoSeccion && otra.nombre === s.nombre)
      ? `${s.nombre} · ${s.turno}`
      : s.nombre
  const seccionSeleccionada = seccionesOpciones.find((s) => s.idSeccion === idSeccion)
  // Si no hay nivel seleccionado, no mostrar grados (elige nivel primero)

  const hayFiltros =
    idAnio !== (anioVigente?.idAnio ?? null) || busqueda !== "" || idNivel !== null || idGrado !== null || idSeccion !== null || idTurno !== null

  function limpiarFiltros() {
    setIdAnioElegido(null)
    setBusqueda("")
    setIdNivel(null)
    setIdGrado(null)
    setIdSeccion(null)
    setIdTurno(null)
    setPage(0)
  }

  const contenido = puedeConsultar ? data?.content : undefined
  const alumnosFiltrados = useMemo(() => {
    if (!contenido) return []
    if (!busqueda.trim()) return contenido
    const q = busqueda.trim().toLowerCase()
    return contenido.filter((a) => {
      const nombre = `${a.nombre} ${a.apellidoPat} ${a.apellidoMat}`.toLowerCase()
      return nombre.includes(q) || a.codigo.toLowerCase().includes(q) || (a.documentoIdentidad ?? "").toLowerCase().includes(q)
    })
  }, [contenido, busqueda])

  async function handleDescargarReporte(
    formato: "pdf" | "excel" | "csv",
    inicio: string,
    fin: string
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

  return (
    <Card className="rounded-[20px] border-[0.80px] border-[#D9DBE9]">
      <CardContent className="flex flex-col gap-4 p-4">
        {/* Búsqueda y reportes independientes del contexto académico de la tabla. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 basis-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por alumno, código o DNI"
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              className="h-8 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white pl-9 text-[13px] placeholder:text-[12px]"
            />
          </div>
          {puedeExportar && (
            <Button variant="outline" size="sm" className="ml-auto h-8 rounded-[8px] border-[#A9A9AA] text-[12px] font-semibold text-[#495057]" onClick={() => setReporteOpen(true)}>
              <FileDown data-icon="inline-start" />
              Generar reporte
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={idAnio ? String(idAnio) : ""} onValueChange={(v) => v && cambiarAnio(Number(v))} disabled={cargandoAnios || errorAnios || !anios.length}>
            <SelectTrigger className="h-8 w-[240px] max-w-full shrink-0 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px]" aria-label="Año escolar">
              <SelectValue>{anioSeleccionado ? `${anioSeleccionado.anio} · ${estadoAnioTexto(anioSeleccionado.estado)}` : "Selecciona un año escolar"}</SelectValue>
            </SelectTrigger>
            <SelectContent><SelectGroup>
              {[...anios].sort((a, b) => b.anio.localeCompare(a.anio)).map((a) => (
                <SelectItem key={a.idAnio} value={String(a.idAnio)}>{a.anio} · {estadoAnioTexto(a.estado)}</SelectItem>
              ))}
            </SelectGroup></SelectContent>
          </Select>
          <Select value={idNivel ? String(idNivel) : "__all"} onValueChange={(v) => cambiarNivel(v === "__all" ? null : Number(v))}>
            <SelectTrigger className="h-8 w-[162px] max-w-full shrink-0 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px]">
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
            onValueChange={(v) => cambiarGrado(v === "__all" ? null : Number(v))}
            disabled={!idNivel || !puedeConsultar}
          >
            <SelectTrigger className="h-8 w-[162px] max-w-full shrink-0 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px] disabled:opacity-50">
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
            onValueChange={(v) => cambiarSeccion(v === "__all" ? null : Number(v))}
            disabled={!idGrado || !puedeConsultar}
          >
            <SelectTrigger className="h-8 w-[162px] max-w-full shrink-0 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px] disabled:opacity-50">
              <SelectValue>{seccionSeleccionada ? nombreSeccion(seccionSeleccionada) : "Todas las secciones"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all">Todas las secciones</SelectItem>
                {seccionesOpciones.map((s) => (
                  <SelectItem key={s.idGradoSeccion} value={String(s.idSeccion)}>
                    {nombreSeccion(s)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={idTurno ? String(idTurno) : "__all"} onValueChange={(v) => cambiarTurno(v === "__all" ? null : Number(v))}>
            <SelectTrigger className="h-8 w-[162px] max-w-full shrink-0 rounded-[8px] border-[0.80px] border-[#A9A9AA] bg-white text-[12px]">
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
            {hayFiltros && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-muted-foreground" onClick={limpiarFiltros}>
                <RotateCcw className="mr-1 size-3.5" />
                Limpiar filtros
              </Button>
            )}

          </div>
        </div>

        <p className="text-xs text-muted-foreground">La consulta por año incluye solo matrículas activas; no representa un histórico completo de matrículas.</p>

        {/* Tabla Figma: 10 cols compactas, sin bulto */}
        <div className="overflow-x-auto rounded-[8px] border border-[#D9DBE9]">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead className="text-center">Código</TableHead>
                <TableHead className="text-center">DNI</TableHead>
                <TableHead>Apoderado</TableHead>
                <TableHead className="text-center">Nivel</TableHead>
                <TableHead className="text-center">Grado</TableHead>
                <TableHead className="text-center">Sección</TableHead>
                <TableHead className="text-center">Turno</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargandoAnios ? (
                <FilasCargando columnas={10} />
              ) : errorAnios ? (
                <MensajeSinDatos columnas={10} mensaje="No se pudieron cargar los años escolares." />
              ) : !puedeConsultar ? (
                <MensajeSinDatos columnas={10} mensaje={anios.length ? "Selecciona un año escolar para consultar alumnos." : "No hay años escolares disponibles."} />
              ) : isLoading ? (
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
                        <TableCell className="text-center font-mono text-[12px] text-[#7D7D7F] whitespace-nowrap">{alumno.codigo}</TableCell>
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
                        <TableCell className="text-center text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.nivel === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.nivel}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.grado === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.grado}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-[#7D7D7F]">{alumno.seccion === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.seccion}</TableCell>
                        <TableCell className="text-center text-[12px] text-[#7D7D7F] whitespace-nowrap">
                          {alumno.turno === "Sin matrícula" ? <SinMatriculaBadge /> : alumno.turno}
                        </TableCell>
                        <TableCell className="text-center">
                          <EstadoBadge accesoId={alumno.accesoId} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
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
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${alumno.idAlumno}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={10} className="p-3">
                            <div className="flex flex-col gap-3">
                              {alumno.tieneDiscapacidad && (
                                <p className="text-[12px] text-[#495057]">
                                  <span className="font-semibold">Discapacidad:</span> {alumno.discapacidad}
                                </p>
                              )}
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
                                      {puedeEditarApoderado && (
                                        <Button
                                          variant="outline"
                                          size="icon-sm"
                                          className="size-7 rounded-[8px] border-[0.50px] border-[#A9A9AA]"
                                          aria-label={`Editar a ${ap.nombre} ${ap.apellidoPat}`}
                                          onClick={() => setApoderadoEditando({ alumno, apoderado: ap })}
                                        >
                                          <Pencil className="size-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {alumno.apoderados.length === 1 && (
                                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-[12px] text-muted-foreground">
                                      Sin apoderado secundario
                                      {puedeAgregarApoderado && (
                                        <Button variant="outline" size="sm" onClick={() => setAgregandoApoderado(alumno)}>
                                          <Plus data-icon="inline-start" />
                                          Agregar apoderado
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-white p-3 text-[12px] text-muted-foreground">
                                  Sin apoderados registrados
                                  {puedeAgregarApoderado && (
                                    <Button variant="outline" size="sm" onClick={() => setAgregandoApoderado(alumno)}>
                                      <Plus data-icon="inline-start" />
                                      Agregar apoderado
                                    </Button>
                                  )}
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

        {puedeConsultar && isError && (
          <BotonReintentar refetch={refetch} />
        )}

        {errorAnios && <BotonReintentar refetch={reintentarAnios} />}
        {puedeConsultar && !!data?.totalPages && data.totalPages > 1 && <TablaPaginacion data={data} onPage={setPage} />}

        <AlumnoEditarDialog
          alumno={editando}
          onOpenChange={(open) => {
            if (!open) setEditando(null)
          }}
        />
        <ApoderadoAgregarDialog
          alumno={agregandoApoderado}
          onOpenChange={(open) => {
            if (!open) setAgregandoApoderado(null)
          }}
        />
        <ApoderadoEditarDialog
          alumno={apoderadoEditando?.alumno ?? null}
          apoderado={apoderadoEditando?.apoderado ?? null}
          onOpenChange={(open) => {
            if (!open) setApoderadoEditando(null)
          }}
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
              onChange: () => { },
              render: () => <GradoSeccionCascada value={filtroGradoSeccion} onChange={setFiltroGradoSeccion} />,
            },
          ]}
          onDescargar={handleDescargarReporte}
        />
      </CardContent>
    </Card>
  )
}
