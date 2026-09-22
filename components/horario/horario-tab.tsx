"use client"

import { useState, useMemo } from "react"
import { CalendarDays, Download, Loader2, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useGrados, useTurnos, useDocenteDeUsuario } from "@/hooks/use-academico"
import { usePuedeLeer } from "@/hooks/use-permisos"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import {
  useRolHorario,
  useHorarios,
  useHorarioDocente,
  useHorarioAlumno,
  useHijosApoderado,
} from "@/hooks/use-horario"
import { CalendarioSemanal } from "@/components/horario/calendario-semanal"
import { generarPdfHorario } from "@/lib/reportes/generar-pdf"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HorarioTab() {
  const puedeHorarios = usePuedeLeer("HORARIOS")
  const rol = useRolHorario()
  const { usuario, esAdmin } = useAuth()

  // ── Filtros admin ───────────────────────────────────────────────────
  const [idGradoSeccionFiltro, setIdGradoSeccionFiltro] = useState<number | null>(null)
  const [turnoFiltro, setTurnoFiltro] = useState<string>("")

  // ── Selector de hijos (apoderado) ───────────────────────────────────
  const { data: hijos = [], isLoading: hijosCargando } = useHijosApoderado()
  const [hijoSeleccionado, setHijoSeleccionado] = useState<number | null>(null)

  // Auto-seleccionar primer hijo
  const hijoActual = hijoSeleccionado ?? hijos[0]?.idAlumno ?? null

  // ── Datos para filtros ──────────────────────────────────────────────
  const { data: grados = [] } = useGrados()
  const { data: turnos = [] } = useTurnos()

  const gradoSeccionSel = grados.find((g) =>
    g.secciones.some((s) => s.idGradoSeccion === idGradoSeccionFiltro)
  )

  // ── Queries de horarios ─────────────────────────────────────────────
  const docente = useDocenteDeUsuario(esAdmin ? undefined : usuario?.idUsuario)

  const adminQuery = useHorarios(
    rol === "admin"
      ? {
          grado: gradoSeccionSel?.nombre || undefined,
          seccion: gradoSeccionSel?.secciones.find(
            (s) => s.idGradoSeccion === idGradoSeccionFiltro
          )?.nombre || undefined,
        }
      : undefined
  )

  const docenteQuery = useHorarioDocente(
    rol === "docente" ? docente?.idDocente ?? null : null
  )

  const alumnoQuery = useHorarioAlumno(
    rol === "apoderado" ? hijoActual : null
  )

  const query =
    rol === "admin" ? adminQuery : rol === "docente" ? docenteQuery : alumnoQuery

  const { data: horariosRaw = [], isLoading, isError } = query

  // Filtrado client-side por turno (back no acepta turno como query param)
  const horarios = useMemo(() => {
    if (!turnoFiltro) return horariosRaw
    return horariosRaw.filter((h) => h.turno === turnoFiltro)
  }, [horariosRaw, turnoFiltro])

  // ── Turno badge + rango de horas ──────────────────────────────────────
  const turnoBadge = useMemo(() => {
    if (horarios.length === 0) return null
    const turnosUnicos = [...new Set(horarios.map((h) => h.turno))]
    return turnosUnicos.length === 1 ? turnosUnicos[0] : null
  }, [horarios])

  // Turno del catálogo para obtener horaEntrada/horaSalida
  const turnoSeleccionado = useMemo(() => {
    if (!turnoBadge) return null
    return turnos.find((t) => t.nombre === turnoBadge) ?? null
  }, [turnoBadge, turnos])

  // ── Título del calendario ───────────────────────────────────────────
  const tituloCalendario = useMemo(() => {
    if (rol === "docente") {
      return docente
        ? `Horario — ${docente.nombre} ${docente.apellidoPat}`
        : "Mi Horario"
    }
    if (rol === "apoderado" && hijoActual) {
      const hijo = hijos.find((h) => h.idAlumno === hijoActual)
      if (hijo) return `Horario — ${hijo.grado} ${hijo.seccion} — ${hijo.alumno}`
    }
    if (rol === "admin" && gradoSeccionSel) {
      const sec = gradoSeccionSel.secciones.find(
        (s) => s.idGradoSeccion === idGradoSeccionFiltro
      )
      return `Horario — ${gradoSeccionSel.nombre} ${sec?.nombre ?? ""}`
    }
    return "Horario Semanal"
  }, [rol, docente, hijoActual, hijos, gradoSeccionSel, idGradoSeccionFiltro])

  // ── Descargar PDF ───────────────────────────────────────────────────
  function handleDescargarPdf() {
    if (horarios.length === 0) return
    generarPdfHorario(horarios, tituloCalendario)
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (!puedeHorarios) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">No tienes permiso para acceder a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Horario Académico</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDescargarPdf}
          disabled={horarios.length === 0 || isLoading}
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* ── Toolbar de filtros ──────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          {/* Selector de hijos (apoderado con 2+ hijos) */}
          {rol === "apoderado" && hijos.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Hijo
              </label>
              <Select
                value={hijoActual != null ? String(hijoActual) : ""}
                onValueChange={(v) => setHijoSeleccionado(Number(v))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar hijo" />
                </SelectTrigger>
                <SelectContent>
                  {hijos.map((h) => (
                    <SelectItem key={h.idAlumno} value={String(h.idAlumno)}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {h.alumno} — {h.grado} {h.seccion}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtros admin: Grado-Sección cascada, Turno */}
          {rol === "admin" && (
            <>
              <GradoSeccionCascada
                value={idGradoSeccionFiltro}
                onChange={setIdGradoSeccionFiltro}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Turno
                </label>
                <Select
                  value={turnoFiltro}
                  onValueChange={(v) =>
                    setTurnoFiltro(v === "_todos" ? "" : (v ?? ""))
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos">Todos</SelectItem>
                    {turnos.map((t) => (
                      <SelectItem key={t.idTurno} value={t.nombre}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Filtro turno para docente */}
          {rol === "docente" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Turno
              </label>
              <Select
                value={turnoFiltro}
                onValueChange={(v) =>
                  setTurnoFiltro(v === "_todos" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos</SelectItem>
                  {turnos.map((t) => (
                    <SelectItem key={t.idTurno} value={t.nombre}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Badge de turno ──────────────────────────────────────── */}
      {turnoBadge && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Turno:</span>
          <Badge variant="secondary" className="font-medium">
            {turnoBadge}
          </Badge>
        </div>
      )}

      {/* ── Estado: apoderado sin hijos ─────────────────────────── */}
      {rol === "apoderado" && !hijosCargando && hijos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">No tiene hijos matriculados.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Error al cargar los horarios.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Calendario ──────────────────────────────────────────── */}
      {!isLoading && !isError && horarios.length > 0 && (
        <CalendarioSemanal
          horarios={horarios}
          titulo={tituloCalendario}
          horaEntrada={turnoSeleccionado?.horaEntrada}
          horaSalida={turnoSeleccionado?.horaSalida}
        />
      )}
    </div>
  )
}
