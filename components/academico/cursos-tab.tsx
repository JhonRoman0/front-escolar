"use client"

import { Fragment, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  CornerDownRight,
  FileCheck,
  FileSpreadsheet,
  Lock,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BuscadorTabla } from "@/components/shared/buscador-tabla"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import {
  AccionesFila,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { guardarConToast } from "@/hooks/guardar-con-toast"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { useEliminarConToast } from "@/hooks/use-eliminar-toast"
import { usePuede } from "@/hooks/use-permisos"
import { useResetAlAbrir } from "@/hooks/use-reset-al-abrir"
import {
  useAniosEscolares,
  useCambiarEstadoCurso,
  useCambiarSubcursos,
  useCopiarCursos,
  useCursos,
  useEliminarCurso,
  useGuardarSubcurso,
  useImportarCursos,
  useNiveles,
  useVistaPreviaCursos,
} from "@/hooks/use-academico"
import { useCompetencias } from "@/hooks/use-evaluacion"
import {
  ACCESO,
  ESTADO_ANIO,
  type AnioEscolarResponse,
  type CursoImportResponse,
  type CursoResponse,
  type CursoVistaPreviaResponse,
  type NivelResponse,
} from "@/lib/api/academico"
import { subcursoSchema, type SubcursoValues } from "@/lib/schemas/academico"

const ESTADO_OPCIONES = [
  { value: "1", label: "Activo" },
  { value: "3", label: "Inactivo" },
]

const COLUMNAS = 7

// ── Filtro de año y nivel (compartido con la pestaña Competencias) ───────

/**
 * Año y nivel de la malla que se está viendo. Mientras el usuario no elige,
 * se muestra el año por comenzar (el que se configura), o el vigente si no
 * hay otro, y el primer nivel.
 */
export function useFiltrosMalla() {
  const { data: anios = [] } = useAniosEscolares()
  const { data: niveles = [] } = useNiveles()
  const [idAnioElegido, setIdAnio] = useState<number | null>(null)
  const [idNivelElegido, setIdNivel] = useState<number | null>(null)

  const anioPorDefecto =
    anios.find((a) => a.estado === ESTADO_ANIO.POR_COMENZAR) ??
    anios.find((a) => a.estado === ESTADO_ANIO.VIGENTE) ??
    anios[0]
  const idAnio = idAnioElegido ?? anioPorDefecto?.idAnio ?? null
  const idNivel = idNivelElegido ?? niveles[0]?.idNivel ?? null
  const anio = anios.find((a) => a.idAnio === idAnio) ?? null
  const nivel = niveles.find((n) => n.idNivel === idNivel) ?? null

  return { anios, niveles, idAnio, setIdAnio, idNivel, setIdNivel, anio, nivel }
}

export const TEXTO_ESTADO_ANIO: Record<number, string> = {
  [ESTADO_ANIO.VIGENTE]: "vigente",
  [ESTADO_ANIO.CERRADO]: "cerrado",
  [ESTADO_ANIO.POR_COMENZAR]: "por comenzar",
}

export function FiltrosMalla({
  anios,
  niveles,
  idAnio,
  idNivel,
  onAnio,
  onNivel,
}: {
  anios: AnioEscolarResponse[]
  niveles: NivelResponse[]
  idAnio: number | null
  idNivel: number | null
  onAnio: (id: number) => void
  onNivel: (id: number) => void
}) {
  const opcionesAnio = [...anios]
    .sort((a, b) => b.anio.localeCompare(a.anio))
    .map((a) => ({ value: String(a.idAnio), label: `${a.anio} (${TEXTO_ESTADO_ANIO[a.estado] ?? ""})` }))
  return (
    <>
      <FilterSelect
        label="Año"
        value={idAnio ? String(idAnio) : ""}
        onValueChange={(v) => v && onAnio(Number(v))}
        options={opcionesAnio}
        includeAll={false}
        allLabel="Selecciona"
        className="w-[240px]"
      />
      <FilterSelect
        label="Nivel"
        value={idNivel ? String(idNivel) : ""}
        onValueChange={(v) => v && onNivel(Number(v))}
        options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
        includeAll={false}
        allLabel="Selecciona"
        className="w-[180px]"
      />
    </>
  )
}

/** Aviso de solo lectura cuando el año no está por comenzar. */
export function AvisoMallaBloqueada({ anio, extra }: { anio: AnioEscolarResponse; extra?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
      <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold leading-tight">
          Año escolar {anio.anio} {TEXTO_ESTADO_ANIO[anio.estado]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Su malla curricular es de solo lectura. Solo se configura la de un año por comenzar.
          {extra ? ` ${extra}` : ""}
        </p>
      </div>
    </div>
  )
}

// ── Pestaña ──────────────────────────────────────────────────────────────

export function CursosTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio, idNivel, nivel } = filtros
  const { data, isLoading, isError, refetch } = useCursos({ idAnio, idNivel })

  const puedeCrear = usePuede("CURSOS", "CREAR")
  const puedeActualizar = usePuede("CURSOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("CURSOS", "ELIMINAR")

  const cambiarEstado = useCambiarEstadoCurso()
  const cambiarSubcursos = useCambiarSubcursos()
  const eliminar = useEliminarCurso()
  const eliminarConToast = useEliminarConToast()

  const [importarOpen, setImportarOpen] = useState(false)
  const [copiarOpen, setCopiarOpen] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [cambiandoId, setCambiandoId] = useState<number | null>(null)
  const [apagando, setApagando] = useState<CursoResponse | null>(null)
  const [subcursoDialog, setSubcursoDialog] = useState<{ area: CursoResponse; subcurso: CursoResponse | null } | null>(null)

  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const busquedaDebounced = useDebouncedValue(busqueda, 400)

  const cursos = useMemo(() => data ?? [], [data])
  const principales = useMemo(() => cursos.filter((c) => c.tipo !== "SUBCURSO"), [cursos])
  const subcursosPorArea = useMemo(() => {
    const mapa = new Map<number, CursoResponse[]>()
    for (const c of cursos) {
      if (c.tipo !== "SUBCURSO" || c.idCursoPadre == null) continue
      mapa.set(c.idCursoPadre, [...(mapa.get(c.idCursoPadre) ?? []), c])
    }
    return mapa
  }, [cursos])

  const configurable = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  // Un vigente sin cursos en el nivel admite una importación inicial (igual que el backend).
  const vigenteVacio = anio?.estado === ESTADO_ANIO.VIGENTE && !isLoading && principales.length === 0
  const origenesCopia = filtros.anios.filter(
    (a) => a.estado === ESTADO_ANIO.VIGENTE || a.estado === ESTADO_ANIO.CERRADO
  )
  const puedeImportar = puedeCrear && !!anio && (configurable || vigenteVacio)
  const puedeCopiar =
    puedeCrear && configurable && !isLoading && principales.length === 0 && origenesCopia.length > 0

  const filtrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase()
    return principales.filter((curso) => {
      if (filtroEstado && String(curso.accesoId) !== filtroEstado) return false
      if (!q) return true
      const subcursos = subcursosPorArea.get(curso.idCurso) ?? []
      return (
        curso.codigo?.toLowerCase().includes(q) ||
        curso.nombre.toLowerCase().includes(q) ||
        subcursos.some((s) => s.nombre.toLowerCase().includes(q))
      )
    })
  }, [principales, subcursosPorArea, busquedaDebounced, filtroEstado])

  const hayFiltros = busqueda.trim() !== "" || filtroEstado !== ""

  function alternarExpandido(idCurso: number, abierto?: boolean) {
    setExpandidos((prev) => {
      const siguiente = new Set(prev)
      if (abierto ?? !siguiente.has(idCurso)) siguiente.add(idCurso)
      else siguiente.delete(idCurso)
      return siguiente
    })
  }

  async function handleCambiarEstado(curso: CursoResponse, activar: boolean) {
    setCambiandoId(curso.idCurso)
    try {
      await cambiarEstado.mutateAsync({
        id: curso.idCurso,
        accesoId: activar ? ACCESO.ACTIVO : ACCESO.INACTIVO,
      })
      toast.success(`"${curso.nombre}" ${activar ? "activado" : "inactivado"}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar el estado")
    } finally {
      setCambiandoId(null)
    }
  }

  async function aplicarSubcursos(area: CursoResponse, tieneSubcursos: boolean) {
    setCambiandoId(area.idCurso)
    try {
      await cambiarSubcursos.mutateAsync({ id: area.idCurso, tieneSubcursos })
      alternarExpandido(area.idCurso, tieneSubcursos)
      toast.success(
        tieneSubcursos
          ? `Ya puedes agregar subcursos a "${area.nombre}"`
          : `"${area.nombre}" vuelve a dictarse como un solo curso`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar los subcursos")
      throw error
    } finally {
      setCambiandoId(null)
    }
  }

  function handleSwitchSubcursos(area: CursoResponse, tieneSubcursos: boolean) {
    // Apagarlo elimina los subcursos: si hay alguno, se confirma antes.
    if (!tieneSubcursos && (subcursosPorArea.get(area.idCurso)?.length ?? 0) > 0) {
      setApagando(area)
      return
    }
    aplicarSubcursos(area, tieneSubcursos).catch(() => {})
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Cursos"
          descripcion="Malla curricular por año escolar y nivel, importada del registro de notas del SIAGIE."
          acciones={
            <div className="flex flex-wrap items-center gap-2">
              {puedeCopiar && (
                <Button variant="outline" onClick={() => setCopiarOpen(true)}>
                  <Copy data-icon="inline-start" />
                  Copiar de otro año
                </Button>
              )}
              {puedeImportar && (
                <Button variant="brand" onClick={() => setImportarOpen(true)}>
                  <FileSpreadsheet data-icon="inline-start" />
                  Importar Excel
                </Button>
              )}
            </div>
          }
        />

        {anio && !configurable && (
          <AvisoMallaBloqueada
            anio={anio}
            extra={vigenteVacio && puedeCrear ? "Como este nivel aún no tiene cursos, puedes hacer una importación inicial." : undefined}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <FiltrosMalla
            anios={filtros.anios}
            niveles={filtros.niveles}
            idAnio={idAnio}
            idNivel={idNivel}
            onAnio={filtros.setIdAnio}
            onNivel={filtros.setIdNivel}
          />
          <BuscadorTabla
            value={busqueda}
            onValueChange={setBusqueda}
            placeholder="Buscar por código o nombre..."
            className="min-w-[200px] max-w-[320px] flex-1"
          />
          <FilterSelect
            value={filtroEstado}
            onValueChange={setFiltroEstado}
            options={ESTADO_OPCIONES}
            allLabel="Todos los estados"
            className="w-[170px]"
          />
          {hayFiltros && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => {
                setBusqueda("")
                setFiltroEstado("")
              }}
            >
              <RotateCcw className="mr-1 size-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[190px]">Código</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="w-[120px] text-center">Competencias</TableHead>
                <TableHead className="w-[110px]">Subcursos</TableHead>
                <TableHead className="w-[170px]">Estado</TableHead>
                <TableHead className="w-[90px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={COLUMNAS} />
              ) : isError ? (
                <MensajeSinDatos columnas={COLUMNAS} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !filtrados.length ? (
                <MensajeSinDatos
                  columnas={COLUMNAS}
                  mensaje={
                    hayFiltros
                      ? "Sin resultados para los filtros seleccionados."
                      : `El año ${anio?.anio ?? ""} aún no tiene cursos en ${nivel?.nombre ?? "este nivel"}.${
                          puedeImportar ? " Importa el Excel del SIAGIE para cargarlos." : ""
                        }`
                  }
                />
              ) : (
                filtrados.map((curso) => {
                  const esArea = curso.tipo === "AREA"
                  const expandido = curso.tieneSubcursos && expandidos.has(curso.idCurso)
                  const ocupado = cambiandoId === curso.idCurso
                  return (
                    <Fragment key={curso.idCurso}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {curso.tieneSubcursos ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`${expandido ? "Ocultar" : "Ver"} subcursos de ${curso.nombre}`}
                                onClick={() => alternarExpandido(curso.idCurso)}
                              >
                                {expandido ? <ChevronDown /> : <ChevronRight />}
                              </Button>
                            ) : (
                              <span className="size-7" />
                            )}
                            <Badge variant="outline" className="font-mono text-[11px] font-semibold text-muted-foreground">
                              {curso.codigo}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{curso.nombre}</TableCell>
                        <TableCell>
                          {esArea ? <Badge variant="secondary">Área</Badge> : <Badge variant="info">Transversal</Badge>}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{curso.cantidadCompetencias}</TableCell>
                        <TableCell>
                          {esArea ? (
                            <Switch
                              checked={curso.tieneSubcursos}
                              disabled={!configurable || !puedeActualizar || ocupado}
                              onCheckedChange={(checked) => handleSwitchSubcursos(curso, checked)}
                              aria-label={`Subcursos de ${curso.nombre}`}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">No aplica</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Switch
                              checked={curso.accesoId === ACCESO.ACTIVO}
                              disabled={!configurable || !puedeActualizar || ocupado}
                              onCheckedChange={(checked) => handleCambiarEstado(curso, checked)}
                              aria-label={`Cambiar estado de ${curso.nombre}`}
                            />
                            <EstadoBadge accesoId={curso.accesoId} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <AccionesFila
                            puedeActualizar={false}
                            puedeEliminar={puedeEliminar && configurable}
                            onEditar={() => {}}
                            onEliminar={() =>
                              eliminarConToast(eliminar.mutateAsync, {
                                id: curso.idCurso,
                                mensaje: `"${curso.nombre}" eliminado`,
                              })
                            }
                            tituloEliminar={`Eliminar ${curso.nombre}`}
                            descripcionEliminar={
                              curso.tieneSubcursos
                                ? `Se eliminarán "${curso.nombre}" y sus subcursos de la malla del ${anio?.anio}.`
                                : `Se eliminará "${curso.nombre}" de la malla del ${anio?.anio}.`
                            }
                            ariaEditar=""
                          />
                        </TableCell>
                      </TableRow>
                      {expandido && (
                        <FilasSubcursos
                          area={curso}
                          subcursos={subcursosPorArea.get(curso.idCurso) ?? []}
                          configurable={configurable}
                          puedeCrear={puedeCrear}
                          puedeActualizar={puedeActualizar}
                          puedeEliminar={puedeEliminar}
                          cambiandoId={cambiandoId}
                          onCambiarEstado={handleCambiarEstado}
                          onEliminar={(subcurso) =>
                            eliminarConToast(eliminar.mutateAsync, {
                              id: subcurso.idCurso,
                              mensaje: `Subcurso "${subcurso.nombre}" eliminado`,
                            })
                          }
                          onAbrir={(subcurso) => setSubcursoDialog({ area: curso, subcurso })}
                        />
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {isError && <BotonReintentar refetch={refetch} />}

        {apagando && (
          <ConfirmarEliminar
            open
            onOpenChange={(abierto) => !abierto && setApagando(null)}
            titulo={`Quitar los subcursos de ${apagando.nombre}`}
            descripcion={`Se eliminarán sus ${subcursosPorArea.get(apagando.idCurso)?.length ?? 0} subcursos y "${apagando.nombre}" volverá a dictarse como un solo curso.`}
            textoBoton="Quitar subcursos"
            onConfirm={() => aplicarSubcursos(apagando, false)}
          />
        )}

        {subcursoDialog && (
          <SubcursoDialog
            open
            onOpenChange={(abierto) => !abierto && setSubcursoDialog(null)}
            area={subcursoDialog.area}
            subcurso={subcursoDialog.subcurso}
          />
        )}

        {anio && (
          <ImportarCursosModal
            open={importarOpen}
            onOpenChange={setImportarOpen}
            anio={anio}
            onImportado={(idNivelImportado) => filtros.setIdNivel(idNivelImportado)}
          />
        )}

        {anio && nivel && (
          <CopiarCursosModal
            open={copiarOpen}
            onOpenChange={setCopiarOpen}
            destino={anio}
            nivel={nivel}
            origenes={origenesCopia}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ── Subcursos de un área ─────────────────────────────────────────────────

function FilasSubcursos({
  area,
  subcursos,
  configurable,
  puedeCrear,
  puedeActualizar,
  puedeEliminar,
  cambiandoId,
  onCambiarEstado,
  onEliminar,
  onAbrir,
}: {
  area: CursoResponse
  subcursos: CursoResponse[]
  configurable: boolean
  puedeCrear: boolean
  puedeActualizar: boolean
  puedeEliminar: boolean
  cambiandoId: number | null
  onCambiarEstado: (curso: CursoResponse, activar: boolean) => void
  onEliminar: (subcurso: CursoResponse) => Promise<void>
  /** Sin subcurso abre el diálogo para crear uno. */
  onAbrir: (subcurso: CursoResponse | null) => void
}) {
  const { data: competencias = [] } = useCompetencias(area.idCurso)
  const codigoPorId = new Map(competencias.map((c) => [c.idCompetencia, c.codigo]))

  // Competencias activas del área que ningún subcurso activo evalúa.
  const cubiertas = new Set(
    subcursos.filter((s) => s.accesoId === ACCESO.ACTIVO).flatMap((s) => s.idCompetencias)
  )
  const sinCubrir = competencias.filter(
    (c) => c.accesoId === ACCESO.ACTIVO && !cubiertas.has(c.idCompetencia)
  )

  return (
    <>
      {subcursos.map((subcurso) => (
        <TableRow key={subcurso.idCurso} className="bg-muted/30">
          <TableCell>
            <CornerDownRight className="ml-9 size-4 text-muted-foreground" />
          </TableCell>
          <TableCell className="font-medium">{subcurso.nombre}</TableCell>
          <TableCell>
            <Badge variant="outline">Subcurso</Badge>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap justify-center gap-1">
              {subcurso.idCompetencias.map((id) => (
                <Badge key={id} variant="outline" className="font-mono text-[11px]">
                  {codigoPorId.get(id) ?? "…"}
                </Badge>
              ))}
            </div>
          </TableCell>
          <TableCell />
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Switch
                checked={subcurso.accesoId === ACCESO.ACTIVO}
                disabled={!configurable || !puedeActualizar || cambiandoId === subcurso.idCurso}
                onCheckedChange={(checked) => onCambiarEstado(subcurso, checked)}
                aria-label={`Cambiar estado de ${subcurso.nombre}`}
              />
              <EstadoBadge accesoId={subcurso.accesoId} />
            </div>
          </TableCell>
          <TableCell className="text-right">
            <AccionesFila
              puedeActualizar={puedeActualizar && configurable}
              puedeEliminar={puedeEliminar && configurable}
              onEditar={() => onAbrir(subcurso)}
              onEliminar={() => onEliminar(subcurso)}
              tituloEliminar={`Eliminar ${subcurso.nombre}`}
              descripcionEliminar={`Se eliminará el subcurso "${subcurso.nombre}" de ${area.nombre}.`}
              ariaEditar={`Editar ${subcurso.nombre}`}
            />
          </TableCell>
        </TableRow>
      ))}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={COLUMNAS}>
          <div className="flex flex-wrap items-center gap-3 pl-9">
            {configurable && puedeCrear && (
              <Button variant="outline" size="sm" onClick={() => onAbrir(null)}>
                <Plus data-icon="inline-start" />
                Agregar subcurso
              </Button>
            )}
            {subcursos.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                {area.nombre} aún no tiene subcursos.
              </span>
            ) : (
              sinCubrir.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  Ningún subcurso evalúa: {sinCubrir.map((c) => `${c.codigo} ${c.competencia}`).join(" · ")}
                </span>
              )
            )}
          </div>
        </TableCell>
      </TableRow>
    </>
  )
}

function SubcursoDialog({
  open,
  onOpenChange,
  area,
  subcurso,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  area: CursoResponse
  subcurso: CursoResponse | null
}) {
  const guardar = useGuardarSubcurso()
  const { data: competencias = [], isLoading } = useCompetencias(area.idCurso)
  const nombre = subcurso?.nombre ?? ""
  const idCompetencias = useMemo(() => subcurso?.idCompetencias ?? [], [subcurso])

  const form = useForm<SubcursoValues>({
    resolver: zodResolver(subcursoSchema),
    defaultValues: { nombre, idCompetencias },
  })
  useResetAlAbrir(open, form, { nombre, idCompetencias }, [nombre, idCompetencias])

  // Las inactivas solo aparecen si el subcurso ya las tenía, para poder quitarlas.
  const opciones = competencias.filter(
    (c) => c.accesoId === ACCESO.ACTIVO || idCompetencias.includes(c.idCompetencia)
  )

  async function onSubmit(values: SubcursoValues) {
    await guardarConToast(async () => {
      await guardar.mutateAsync({
        idArea: area.idCurso,
        idSubcurso: subcurso?.idCurso,
        data: { nombre: values.nombre, idCompetencias: values.idCompetencias },
      })
      toast.success(subcurso ? "Subcurso actualizado" : "Subcurso creado")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {subcurso ? "Editar subcurso" : `Nuevo subcurso de ${area.nombre}`}
          </DialogTitle>
          <DialogDescription>
            Elige qué competencias de {area.nombre} evalúa este subcurso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre del subcurso</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Ej: Álgebra" autoFocus {...field} />
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idCompetencias"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Competencias que evalúa</FieldLabel>
                  <FieldContent>
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando competencias...</p>
                    ) : (
                      <div className="flex flex-col gap-2 rounded-lg border p-3">
                        {opciones.map((c) => {
                          const marcada = field.value.includes(c.idCompetencia)
                          return (
                            <label key={c.idCompetencia} className="flex cursor-pointer items-start gap-2.5 text-sm">
                              <Checkbox
                                className="mt-0.5"
                                checked={marcada}
                                onCheckedChange={(checked) =>
                                  field.onChange(
                                    checked
                                      ? [...field.value, c.idCompetencia]
                                      : field.value.filter((id) => id !== c.idCompetencia)
                                  )
                                }
                              />
                              <span>
                                <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>{" "}
                                {c.competencia}
                                {c.accesoId !== ACCESO.ACTIVO && (
                                  <span className="text-xs text-muted-foreground"> (inactiva)</span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <FieldDescription className="text-xs">
                      Varios subcursos pueden evaluar la misma competencia.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.idCompetencias]} />
                  </FieldContent>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <BotonGuardar
              etiqueta={subcurso ? "Guardar cambios" : "Crear subcurso"}
              enviando={form.formState.isSubmitting}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Importar Excel ───────────────────────────────────────────────────────

function ImportarCursosModal({
  open,
  onOpenChange,
  anio,
  onImportado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  anio: AnioEscolarResponse
  /** El nivel lo decide el archivo: la pantalla se mueve a ese nivel al terminar. */
  onImportado: (idNivel: number) => void
}) {
  const vistaPrevia = useVistaPreviaCursos()
  const importar = useImportarCursos()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<CursoVistaPreviaResponse | null>(null)
  const [resultado, setResultado] = useState<CursoImportResponse | null>(null)

  function limpiar() {
    setArchivo(null)
    setVista(null)
    setResultado(null)
  }

  function handleOpenChange(abierto: boolean) {
    if (!abierto) limpiar()
    onOpenChange(abierto)
  }

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("El archivo debe ser un documento Excel (.xlsx)")
      return
    }
    setArchivo(file)
    setVista(null)
    try {
      setVista(await vistaPrevia.mutateAsync({ archivo: file, idAnio: anio.idAnio }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo")
    }
  }

  async function handleImportar() {
    if (!archivo || !vista) return
    try {
      const res = await importar.mutateAsync({ archivo, idAnio: anio.idAnio })
      setResultado(res)
      onImportado(vista.idNivel)
      toast.success(`Cursos de ${vista.nivel} importados al año ${anio.anio}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al importar los cursos")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <FileSpreadsheet className="size-5 text-primary" />
            Importar cursos del SIAGIE al año {anio.anio}
          </DialogTitle>
          <DialogDescription>
            Sube el registro de notas (.xlsx) que descargas del SIAGIE. Se cargan las áreas y sus
            competencias del nivel que indica el archivo.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="font-semibold leading-tight">Importación completada</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Contador valor={resultado.creados} texto="Nuevos" />
              <Contador valor={resultado.actualizados} texto="Actualizados" />
              <Contador valor={resultado.inactivados} texto="Inactivados" />
            </div>
            <DialogFooter>
              <Button variant="brand" className="w-full" onClick={() => handleOpenChange(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <label
              htmlFor="excel-cursos"
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 p-5 text-center transition-colors hover:bg-muted/40"
            >
              <Upload className="mb-2 size-7 text-muted-foreground" />
              <span className="text-sm font-semibold text-primary">
                {archivo ? "Elegir otro archivo" : "Seleccionar archivo .xlsx"}
              </span>
              {archivo && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileCheck className="size-3.5 text-emerald-600" />
                  {archivo.name}
                </span>
              )}
              <input
                id="excel-cursos"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleArchivo}
              />
            </label>

            {vistaPrevia.isPending && <p className="text-center text-sm text-muted-foreground">Leyendo el archivo...</p>}

            {vista && <VistaPrevia vista={vista} />}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={importar.isPending}>
                Cancelar
              </Button>
              <Button variant="brand" onClick={handleImportar} disabled={!vista || importar.isPending}>
                {importar.isPending ? "Importando..." : `Importar ${vista?.areas.length ?? ""} cursos`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Contador({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3 text-center">
      <span className="text-xl font-bold text-foreground">{valor}</span>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{texto}</p>
    </div>
  )
}

function VistaPrevia({ vista }: { vista: CursoVistaPreviaResponse }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Dato titulo="Nivel" valor={vista.nivelArchivo} />
        <Dato titulo="Año del archivo" valor={vista.anioArchivo ?? "—"} />
        <Dato titulo="Periodo" valor={vista.periodoArchivo ?? "—"} />
      </div>

      {(vista.advertencias.length > 0 || vista.seInactivan.length > 0) && (
        <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
          {vista.advertencias.map((a) => (
            <p key={a} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {a}
            </p>
          ))}
          {vista.seInactivan.length > 0 && (
            <p className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Ya no vienen en el archivo y se inactivarán: {vista.seInactivan.join(", ")}.
            </p>
          )}
        </div>
      )}

      <div className="max-h-[320px] overflow-y-auto rounded-lg border">
        {vista.areas.map((area) => (
          <div key={area.codigo} className="border-b px-3 py-2.5 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">{area.codigo}</Badge>
              <span className="text-sm font-medium">{area.nombre}</span>
              {area.tipo === "TRANSVERSAL" && <Badge variant="info">Transversal</Badge>}
              <Badge variant={area.accion === "NUEVA" ? "success" : "secondary"} className="ml-auto">
                {area.accion === "NUEVA" ? "Nueva" : "Se actualiza"}
              </Badge>
            </div>
            <ul className="mt-1.5 space-y-0.5 pl-1 text-xs text-muted-foreground">
              {area.competencias.map((c) => (
                <li key={c.codigo}>
                  <span className="font-mono">{c.codigo}</span> {c.nombre}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{titulo}</p>
      <p className="truncate font-medium">{valor}</p>
    </div>
  )
}

// ── Copiar de otro año ───────────────────────────────────────────────────

function CopiarCursosModal({
  open,
  onOpenChange,
  destino,
  nivel,
  origenes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  destino: AnioEscolarResponse
  nivel: NivelResponse
  origenes: AnioEscolarResponse[]
}) {
  const copiar = useCopiarCursos()
  const ordenados = [...origenes].sort((a, b) => b.anio.localeCompare(a.anio))
  const [idOrigen, setIdOrigen] = useState<string>("")
  const origen = idOrigen || (ordenados[0] ? String(ordenados[0].idAnio) : "")

  async function handleCopiar() {
    try {
      const copiados = await copiar.mutateAsync({
        idAnioOrigen: Number(origen),
        idAnioDestino: destino.idAnio,
        idNivel: nivel.idNivel,
      })
      const anioOrigen = ordenados.find((a) => String(a.idAnio) === origen)?.anio
      toast.success(`Se copiaron ${copiados.length} cursos de ${nivel.nombre} del ${anioOrigen}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al copiar los cursos")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Copiar cursos al año {destino.anio}
          </DialogTitle>
          <DialogDescription>
            Se copian las áreas, competencias y subcursos de {nivel.nombre} del año que elijas.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel>Copiar desde</FieldLabel>
          <FieldContent>
            <FilterSelect
              value={origen}
              onValueChange={setIdOrigen}
              options={ordenados.map((a) => ({
                value: String(a.idAnio),
                label: `${a.anio} (${TEXTO_ESTADO_ANIO[a.estado]})`,
              }))}
              includeAll={false}
              allLabel="Selecciona"
              className="w-full"
            />
          </FieldContent>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={copiar.isPending}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={handleCopiar} disabled={!origen || copiar.isPending}>
            <Copy data-icon="inline-start" />
            {copiar.isPending ? "Copiando..." : "Copiar cursos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
