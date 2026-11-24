"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Download, Loader2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { useAuth } from "@/components/auth-provider"
import { usePuede } from "@/hooks/use-permisos"
import { CalendarioSemanal } from "@/components/horario/calendario-semanal"
import { BotonLimpiarFiltros } from "@/components/shared/boton-limpiar-filtros"
import { FilterSelect } from "@/components/shared/filter-select"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { useAniosEscolares, useAsignaciones, useDocenteDeUsuario, useDocentes, useGrados, useTurnos } from "@/hooks/use-academico"
import { useHorariosCompletos, useMiHorario, useRecreosSeccion, useRecreosSecciones, useRolHorario } from "@/hooks/use-horario"
import { anioParaFiltro } from "@/lib/api/academico"
import { type HorarioListItem, type RecreoHorario } from "@/lib/api/horario"
import { aMinutos } from "@/lib/horario"
import { generarPdfHorario } from "@/lib/reportes/generar-pdf"

type Vista = "mio" | "colegio"

function nombreCompleto(docente: { nombre?: string; apellidoPat?: string; apellidoMat?: string } | null | undefined) {
  return [docente?.nombre, docente?.apellidoPat, docente?.apellidoMat].filter(Boolean).join(" ").trim()
}

function armarTitulo(base: string, docente: string, turno: string | null, deAnio: string) {
  return `${base}${docente ? ` · ${docente}` : ""}${turno ? ` · Turno ${turno.toLowerCase()}` : ""}${deAnio}`
}

function claveGrado(h: HorarioListItem) {
  return `${h.idGrado ?? ""}:${h.grado ?? ""}`
}

function horasDe(horarios: HorarioListItem[]): number {
  const minutos = horarios.reduce((total, h) => total + aMinutos(h.horaFin) - aMinutos(h.horaInicio), 0)
  return Math.round((minutos / 60) * 10) / 10
}

function resumen(horarios: HorarioListItem[], turnos: string[]) {
  const porTurno = turnos.length > 1
    ? ` (${turnos.map((t) => `${horasDe(horarios.filter((h) => h.turno === t))} ${t.toLowerCase()}`).join(" · ")})`
    : ""
  const cursos = new Set(horarios.map((h) => h.curso)).size
  const secciones = new Set(horarios.map((h) => h.idGradoSeccion)).size
  return [
    `${horasDe(horarios)} h semanales${porTurno}`,
    `${cursos} ${cursos === 1 ? "curso" : "cursos"}`,
    `${secciones} ${secciones === 1 ? "sección" : "secciones"}`,
  ]
}

function Vacio({ icono: Icono = CalendarDays, titulo }: { icono?: typeof CalendarDays; titulo: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icono className="mb-3 size-10 opacity-40" />
        <p className="text-sm font-medium">{titulo}</p>
      </CardContent>
    </Card>
  )
}

export default function HorarioTab() {
  const rol = useRolHorario()
  if (rol === "apoderado") {
    return <Vacio icono={Users} titulo="El horario de tu hijo está disponible en el módulo Portal." />
  }
  if (rol === "ninguno") {
    return <Vacio titulo="No tienes permiso para ver los horarios del colegio." />
  }
  return <Horario esAdmin={rol === "admin"} />
}

