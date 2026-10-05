"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Download, Loader2, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useAniosEscolares, useDocentes, useGrados, useTurnos } from "@/hooks/use-academico"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { useHijosApoderado, useHorarios, useHorarioDocente, useHorarioAlumno, useRolHorario } from "@/hooks/use-horario"
import { useDocenteDeUsuario } from "@/hooks/use-academico"
import { CalendarioSemanal } from "@/components/horario/calendario-semanal"
import { generarPdfHorario } from "@/lib/reportes/generar-pdf"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HorarioTab() {
  const rol = useRolHorario()
  const { usuario, esAdmin } = useAuth()

  // ── Filtros admin ───────────────────────────────────────────────────
  const [idGradoSeccionFiltro, setIdGradoSeccionFiltro] = useState<number | null>(null)
  const [idTurnoFiltro, setIdTurnoFiltro] = useState<number | null>(null)
  const [idDocenteFiltro, setIdDocenteFiltro] = useState<number | null>(null)
  const [idAnioFiltro, setIdAnioFiltro] = useState<number | null>(null)

  // Resolver turno/nivel desde idGradoSeccion para badge
  const { data: grados = [] } = useGrados()
  const { data: turnos = [] } = useTurnos()
  const { data: docentes = [] } = useDocentes()
  const { data: anios = [] } = useAniosEscolares()

  const gradoSeccionSel = useMemo(() => {
    for (const g of grados) {
      const s = g.secciones.find((sec) => sec.idGradoSeccion === idGradoSeccionFiltro)
      if (s) return { grado: g, seccion: s }
    }
    return null
  }, [grados, idGradoSeccionFiltro])

  // ── Selector de hijos (apoderado) ───────────────────────────────────
  const { data: hijos = [], isLoading: hijosCargando } = useHijosApoderado()
  const [hijoSeleccionado, setHijoSeleccionado] = useState<number | null>(null)
  const hijoActual = hijoSeleccionado ?? hijos[0]?.idAlumno ?? null

  // ── Queries de horarios ─────────────────────────────────────────────
  const docente = useDocenteDeUsuario(esAdmin ? undefined : usuario?.idUsuario)

  // Admin: vacio hasta que llegue idGradoSeccion (como pediste)
  const adminEnabled = rol === "admin" && idGradoSeccionFiltro != null
  const adminQuery = useHorarios(
    rol === "admin"
      ? {
          page: 0,
          size: 100,
          idGradoSeccion: idGradoSeccionFiltro ?? undefined,
          idTurno: idTurnoFiltro ?? undefined,
          idDocente: idDocenteFiltro ?? undefined,
          idAnio: idAnioFiltro ?? undefined,
          enabled: adminEnabled,
        }
      : { enabled: false }
  )

  const docenteQuery = useHorarioDocente(
    rol === "docente" ? docente?.idDocente ?? null : null,
    rol === "docente" ? { page: 0, size: 100, idAnio: idAnioFiltro ?? undefined } : undefined
  )

  const alumnoQuery = useHorarioAlumno(
    rol === "apoderado" ? hijoActual : null,
    rol === "apoderado" ? { page: 0, size: 100, idAnio: idAnioFiltro ?? undefined } : undefined
  )

  const query = rol === "admin" ? adminQuery : rol === "docente" ? docenteQuery : alumnoQuery

  // Normaliza Page vs List (compat con back antiguo List)
  const raw = query.data as unknown
  const horariosRaw = Array.isArray(raw) ? (raw as never[]) : ((raw as { content?: never[] })?.content ?? [])
  const horarios = horariosRaw as unknown as import("@/lib/api/horario").HorarioListItem[]
  const isLoading = query.isLoading
  const isError = query.isError

  // ── Turno badge ─────────────────────────────────────────────────────
  const turnoBadge = useMemo(() => {
    if (horarios.length === 0) return null
    const turnosUnicos = [...new Set(horarios.map((h) => h.turno))]
    return turnosUnicos.length === 1 ? turnosUnicos[0] : null
  }, [horarios])

  const turnoSeleccionado = useMemo(() => {
    if (!turnoBadge) return null
    return turnos.find((t) => t.nombre === turnoBadge) ?? null
  }, [turnoBadge, turnos])

  // ── Título del calendario ───────────────────────────────────────────
  const tituloCalendario = useMemo(() => {
    if (rol === "docente") {
      return docente ? `Horario — ${docente.nombre} ${docente.apellidoPat}` : "Mi Horario"
    }
    if (rol === "apoderado" && hijoActual) {
      const hijo = hijos.find((h) => h.idAlumno === hijoActual)
      if (hijo) return `Horario — ${hijo.grado} ${hijo.seccion} — ${hijo.alumno}`
    }
    if (rol === "admin" && gradoSeccionSel) {
      return `Horario — ${gradoSeccionSel.grado.nombre} ${gradoSeccionSel.seccion.nombre}`
    }
    return "Horario Semanal"
  }, [rol, docente, hijoActual, hijos, gradoSeccionSel])

  // ── Descargar PDF ───────────────────────────────────────────────────
  function handleDescargarPdf() {
    if (horarios.length === 0) return
    generarPdfHorario(horarios, tituloCalendario)
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Horario Académico</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleDescargarPdf} disabled={horarios.length === 0 || isLoading}>
          <Download data-icon="inline-start" />
          Descargar PDF
        </Button>
      </div>

      {/* ── Toolbar de filtros ──────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          {/* Selector de hijos (apoderado con 2+ hijos) */}
          {rol === "apoderado" && hijos.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Hijo</label>
              <Select value={hijoActual != null ? String(hijoActual) : ""} onValueChange={(v) => setHijoSeleccionado(Number(v))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar hijo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {hijos.map((h) => (
                      <SelectItem key={h.idAlumno} value={String(h.idAlumno)}>
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground" />
                          <span>
                            {h.alumno} — {h.grado} {h.seccion}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtros admin: cascada + turno + docente + año — vacio hasta que llegue */}
          {rol === "admin" && (
            <>
              <GradoSeccionCascada value={idGradoSeccionFiltro} onChange={setIdGradoSeccionFiltro} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Turno</label>
                <Select value={idTurnoFiltro ? String(idTurnoFiltro) : "__all"} onValueChange={(v) => setIdTurnoFiltro(v === "__all" ? null : Number(v))}>
                  <SelectTrigger className="w-44">
                    <SelectValue>{turnos.find((t) => t.idTurno === idTurnoFiltro)?.nombre ?? "Todos"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__all">Todos</SelectItem>
                      {turnos.map((t) => (
                        <SelectItem key={t.idTurno} value={String(t.idTurno)}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Docente</label>
                <Select value={idDocenteFiltro ? String(idDocenteFiltro) : "__all"} onValueChange={(v) => setIdDocenteFiltro(v === "__all" ? null : Number(v))}>
                  <SelectTrigger className="w-44">
                    <SelectValue>{docentes.find((d) => d.idDocente === idDocenteFiltro)?.nombre ?? "Todos"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__all">Todos</SelectItem>
                      {docentes.map((d) => (
                        <SelectItem key={d.idDocente} value={String(d.idDocente)}>
                          {d.nombre} {d.apellidoPat}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Año</label>
                <Select value={idAnioFiltro ? String(idAnioFiltro) : "__all"} onValueChange={(v) => setIdAnioFiltro(v === "__all" ? null : Number(v))}>
                  <SelectTrigger className="w-36">
                    <SelectValue>{anios.find((a) => a.idAnio === idAnioFiltro)?.anio ?? "Todos"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__all">Todos</SelectItem>
                      {anios.map((a) => (
                        <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                          {a.anio}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {!idGradoSeccionFiltro && <span className="text-xs text-muted-foreground self-center">Selecciona nivel → grado → sección para ver horario</span>}
            </>
          )}

          {/* Docente también puede filtrar por año */}
          {rol === "docente" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Año</label>
              <Select value={idAnioFiltro ? String(idAnioFiltro) : "__all"} onValueChange={(v) => setIdAnioFiltro(v === "__all" ? null : Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue>{anios.find((a) => a.idAnio === idAnioFiltro)?.anio ?? "Todos"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__all">Todos</SelectItem>
                    {anios.map((a) => (
                      <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                        {a.anio}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Apoderado año */}
          {rol === "apoderado" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Año</label>
              <Select value={idAnioFiltro ? String(idAnioFiltro) : "__all"} onValueChange={(v) => setIdAnioFiltro(v === "__all" ? null : Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue>{anios.find((a) => a.idAnio === idAnioFiltro)?.anio ?? "Todos"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__all">Todos</SelectItem>
                    {anios.map((a) => (
                      <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                        {a.anio}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
            <Users className="mb-3 size-10 opacity-40" />
            <p className="text-sm">No tiene hijos matriculados.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Vacio hasta que llegue (admin) ──────────────────────── */}
      {rol === "admin" && !idGradoSeccionFiltro && !isLoading && !isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarDays className="mb-3 size-10 opacity-40" />
            <p className="text-sm font-medium">Selecciona nivel, grado y sección para ver el horario</p>
            <p className="text-xs">El calendario se cargará al completar la cascada</p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {isLoading && idGradoSeccionFiltro && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
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
        <CalendarioSemanal horarios={horarios} titulo={tituloCalendario} horaEntrada={turnoSeleccionado?.horaEntrada} horaSalida={turnoSeleccionado?.horaSalida} />
      )}

      {/* ── Sin horarios tras filtro ────────────────────────────── */}
      {!isLoading && !isError && horarios.length === 0 && idGradoSeccionFiltro && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No hay horarios para los filtros seleccionados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
