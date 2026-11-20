"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Download, Loader2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { useAuth } from "@/components/auth-provider"
import { usePuede } from "@/hooks/use-permisos"
import { CalendarioSemanal } from "@/components/horario/calendario-semanal"
import { FilterSelect } from "@/components/shared/filter-select"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { useAniosEscolares, useDocenteDeUsuario, useDocentes, useGrados, useTurnos } from "@/hooks/use-academico"
import { useHorarios, useMiHorario, useRecreosSeccion, useRolHorario } from "@/hooks/use-horario"
import { anioParaFiltro } from "@/lib/api/academico"
import { type HorarioListItem, type RecreoHorario } from "@/lib/api/horario"
import { aMinutos } from "@/lib/horario"
import { generarPdfHorario } from "@/lib/reportes/generar-pdf"

/** mio: el horario del docente; colegio: el de cualquier sección. */
type Vista = "mio" | "colegio"

/** Página del horario del colegio: lista o página según la respuesta. */
function comoLista(data: unknown): HorarioListItem[] {
  if (Array.isArray(data)) return data as HorarioListItem[]
  return ((data as { content?: HorarioListItem[] } | undefined)?.content ?? []) as HorarioListItem[]
}

function horasDe(horarios: HorarioListItem[]): number {
  const minutos = horarios.reduce((total, h) => total + aMinutos(h.horaFin) - aMinutos(h.horaInicio), 0)
  return Math.round((minutos / 60) * 10) / 10
}