function Horario({ esAdmin }: { esAdmin: boolean }) {
  const { usuario, permisos } = useAuth()
  const esDocente = permisos?.vinculo === "DOCENTE"
  const puedeDescargar = usePuede("HORARIOS", "IMPRIMIR_EXPORTAR")
  const [vistaElegida, setVistaElegida] = useState<Vista | null>(null)
  const vista: Vista = esDocente ? (esAdmin ? vistaElegida ?? "mio" : "mio") : "colegio"

  const { data: anios = [] } = useAniosEscolares()
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const idAnioPorDefecto = anioParaFiltro(anios)?.idAnio ?? null
  const idAnio = idAnioElegido ?? idAnioPorDefecto
  const anio = anios.find((a) => a.idAnio === idAnio)

  const [idNivel, setIdNivel] = useState<number | null>(null)
  const [idGrado, setIdGrado] = useState<number | null>(null)
  const [idGradoSeccion, setIdGradoSeccion] = useState<number | null>(null)
  const [idDocente, setIdDocente] = useState<number | null>(null)
  const [turnoElegido, setTurnoElegido] = useState<string | null>(null)

  const { data: docentes = [] } = useDocentes()
  const { data: grados = [] } = useGrados()
  const { data: turnos = [] } = useTurnos()
  const asignacionesQuery = useAsignaciones(vista === "colegio" && idAnio != null)

  const docente = useDocenteDeUsuario(esDocente ? usuario?.idUsuario : undefined)
  const mioQuery = useMiHorario(idAnio, vista === "mio" && idAnio != null)

  const filtrosColegio = useMemo(() => ({
    page: 0,
    size: 100,
    idAnio: idAnio ?? undefined,
    idNivel: idNivel ?? undefined,
    idGrado: idGrado ?? undefined,
    idGradoSeccion: idGradoSeccion ?? undefined,
    idDocente: idDocente ?? undefined,
  }), [idAnio, idNivel, idGrado, idGradoSeccion, idDocente])
  const firmaFiltros = JSON.stringify(filtrosColegio)
  const debeConsultar = vista === "colegio" && (idGradoSeccion != null || idDocente != null)
  const colegioQuery = useHorariosCompletos({ ...filtrosColegio, enabled: debeConsultar })

  const idsPorAnio = useMemo(() => new Set(
    asignacionesQuery.data?.filter((a) => a.idAnio === idAnio).map((a) => a.idDocente) ?? []
  ), [asignacionesQuery.data, idAnio])
  const idsHistoricos = useMemo(() => new Set(
    asignacionesQuery.data?.map((a) => a.idDocente) ?? []
  ), [asignacionesQuery.data])

  const opcionesDocentes = useMemo(() => {
    const porId = new Map<number, { value: string; label: string; group: string }>()
    const prioridad = (d: { idDocente: number }) =>
      d.idDocente === idDocente ? 0 : idsPorAnio.has(d.idDocente) ? 1 : idsHistoricos.has(d.idDocente) ? 2 : 3
    const grupo = (d: { idDocente: number }) => {
      if (d.idDocente === idDocente) return "Seleccionado"
      if (idsPorAnio.has(d.idDocente)) return "Con asignaciones en este año"
      if (idsHistoricos.has(d.idDocente)) return "Con asignaciones históricas"
      return "Otros docentes"
    }

    for (const d of [...docentes].sort((a, b) =>
      prioridad(a) - prioridad(b) || nombreCompleto(a).localeCompare(nombreCompleto(b), "es")
    )) {
      porId.set(d.idDocente, { value: String(d.idDocente), label: nombreCompleto(d), group: grupo(d) })
    }

    if (idDocente != null && !porId.has(idDocente)) {
      const elegido = docentes.find((d) => d.idDocente === idDocente)
      porId.set(idDocente, {
        value: String(idDocente),
        label: elegido ? nombreCompleto(elegido) : `Docente #${idDocente}`,
        group: "Seleccionado",
      })
    }

    return [...porId.values()]
  }, [docentes, idDocente, idsHistoricos, idsPorAnio])

  const avisoDocentes = asignacionesQuery.isError
    ? "No se pudieron cargar las asignaciones; se muestran todos los docentes."
    : !asignacionesQuery.isFetching && asignacionesQuery.data != null && idsPorAnio.size === 0
      ? "Sin asignaciones en este año; se muestran todos los docentes."
      : null

  const query = vista === "mio" ? mioQuery : colegioQuery
  const todas = useMemo(
    () => vista === "mio" ? mioQuery.data?.clases ?? [] : colegioQuery.data?.horarios ?? [],
    [vista, mioQuery.data, colegioQuery.data]
  )

  const turnosConUnGrado = useMemo(() => {
    const gradosPorTurno = new Map<string, Set<string>>()
    for (const h of todas) {
      const grados = gradosPorTurno.get(h.turno) ?? new Set<string>()
      grados.add(claveGrado(h))
      gradosPorTurno.set(h.turno, grados)
    }
    return new Set([...gradosPorTurno.entries()].filter(([, gs]) => gs.size === 1).map(([t]) => t))
  }, [todas])

  const idsSeccionesRecreoDocente = useMemo(() => {
    if (vista !== "colegio" || idDocente == null || idGradoSeccion != null) return []
    const porClave = new Map<string, number>()
    for (const h of todas) {
      if (!turnosConUnGrado.has(h.turno)) continue
      const clave = `${h.turno}:${claveGrado(h)}`
      if (!porClave.has(clave)) porClave.set(clave, h.idGradoSeccion)
    }
    return [...porClave.values()]
  }, [vista, idDocente, idGradoSeccion, todas, turnosConUnGrado])

  const recreosDocenteQueries = useRecreosSecciones(idsSeccionesRecreoDocente)
  const recreosDocente = useMemo(() => {
    const vistos = new Set<string>()
    const unidos: RecreoHorario[] = []
    for (const consulta of recreosDocenteQueries) {
      for (const recreo of consulta.data ?? []) {
        if (!turnosConUnGrado.has(recreo.turno)) continue
        const clave = [recreo.idTurno, recreo.diaSemana, recreo.horaInicio, recreo.horaFin].join("|")
        if (vistos.has(clave)) continue
        vistos.add(clave)
        unidos.push(recreo)
      }
    }
    return unidos
  }, [recreosDocenteQueries, turnosConUnGrado])

  const recreosSeccion = useRecreosSeccion(vista === "colegio" ? idGradoSeccion : null)
  const todosRecreos = useMemo(
    () => vista === "mio"
      ? mioQuery.data?.recreos ?? []
      : idGradoSeccion != null
        ? recreosSeccion.data ?? []
        : recreosDocente,
    [vista, mioQuery.data, idGradoSeccion, recreosSeccion.data, recreosDocente]
  )

  const esConsultaDocente = vista === "mio" || idDocente != null
  const turnosDocente = useMemo(() => {
    const orden = new Map(turnos.map((t, i) => [t.nombre, i]))
    return [...new Set(todas.map((h) => h.turno))].sort((a, b) =>
      (orden.get(a) ?? Number.MAX_SAFE_INTEGER) - (orden.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b, "es")
    )
  }, [todas, turnos])
  const turnoActivo = esConsultaDocente && turnosDocente.length > 1
    ? (turnoElegido && turnosDocente.includes(turnoElegido) ? turnoElegido : turnosDocente[0])
    : null
  const horarios = useMemo(
    () => turnoActivo ? todas.filter((h) => h.turno === turnoActivo) : todas,
    [todas, turnoActivo]
  )
  const recreos = useMemo(
    () => turnoActivo ? todosRecreos.filter((r) => r.turno === turnoActivo) : todosRecreos,
    [todosRecreos, turnoActivo]
  )

  const turnoGrilla = useMemo(() => {
    const nombres = [...new Set(horarios.map((h) => h.turno))]
    return vista === "colegio" && nombres.length === 1 ? turnos.find((t) => t.nombre === nombres[0]) ?? null : null
  }, [horarios, turnos, vista])
  const turnoPdf = vista === "colegio"
    ? turnoGrilla
    : turnos.find((t) => t.nombre === (turnoActivo ?? turnosDocente[0] ?? "")) ?? null
  const turnoTitulo = turnoGrilla?.nombre ?? turnoActivo

  const deAnio = anio ? ` · ${anio.anio}` : ""
  const docenteElegido = docentes.find((d) => d.idDocente === idDocente)
  const nombreDocenteElegido = docenteElegido
    ? nombreCompleto(docenteElegido)
    : idDocente != null ? `Docente #${idDocente}` : ""
  const tituloMio = (turno: string | null) =>
    armarTitulo(`Mi horario${docente ? ` — ${nombreCompleto(docente)}` : ""}`, "", turno, deAnio)
  const tituloColegio = useMemo(() => {
    let base = "Horario"
    let docenteEnTitulo = ""
    for (const g of grados) {
      const s = g.secciones.find((sec) => sec.idGradoSeccion === idGradoSeccion)
      if (s) {
        base = `Horario — ${g.nombre} ${s.nombre}`
        docenteEnTitulo = nombreDocenteElegido
        break
      }
    }
    if (base === "Horario" && idDocente != null) base = `Horario — ${nombreDocenteElegido}`
    return armarTitulo(base, docenteEnTitulo, turnoTitulo, deAnio)
  }, [grados, idGradoSeccion, idDocente, nombreDocenteElegido, turnoTitulo, deAnio])

  const recreosCargando = vista === "colegio" && (
    idGradoSeccion != null
      ? recreosSeccion.isLoading || recreosSeccion.isFetching
      : recreosDocenteQueries.some((consulta) => consulta.isLoading || consulta.isFetching)
  )
  const recreosConError = vista === "colegio" && (
    idGradoSeccion != null
      ? recreosSeccion.isError
      : recreosDocenteQueries.some((consulta) => consulta.isError)
  )
  const recreosListos = vista === "mio"
    ? true
    : idGradoSeccion != null
      ? recreosSeccion.data != null
      : recreosDocenteQueries.every((consulta) => consulta.data != null)
  const datosColegioActuales = colegioQuery.data?.firma === firmaFiltros
  const pdfDeshabilitado = !horarios.length || query.isLoading || query.isFetching || query.isError ||
    recreosCargando || recreosConError ||
    (vista === "colegio" && (!debeConsultar || !datosColegioActuales || !recreosListos))
  const hayFiltros = idAnio !== idAnioPorDefecto || idNivel != null || idGrado != null || idGradoSeccion != null || idDocente != null

  function cambiarAnio(v: string) {
    setIdAnioElegido(Number(v))
    setIdNivel(null)
    setIdGrado(null)
    setIdGradoSeccion(null)
    setTurnoElegido(null)
  }

  function cambiarNivel(nuevo: number | null) {
    setIdNivel(nuevo)
    setIdGrado(null)
    setIdGradoSeccion(null)
    setTurnoElegido(null)
  }

  function cambiarGrado(nuevo: number | null) {
    setIdGrado(nuevo)
    setIdGradoSeccion(null)
    setTurnoElegido(null)
  }

  function cambiarSeccion(nuevo: number | null) {
    setIdGradoSeccion(nuevo)
    setTurnoElegido(null)
  }

  function limpiarFiltros() {
    setIdAnioElegido(null)
    setIdNivel(null)
    setIdGrado(null)
    setIdGradoSeccion(null)
    setIdDocente(null)
    setTurnoElegido(null)
  }

  function descargarPdf() {
    if (pdfDeshabilitado) return
    generarPdfHorario([{
      titulo: vista === "mio" ? tituloMio(turnoActivo) : tituloColegio,
      horarios,
      recreos,
      vista: esConsultaDocente ? "docente" : "seccion",
      horaEntrada: turnoPdf?.horaEntrada,
      horaSalida: turnoPdf?.horaSalida,
    }])
  }

  const opcionesAnio = useMemo(
    () => [...anios].sort((a, b) => b.anio.localeCompare(a.anio)).map((a) => ({ value: String(a.idAnio), label: a.anio })),
    [anios]
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Horario Académico</h1>
        </div>
        {puedeDescargar && (
          <Button variant="outline" size="sm" onClick={descargarPdf} disabled={pdfDeshabilitado}>
            <Download data-icon="inline-start" />
            Descargar PDF
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          {esDocente && esAdmin && (
            <div className="flex rounded-md border p-0.5">
              {(["mio", "colegio"] as const).map((v) => (
                <Button key={v} type="button" size="sm" variant={vista === v ? "secondary" : "ghost"} className="h-7"
                  onClick={() => setVistaElegida(v)}>
                  {v === "mio" ? "Mi horario" : "Horarios del colegio"}
                </Button>
              ))}
            </div>
          )}

          <FilterSelect
            label="Año"
            value={idAnio ? String(idAnio) : ""}
            onValueChange={cambiarAnio}
            options={opcionesAnio}
            includeAll={false}
            className="w-[150px]"
          />

          {vista === "colegio" && (
            <>
              <GradoSeccionCascada
                compacta
                value={idGradoSeccion}
                onChange={cambiarSeccion}
                idNivel={idNivel}
                idGrado={idGrado}
                onNivelChange={cambiarNivel}
                onGradoChange={cambiarGrado}
                allowedAnios={idAnio != null ? new Set([idAnio]) : undefined}
              />
              <FilterSelect
                label="Docente"
                value={idDocente ? String(idDocente) : ""}
                onValueChange={(v) => setIdDocente(v ? Number(v) : null)}
                options={opcionesDocentes}
                className="w-[220px]"
                opcionesLargas
              />
              <BotonLimpiarFiltros visible={hayFiltros} onClick={limpiarFiltros} />
            </>
          )}
        </CardContent>
        {vista === "colegio" && avisoDocentes && (
          <p className="px-3 pb-3 text-xs text-muted-foreground">{avisoDocentes}</p>
        )}
      </Card>

      {esConsultaDocente && todas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {resumen(todas, turnosDocente).map((dato) => (
            <Badge key={dato} variant="secondary" className="font-medium">{dato}</Badge>
          ))}
        </div>
      )}
      {vista === "colegio" && turnoGrilla && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Turno:</span>
          <Badge variant="secondary" className="font-medium">{turnoGrilla.nombre}</Badge>
        </div>
      )}

      {turnoActivo && (
        <div className="flex w-fit rounded-md border p-0.5">
          {turnosDocente.map((t) => (
            <Button key={t} type="button" size="sm" variant={turnoActivo === t ? "secondary" : "ghost"} className="h-7"
              onClick={() => setTurnoElegido(t)}>
              {t}
            </Button>
          ))}
        </div>
      )}

      {vista === "colegio" && !debeConsultar ? (
        <Vacio titulo="Selecciona una sección o un docente para ver el horario" />
      ) : query.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : query.isError ? (
        <Vacio titulo={query.error instanceof Error ? query.error.message : "Error al cargar el horario."} />
      ) : !horarios.length ? (
        <Vacio
          titulo={vista === "mio" ? `No tienes clases asignadas${anio ? ` en ${anio.anio}` : ""}.` : "No hay horarios para los filtros seleccionados."}
        />
      ) : (
        <CalendarioSemanal
          horarios={horarios}
          recreos={recreos}
          titulo={vista === "mio" ? tituloMio(turnoActivo) : tituloColegio}
          horaEntrada={turnoGrilla?.horaEntrada}
          horaSalida={turnoGrilla?.horaSalida}
          vista={esConsultaDocente ? "docente" : "seccion"}
        />
      )}
    </div>
  )
}
