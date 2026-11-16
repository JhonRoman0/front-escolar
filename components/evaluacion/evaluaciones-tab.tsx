"use client"

import { Fragment, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ClipboardPen, Eye, Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { EstadoPeriodoBadge } from "@/components/shared/estado-periodo-badge"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { useAniosEscolares } from "@/hooks/use-academico"
import { useAvanceFinales, useCursosEvaluables, useEliminarEvaluacion, useEvaluaciones } from "@/hooks/use-evaluaciones"
import { usePuede } from "@/hooks/use-permisos"
import { anioParaFiltro, estadoAnioTexto } from "@/lib/api/academico"
import { competenciaCompleta, type CursoEvaluable, type EvaluacionResumen } from "@/lib/api/evaluaciones"
import { ESCALAS, periodoParaFiltro } from "@/lib/calificaciones"
import { formatearFecha } from "@/lib/fechas"
import { EvaluacionFormDialog } from "./evaluacion-form-dialog"
import { FiltrosCurso, useFiltrosCurso } from "./filtros-curso"
import { NotasEvaluacionDialog } from "./notas-evaluacion-dialog"
import { NotasDeEvaluacion } from "./notas-de-evaluacion"
import { ResumenEvaluacionDialog } from "./resumen-evaluacion-dialog"

const COLUMNAS = 5

/** "Geometría (MATEMÁTICA)" */
function nombreCurso(c: CursoEvaluable) {
  return c.area ? `${c.curso} (${c.area})` : c.curso
}

export default function EvaluacionesTab() {
  const { data: anios = [] } = useAniosEscolares()
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const idAnio = idAnioElegido ?? anioParaFiltro(anios)?.idAnio ?? null
  const { data: cursos = [], isLoading: cargandoCursos } = useCursosEvaluables(idAnio)

  const filtrosCurso = useFiltrosCurso(cursos, (c) => ({
    clave: String(c.idAsignacion),
    curso: nombreCurso(c),
    turno: c.turno,
    nivel: c.nivel,
    grado: c.grado,
    seccion: c.seccion,
  }))
  const curso = filtrosCurso.seleccionado
  // El periodo depende del nivel; cambiar de curso o de periodo no toca los demás filtros.
  const periodos = filtrosCurso.delNivel?.periodos ?? []
  const [numeroElegido, setNumeroElegido] = useState<number | null>(null)
  const periodo = periodos.find((p) => p.numero === numeroElegido) ?? periodoParaFiltro(periodos)

  const { data: evaluaciones = [], isLoading: cargandoEvaluaciones } = useEvaluaciones(
    curso?.idAsignacion ?? null,
    periodo?.numero ?? null
  )
  const eliminar = useEliminarEvaluacion()
  const { data: avance = [] } = useAvanceFinales(curso?.idAsignacion ?? null, periodo?.numero ?? null)
  const todasCompletas = avance.length > 0 && avance.every(competenciaCompleta)
  const puedeCrear = usePuede("EVALUACIONES", "CREAR")
  const puedeEditar = usePuede("EVALUACIONES", "ACTUALIZAR")
  const puedeEliminar = usePuede("EVALUACIONES", "ELIMINAR")
  const puedeVerResumen = usePuede("EVALUACIONES", "VER_RESUMEN")
  const [idResumen, setIdResumen] = useState<number | null>(null)

  const [formulario, setFormulario] = useState<{ evaluacion: EvaluacionResumen | null } | null>(null)
  const [idCalificando, setIdCalificando] = useState<number | null>(null)
  const [expandida, setExpandida] = useState<number | null>(null)
  const periodoAbierto = !!filtrosCurso.delNivel?.anioVigente && periodo?.estado === "ABIERTO"

  async function handleEliminar(evaluacion: EvaluacionResumen) {
    try {
      await eliminar.mutateAsync(evaluacion.idEvaluacion)
      toast.success(`Evaluación "${evaluacion.nombre}" eliminada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la evaluación")
      throw error
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <HeaderSeccion
            titulo="Evaluaciones"
            descripcion="Exámenes, prácticas y trabajos de cada curso. Su nota sirve de guía para la nota final de cada competencia."
          />
          {puedeCrear && (
            <span
              title={
                filtrosCurso.faltaElegir
                  ?? (!periodoAbierto
                    ? "Solo se crean evaluaciones en un año vigente con el periodo abierto"
                    : todasCompletas
                      ? "Todas las notas finales del periodo ya están registradas"
                      : undefined)
              }
            >
              <Button
                variant="brand"
                size="sm"
                disabled={!curso || !periodo || !periodoAbierto || todasCompletas}
                onClick={() => setFormulario({ evaluacion: null })}
              >
                <Plus data-icon="inline-start" />
                Nueva evaluación
              </Button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={idAnio ? String(idAnio) : ""}
            onValueChange={(v) => {
              setIdAnioElegido(Number(v))
              filtrosCurso.reiniciar()
              setNumeroElegido(null)
            }}
            options={[...anios]
              .sort((a, b) => b.anio.localeCompare(a.anio))
              .map((a) => ({ value: String(a.idAnio), label: `${a.anio} · ${estadoAnioTexto(a.estado)}` }))}
            includeAll={false}
            label="Año"
            className="w-[170px]"
          />
          <FiltrosCurso {...filtrosCurso.props} cargando={cargandoCursos} />
          {periodos.length > 0 && (
            <FilterSelect
              label="Periodo"
              value={periodo ? String(periodo.numero) : ""}
              onValueChange={(v) => setNumeroElegido(Number(v))}
              options={periodos.map((p) => ({ value: String(p.numero), label: p.nombre }))}
              includeAll={false}
              className="w-[180px]"
            />
          )}
        </div>

        {curso && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Escala {ESCALAS.find((e) => e.value === curso.escala)?.detalle}</Badge>
            {periodo && <EstadoPeriodoBadge estado={periodo.estado} />}
            <span>Docente: {curso.docente}</span>
          </div>
        )}

        {!cargandoCursos && !cursos.length ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No tienes cursos asignados en este año.
          </p>
        ) : filtrosCurso.delNivel && !periodos.length ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {filtrosCurso.delNivel.nivel} aún no tiene periodos: defínelos en Académico → Configuración académica.
          </p>
        ) : !curso ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {cargandoCursos ? "Cargando cursos…" : `${filtrosCurso.faltaElegir} para ver sus evaluaciones.`}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Anchos en porcentaje: las columnas se reparten parejo a cualquier ancho. */}
                  <TableHead className="w-[28%]">Evaluación</TableHead>
                  <TableHead className="w-[18%] text-center">Fecha de evaluación</TableHead>
                  <TableHead className="w-[20%] text-center">Competencias evaluadas</TableHead>
                  <TableHead className="w-[18%] text-center">Notas registradas</TableHead>
                  <TableHead className="w-[16%] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoCursos || cargandoEvaluaciones ? (
                  <FilasCargando columnas={COLUMNAS} filas={3} />
                ) : evaluaciones.length === 0 ? (
                  <MensajeSinDatos columnas={COLUMNAS} mensaje="Aún no hay evaluaciones en este periodo." />
                ) : (
                  evaluaciones.map((e) => {
                    const abierta = expandida === e.idEvaluacion
                    const alternar = () => setExpandida(abierta ? null : e.idEvaluacion)
                    return (
                    <Fragment key={e.idEvaluacion}>
                    <TableRow className={`cursor-pointer hover:bg-muted/40 ${abierta ? "bg-muted/30" : ""}`} onClick={alternar}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 shrink-0 rounded-md"
                            aria-label={abierta ? "Contraer" : "Ver notas de los alumnos"}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              alternar()
                            }}
                          >
                            <ChevronDown className={`size-3.5 transition-transform ${abierta ? "rotate-180" : ""}`} />
                          </Button>
                          <p className="text-sm font-semibold text-foreground">{e.nombre}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{formatearFecha(e.fecha)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-center gap-1">
                          {e.competencias.map((c) => (
                            <Tooltip key={c.idCompetencia}>
                              <TooltipTrigger render={<Badge variant="secondary" />}>{c.codigo}</TooltipTrigger>
                              <TooltipContent className="max-w-xs">{c.nombre}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {e.notasRegistradas}/{e.totalAlumnos}
                      </TableCell>
                      <TableCell>
                        {/* Las acciones no despliegan la fila. */}
                        <div className="flex justify-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                          {puedeVerResumen && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Resumen de ${e.nombre}`}
                              title="Ver resumen"
                              onClick={() => setIdResumen(e.idEvaluacion)}
                            >
                              <Eye />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Notas de ${e.nombre}`}
                            title={
                              puedeCrear && e.editable && e.alumnosConNotaFinal < e.totalAlumnos
                                ? "Registrar notas"
                                : e.alumnosConNotaFinal > 0 && e.alumnosConNotaFinal >= e.totalAlumnos
                                  ? "Ver notas (todos ya tienen nota final)"
                                  : "Ver notas"
                            }
                            onClick={() => setIdCalificando(e.idEvaluacion)}
                          >
                            <ClipboardPen />
                          </Button>
                          {puedeEditar && e.editable && (
                            // Con alguna nota (también una usada de otra sección) ya no se edita.
                            <span title={e.tieneNotasRegistradas ? "Ya tiene notas registradas: no se puede editar" : "Editar"}>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                aria-label={`Editar ${e.nombre}`}
                                disabled={e.tieneNotasRegistradas}
                                onClick={() => setFormulario({ evaluacion: e })}
                              >
                                <Pencil />
                              </Button>
                            </span>
                          )}
                          {puedeEliminar && e.editable && (
                            <span title={e.tieneNotasRegistradas ? "Tiene notas registradas: no se puede eliminar" : undefined}>
                              <ConfirmarEliminar
                                titulo="Eliminar evaluación"
                                descripcion={`Se eliminará "${e.nombre}".`}
                                disabled={e.tieneNotasRegistradas}
                                onConfirm={() => handleEliminar(e)}
                              />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {abierta && periodo && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={COLUMNAS} className="p-3">
                          <NotasDeEvaluacion
                            idAsignacion={curso.idAsignacion}
                            periodo={periodo.numero}
                            periodos={curso.periodos}
                            idEvaluacion={e.idEvaluacion}
                          />
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
        )}

        {curso && periodo && (
          <EvaluacionFormDialog
            open={formulario != null}
            onOpenChange={(open) => !open && setFormulario(null)}
            curso={curso}
            periodo={periodo}
            evaluacion={formulario?.evaluacion ?? null}
            avance={avance}
          />
        )}
        <ResumenEvaluacionDialog idEvaluacion={idResumen} onOpenChange={(open) => !open && setIdResumen(null)} />
        <NotasEvaluacionDialog
          idEvaluacion={idCalificando}
          periodos={curso?.periodos ?? []}
          onOpenChange={(open) => !open && setIdCalificando(null)}
          puedeCalificar={puedeCrear}
        />
      </CardContent>
    </Card>
  )
}