/** "18 h semanales (12 mañana · 6 tarde)", "4 cursos", "5 secciones". */
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
  // El apoderado verá el horario de su hijo en su portal, no aquí.
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
  // Quien es docente ve primero su horario; si además administra horarios, puede cambiar al del colegio.
  const [vistaElegida, setVistaElegida] = useState<Vista | null>(null)
  const vista: Vista = esDocente ? (esAdmin ? vistaElegida ?? "mio" : "mio") : "colegio"

  const { data: anios = [] } = useAniosEscolares()
  const [idAnioElegido, setIdAnioElegido] = useState<number | null>(null)
  const idAnio = idAnioElegido ?? anioParaFiltro(anios)?.idAnio ?? null
  const anio = anios.find((a) => a.idAnio === idAnio)

  // Filtros del horario del colegio
  const [idGradoSeccion, setIdGradoSeccion] = useState<number | null>(null)
  const [idDocente, setIdDocente] = useState<number | null>(null)
  const { data: grados = [] } = useGrados()
  const { data: turnos = [] } = useTurnos()
  const { data: docentes = [] } = useDocentes()

  const docente = useDocenteDeUsuario(esDocente ? usuario?.idUsuario : undefined)
  const mioQuery = useMiHorario(idAnio, vista === "mio" && idAnio != null)
  const colegioQuery = useHorarios(
    vista === "colegio"
      ? { page: 0, size: 100, idGradoSeccion: idGradoSeccion ?? undefined, idDocente: idDocente ?? undefined, idAnio: idAnio ?? undefined, enabled: idGradoSeccion != null }
      : { enabled: false }
  )
  const recreosSeccion = useRecreosSeccion(vista === "colegio" ? idGradoSeccion : null)
  const query = vista === "mio" ? mioQuery : colegioQuery

  const todas = useMemo(
    () => (vista === "mio" ? mioQuery.data?.clases ?? [] : comoLista(colegioQuery.data)),
    [vista, mioQuery.data, colegioQuery.data]
  )
  const todosRecreos: RecreoHorario[] = vista === "mio" ? mioQuery.data?.recreos ?? [] : recreosSeccion.data ?? []

  // Turnos en que dicta el docente: con dos, cada uno en su pestaña.
  const turnosDocente = useMemo(() => {
    const vistos = new Map<string, number>()
    for (const h of todas) if (!vistos.has(h.turno)) vistos.set(h.turno, h.idTurno ?? 0)
    return [...vistos.entries()].sort((a, b) => a[1] - b[1]).map(([nombre]) => nombre)
  }, [todas])
  const [turnoElegido, setTurnoElegido] = useState<string | null>(null)
  const turnoActivo = vista === "mio" && turnosDocente.length > 1
    ? (turnoElegido && turnosDocente.includes(turnoElegido) ? turnoElegido : turnosDocente[0])
    : null
  const horarios = turnoActivo ? todas.filter((h) => h.turno === turnoActivo) : todas
  const recreos = turnoActivo ? todosRecreos.filter((r) => r.turno === turnoActivo) : todosRecreos

  // En el colegio, con un solo turno la grilla usa su horario de entrada y salida.
  const turnoGrilla = useMemo(() => {
    const nombres = [...new Set(horarios.map((h) => h.turno))]
    return vista === "colegio" && nombres.length === 1 ? turnos.find((t) => t.nombre === nombres[0]) ?? null : null
  }, [horarios, turnos, vista])
  const turnoPdf = useMemo(() => {
    if (vista === "colegio") return turnoGrilla
    const nombre = turnoActivo ?? turnosDocente[0] ?? null
    return nombre ? turnos.find((t) => t.nombre === nombre) ?? null : null
  }, [vista, turnoGrilla, turnoActivo, turnosDocente, turnos])

  const deAnio = anio ? ` · ${anio.anio}` : ""
  const tituloMio = (turno: string | null) =>
    `Mi horario${docente ? ` — ${docente.nombre} ${docente.apellidoPat}` : ""}${turno ? ` · Turno ${turno.toLowerCase()}` : ""}${deAnio}`
  const tituloColegio = useMemo(() => {
    for (const g of grados) {
      const s = g.secciones.find((sec) => sec.idGradoSeccion === idGradoSeccion)
      if (s) return `Horario — ${g.nombre} ${s.nombre}${deAnio}`
    }
    return "Horario"
  }, [grados, idGradoSeccion, deAnio])

  function descargarPdf() {
    if (!horarios.length) return
    generarPdfHorario([{
      titulo: vista === "mio" ? tituloMio(turnoActivo) : tituloColegio,
      horarios,
      recreos,
      vista: vista === "mio" ? "docente" : "seccion",
      horaEntrada: turnoPdf?.horaEntrada,
      horaSalida: turnoPdf?.horaSalida,
    }])
  }

  const opcionesAnio = [...anios].sort((a, b) => b.anio.localeCompare(a.anio)).map((a) => ({ value: String(a.idAnio), label: a.anio }))

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Horario Académico</h1>
        </div>
        {puedeDescargar && (
          <Button variant="outline" size="sm" onClick={descargarPdf} disabled={!horarios.length || query.isLoading}>
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
            onValueChange={(v) => {
              setIdAnioElegido(Number(v))
              setIdGradoSeccion(null)
            }}
            options={opcionesAnio}
            includeAll={false}
            className="w-[150px]"
          />

          {vista === "colegio" && (
            <>
              {/* La key reinicia la cascada al cambiar de año: sus grados son de ese año. */}
              <GradoSeccionCascada
                key={idAnio ?? 0}
                compacta
                value={idGradoSeccion}
                onChange={setIdGradoSeccion}
                allowedAnios={idAnio != null ? new Set([idAnio]) : undefined}
              />
              <FilterSelect
                label="Docente"
                value={idDocente ? String(idDocente) : ""}
                onValueChange={(v) => setIdDocente(v ? Number(v) : null)}
                options={docentes.map((d) => ({ value: String(d.idDocente), label: `${d.nombre} ${d.apellidoPat}` }))}
                className="w-[220px]"
              />
            </>
          )}
        </CardContent>
      </Card>

      {vista === "mio" && todas.length > 0 && (
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

      {vista === "colegio" && idGradoSeccion == null ? (
        <Vacio titulo="Selecciona nivel, grado y sección para ver el horario" />
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
          vista={vista === "mio" ? "docente" : "seccion"}
        />
      )}
    </div>
  )
}
