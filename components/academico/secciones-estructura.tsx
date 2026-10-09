"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  Plus,
  RotateCcw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { SeccionesPorNivel } from "@/components/academico/secciones-por-nivel"
import { NuevaSeccionDialog } from "@/components/academico/nueva-seccion-dialog"
import {
  useAniosEscolares,
  useCrearSeccion,
  useEliminarSeccion,
  useActualizarSeccion,
  useEliminarSeccionesLote,
  useGrados,
  useNiveles,
  useSeccionesPorGrado,
  useTurnos,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import {
  ESTADO_ANIO,
  aniosHabilitados,
  anioPorDefecto,
  estadoAnioTexto,
  motivoAnioNoHabilitado,
  type AnioEscolarResponse,
  type GradoResponse,
  type TurnoResponse,
} from "@/lib/api/academico"
import { formatearFecha } from "@/lib/fechas"

interface SeccionesEstructuraProps {
  onIrATurnos?: () => void
  onIrAAnios?: () => void
}

/** Mismo orden que la tabla: los grados que arrancan con número van primero. */
function ordenGradoNombre(nombre: string): number {
  const n = nombre.match(/\d+/)?.[0]
  return n ? Number.parseInt(n, 10) : Number.POSITIVE_INFINITY
}

/** Filtros de la vista de secciones. `anio` es null = año predeterminado. */
interface FiltrosSecciones {
  anio: string | null
  nivel: string
  grado: string
  turno: string
}

/**
 * Garantiza que la jerarquía Año > Nivel > Grado > Turno no deje valores sin
 * opción válida: si un filtro no existe dentro del contexto de los superiores,
 * se resetea a "Todos" (""), y lo mismo sus descendientes. Se aplica en cada
 * cambio de filtro, sin effects.
 */
function normalizarFiltros(
  candidato: FiltrosSecciones,
  grados: GradoResponse[],
  anioDefId: number | undefined,
): FiltrosSecciones {
  const anio = candidato.anio === "" ? null : candidato.anio
  const idAnio = anio != null ? Number(anio) : anioDefId
  const enAnio = grados
    .map((g) => ({
      ...g,
      secciones: g.secciones.filter((s) => s.nombre && s.idAnio === idAnio),
    }))
    .filter((g) => g.secciones.length > 0)

  const nivel = candidato.nivel
  const nivelFinal = !nivel || enAnio.some((g) => String(g.idNivel) === nivel) ? nivel : ""

  const idNivel = nivelFinal ? Number(nivelFinal) : null
  const grado = candidato.grado
  const gradoValido =
    !grado ||
    enAnio.some(
      (g) =>
        (idNivel == null || g.idNivel === idNivel) && String(g.idGrado) === grado,
    )
  const gradoFinal = gradoValido ? grado : ""

  const idGrado = gradoFinal ? Number(gradoFinal) : null
  const turno = candidato.turno
  const turnoValido =
    !turno ||
    enAnio.some((g) => {
      if (idNivel != null && g.idNivel !== idNivel) return false
      if (idGrado != null && g.idGrado !== idGrado) return false
      return g.secciones.some((s) => String(s.idTurno) === turno)
    })

  return { anio, nivel: nivelFinal, grado: gradoFinal, turno: turnoValido ? turno : "" }
}

export function SeccionesEstructura({
  onIrATurnos,
  onIrAAnios,
}: SeccionesEstructuraProps) {
  const { data, isLoading, isError, refetch } = useGrados()
  const { data: turnos = [], isLoading: cargandoTurnos } = useTurnos()
  const { data: anios = [], isLoading: cargandoAnios } = useAniosEscolares()
  const { data: niveles = [] } = useNiveles()
  const puedeCrear = usePuede("GRADOS", "CREAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")
  const [nuevaAbierto, setNuevaAbierto] = useState(false)
  const [editando, setEditando] = useState<{
    grado: GradoResponse
    idTurno: number
    idAnio: number
  } | null>(null)
  // Filtros: el año arranca en null (= predeterminado) y nivel/grado/turno
  // usan "" para "Todos". Las combinaciones inválidas se resuelven dentro de
  // los handlers con normalizarFiltros, sin effects.
  const [filtros, setFiltros] = useState<FiltrosSecciones>({
    anio: null,
    nivel: "",
    grado: "",
    turno: "",
  })

  const turnoActivo = turnos.find((t) => t.accesoId === 1) ?? null
  const faltaTurno = !turnoActivo
  const habilitados = aniosHabilitados(anios)
  // Predeterminado: siempre el vigente; sin vigente, el por comenzar iniciado
  // más alto (misma regla que anioPorDefecto). "Limpiar filtros" vuelve acá.
  const anioVigente =
    habilitados.find((a) => a.estado === ESTADO_ANIO.VIGENTE) ?? anioPorDefecto(habilitados)
  const anioDefId = anioVigente?.idAnio
  const anioEfectivo = filtros.anio ?? (anioDefId != null ? String(anioDefId) : "")

  function aplicarAnio(valor: string) {
    setFiltros((actuales) =>
      normalizarFiltros({ ...actuales, anio: valor === "" ? null : valor }, data ?? [], anioDefId),
    )
  }
  function aplicarNivel(valor: string) {
    setFiltros((actuales) => normalizarFiltros({ ...actuales, nivel: valor }, data ?? [], anioDefId))
  }
  function aplicarGrado(valor: string) {
    setFiltros((actuales) => normalizarFiltros({ ...actuales, grado: valor }, data ?? [], anioDefId))
  }
  function aplicarTurno(valor: string) {
    setFiltros((actuales) => normalizarFiltros({ ...actuales, turno: valor }, data ?? [], anioDefId))
  }

  function limpiarFiltros() {
    setFiltros({ anio: null, nivel: "", grado: "", turno: "" })
  }

  const aniosOptions = useMemo(
    () =>
      habilitados
        .slice()
        .sort((a, b) => (a.anio < b.anio ? 1 : a.anio > b.anio ? -1 : 0))
        .map((a) => ({
          value: String(a.idAnio),
          label: `${a.anio} · ${estadoAnioTexto(a.estado)}`,
        })),
    [habilitados],
  )

  // Grados con al menos una sección (con letra) en el año seleccionado: base de
  // las opciones de Nivel, Grado y Turno. Todo el filtrado es local.
  const conSeccionesDelAnio = useMemo(() => {
    const id = Number(anioEfectivo)
    if (!id) return [] as GradoResponse[]
    return (data ?? [])
      .map((g) => ({
        ...g,
        secciones: g.secciones.filter((s) => s.nombre && s.idAnio === id),
      }))
      .filter((g) => g.secciones.length > 0)
  }, [data, anioEfectivo])

  const nivelesDisponibles = useMemo(() => {
    const pos = new Map(niveles.map((n, i) => [n.idNivel, i]))
    const porNivel = new Map<number, string>()
    for (const g of conSeccionesDelAnio) porNivel.set(g.idNivel, g.nivel)
    return [...porNivel.entries()]
      .sort(
        (a, b) =>
          (pos.get(a[0]) ?? Number.POSITIVE_INFINITY) - (pos.get(b[0]) ?? Number.POSITIVE_INFINITY) ||
          a[1].localeCompare(b[1], "es"),
      )
      .map(([id, nombre]) => ({ value: String(id), label: nombre }))
  }, [conSeccionesDelAnio, niveles])

  const idNivelSel = filtros.nivel ? Number(filtros.nivel) : null
  const gradosDisponibles = useMemo(() => {
    // Orden de nivel del catálogo y, dentro de cada nivel, por número de grado:
    // así los encabezados de nivel no quedan intercalados.
    const posNivel = new Map(niveles.map((n, i) => [n.idNivel, i]))
    return conSeccionesDelAnio
      .filter((g) => (idNivelSel == null ? true : g.idNivel === idNivelSel))
      .sort(
        (a, b) =>
          (posNivel.get(a.idNivel) ?? Number.POSITIVE_INFINITY) -
            (posNivel.get(b.idNivel) ?? Number.POSITIVE_INFINITY) ||
          ordenGradoNombre(a.nombre) - ordenGradoNombre(b.nombre) ||
          a.nombre.localeCompare(b.nombre, "es"),
      )
      .map((g) => ({
        value: String(g.idGrado),
        label: g.nombre,
        // Con "Nivel: Todos" las opciones se agrupan por nivel en el dropdown;
        // con un nivel elegido la lista ya está filtrada y no se muestra header.
        group: idNivelSel == null ? g.nivel : undefined,
      }))
  }, [conSeccionesDelAnio, idNivelSel, niveles])

  const idGradoSel = filtros.grado ? Number(filtros.grado) : null
  const turnosDisponibles = useMemo(() => {
    const pos = new Map(turnos.map((t, i) => [t.idTurno, i]))
    const porTurno = new Map<number, string>()
    for (const g of conSeccionesDelAnio) {
      if (idNivelSel != null && g.idNivel !== idNivelSel) continue
      if (idGradoSel != null && g.idGrado !== idGradoSel) continue
      for (const s of g.secciones) porTurno.set(s.idTurno, s.turno)
    }
    return [...porTurno.entries()]
      .sort(
        (a, b) =>
          (pos.get(a[0]) ?? Number.POSITIVE_INFINITY) - (pos.get(b[0]) ?? Number.POSITIVE_INFINITY) ||
          a[1].localeCompare(b[1], "es"),
      )
      .map(([id, nombre]) => ({ value: String(id), label: nombre }))
  }, [conSeccionesDelAnio, idNivelSel, idGradoSel, turnos])

  const gradosFiltrados = useMemo(() => {
    const idAnio = Number(anioEfectivo)
    const idTurnoSel = filtros.turno ? Number(filtros.turno) : null
    return (data ?? [])
      .filter((g) => (idNivelSel == null ? true : g.idNivel === idNivelSel))
      .filter((g) => (idGradoSel == null ? true : g.idGrado === idGradoSel))
      .map((g) => ({
        ...g,
        secciones: g.secciones.filter(
          (s) =>
            s.nombre &&
            (idAnio ? s.idAnio === idAnio : true) &&
            (idTurnoSel == null || s.idTurno === idTurnoSel),
        ),
      }))
      .filter((g) => g.secciones.length > 0)
  }, [data, anioEfectivo, idNivelSel, idGradoSel, filtros.turno])

  const hayFiltros =
    anioDefId != null &&
    (anioEfectivo !== String(anioDefId) ||
      filtros.nivel !== "" ||
      filtros.grado !== "" ||
      filtros.turno !== "")
  // No alcanza con que exista un año: tiene que ser uno sobre el que se pueda
  // crear hoy (vigente o por comenzar ya iniciado).
  const faltaAnio = habilitados.length === 0
  const bloqueado = (faltaTurno || faltaAnio) && !cargandoTurnos && !cargandoAnios

  /*
   * Por qué se bloquea cuando hay años pero ninguno habilitado: el caso
   * esperado es un único por comenzar cuya fecha de inicio todavía no llegó.
   */
  const anioPendiente =
    anios
      .filter((a) => a.estado === ESTADO_ANIO.POR_COMENZAR)
      .sort((a, b) => (a.anio < b.anio ? 1 : -1))[0] ?? null
  const detalleAnio = !faltaAnio
    ? undefined
    : anioPendiente
      ? anioPendiente.fechaInicio
        ? `El año ${anioPendiente.anio} estará disponible desde el ${formatearFecha(anioPendiente.fechaInicio)}.`
        : `El año ${anioPendiente.anio} está por comenzar pero no tiene fecha de inicio: configúralo en Año escolar.`
      : anios.length > 0
        ? "Solo hay años cerrados. Crea el nuevo año escolar para poder registrar secciones."
        : undefined

  // La fila que se pidió editar define todo: grado + turno + año. Si el año
  // dejó de existir (borrado en otra pestaña), no hay contexto y no se abre.
  const anioEditando = editando ? (anios.find((a) => a.idAnio === editando.idAnio) ?? null) : null
  const turnoEditando = editando ? (turnos.find((t) => t.idTurno === editando.idTurno) ?? null) : null

  if (bloqueado) {
    return (
      <RequisitosPendientes
        faltaTurno={faltaTurno}
        faltaAnio={faltaAnio}
        detalleAnio={detalleAnio}
        onIrATurnos={onIrATurnos}
        onIrAAnios={onIrAAnios}
      />
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Secciones"
          descripcion="Cada sección pertenece a un grado, un turno y un año escolar habilitado (vigente o por comenzar ya iniciado)."
          acciones={
            <BotonNuevo
              texto="Nueva sección"
              puedeCrear={puedeCrear}
              onClick={() => setNuevaAbierto(true)}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Año escolar"
            includeAll={false}
            value={anioEfectivo || ""}
            onValueChange={aplicarAnio}
            options={aniosOptions}
            className="min-w-48"
          />
          <FilterSelect
            value={filtros.nivel}
            onValueChange={aplicarNivel}
            options={nivelesDisponibles}
            allLabel="Todos los niveles"
          />
          <FilterSelect
            value={filtros.grado}
            onValueChange={aplicarGrado}
            options={gradosDisponibles}
            allLabel="Todos los grados"
          />
          <FilterSelect
            value={filtros.turno}
            onValueChange={aplicarTurno}
            options={turnosDisponibles}
            allLabel="Todos los turnos"
          />
          {hayFiltros && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={limpiarFiltros}
            >
              <RotateCcw className="mr-1 size-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <SeccionesPorNivel
          grados={gradosFiltrados}
          niveles={niveles}
          turnos={turnos}
          isLoading={isLoading}
          isError={isError}
          puedeActualizar={puedeActualizar}
          onEditar={(grado, idTurno, idAnio) => setEditando({ grado, idTurno, idAnio })}
          mensajeVacio={
            hayFiltros
              ? "No hay secciones que coincidan con los filtros seleccionados."
              : undefined
          }
        />
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <NuevaSeccionDialog
          open={nuevaAbierto}
          onOpenChange={setNuevaAbierto}
          niveles={niveles}
          turnos={turnos}
          turnoPorDefecto={turnoActivo}
        />
        {editando && anioEditando && (
          <EditarSeccionesDialog
            key={`${editando.grado.idGrado}-${editando.idTurno}-${editando.idAnio}`}
            grado={editando.grado}
            idTurno={editando.idTurno}
            turno={turnoEditando}
            anio={anioEditando}
            onOpenChange={(abierto) => {
              if (!abierto) setEditando(null)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
interface RequisitosPendientesProps {
  faltaTurno: boolean
  faltaAnio: boolean
  /** Por qué el año (o años) existente no alcanza: falta de fecha, futuro, cerrado... */
  detalleAnio?: string
  onIrATurnos?: () => void
  onIrAAnios?: () => void
}

function RequisitosPendientes({
  faltaTurno,
  faltaAnio,
  detalleAnio,
  onIrATurnos,
  onIrAAnios,
}: RequisitosPendientesProps) {
  const pendientes: {
    falta: boolean
    titulo: string
    descripcion: string
    icono: LucideIcon
    accion?: () => void
    etiqueta: string
  }[] = [
    {
      falta: faltaTurno,
      titulo: "No hay ningún turno activo",
      descripcion: "Los turnos agrupan las secciones y definen el horario de cada grado.",
      icono: Clock3,
      accion: onIrATurnos,
      etiqueta: "Ir a Turnos",
    },
    {
      falta: faltaAnio,
      titulo: "No hay un año escolar habilitado",
      descripcion:
        "Cada sección nueva se registra en un año habilitado: el vigente o el que está por comenzar y ya inició. " +
        (detalleAnio ?? "Crea uno o actívalo."),
      icono: CalendarDays,
      accion: onIrAAnios,
      etiqueta: "Ir a Año escolar",
    },
  ].filter((p) => p.falta)

  const sinPermiso = pendientes.filter((p) => !p.accion).length

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <HeaderSeccion
          titulo="Secciones"
          descripcion="Una sección necesita un turno y un año escolar habilitado (vigente o por comenzar ya iniciado), así que ambos deben existir antes de registrarla."
          icono={GraduationCap}
        />
        <ul className="flex flex-col gap-3">
          {pendientes.map((p) => {
            const Icono = p.icono
            return (
              <li
                key={p.etiqueta}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4"
              >
                <div className="flex items-start gap-3">
                  <Icono className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      {p.descripcion}
                    </p>
                  </div>
                </div>
                {p.accion && (
                  <Button variant="outline" size="sm" onClick={p.accion}>
                    {p.etiqueta}
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {sinPermiso > 0 && (
          <p className="text-[13px] leading-5 text-muted-foreground">
            {sinPermiso === 1
              ? "Pide a un administrador que registre ese dato para habilitar esta sección."
              : "Pide a un administrador que registre esos datos para habilitar esta sección."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
function EditarSeccionesDialog({
  grado,
  idTurno,
  turno,
  anio,
  onOpenChange,
}: {
  grado: GradoResponse
  /** Turno de la fila que se abrió: las secciones de aquí son de ese turno. */
  idTurno: number
  turno: TurnoResponse | null
  /** Año de la fila que se abrió: idAnio explícito en cada alta. */
  anio: AnioEscolarResponse
  onOpenChange: (open: boolean) => void
}) {
  const eliminar = useEliminarSeccion()
  const crear = useCrearSeccion()
  const actualizar = useActualizarSeccion()
  const eliminarLote = useEliminarSeccionesLote()
  const { data: secciones = [], isLoading, refetch } = useSeccionesPorGrado(grado.idGrado)
  const [agregar, setAgregar] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    open: boolean
    id: number | null
    nombre: string
  }>({ open: false, id: null, nombre: "" })
  const [confirmarLote, setConfirmarLote] = useState<{
    open: boolean
    ids: number[]
    nombres: string[]
  }>({ open: false, ids: [], nombres: [] })
  const puedeEliminar = usePuede("GRADOS", "ELIMINAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")

  // Cada fila de la tabla es grado + turno + año: este diálogo gestiona solo
  // la combinación exacta que se pidió, no las demás.
  const seccionesConLetra = secciones.filter(
    (s) => s.nombre && s.idTurno === idTurno && s.idAnio === anio.idAnio,
  )

  const contexto = `${turno?.nombre ?? "Turno"} · ${anio.anio} · ${estadoAnioTexto(anio.estado)}`
  const motivoBloqueo = motivoAnioNoHabilitado(anio)

  const enUso = (s: (typeof seccionesConLetra)[number]) =>
    s.tieneMatriculas || s.tieneAsignaciones

  // Una sección solo se puede marcar si se puede eliminar: el estado de uso de
  // la sección, el permiso y el bloqueo del año valen para todo el diálogo.
  const esSeleccionable = (s: (typeof seccionesConLetra)[number]) =>
    puedeEliminar && !enUso(s) && motivoBloqueo === null

  const seleccionables = seccionesConLetra.filter(esSeleccionable)
  const idsSeleccionables = seleccionables.map((s) => s.idGradoSeccion)
  const todasSeleccionadas =
    idsSeleccionables.length > 0 &&
    idsSeleccionables.every((id) => seleccionados.has(id))
  const seleccionParcial = seleccionados.size > 0 && !todasSeleccionadas

  // El checkbox "Seleccionar todas" muestra el estado intermedio cuando hay
  // selección parcial: `indeterminate` solo se puede fijar por ref.
  const refTodas = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (refTodas.current) refTodas.current.indeterminate = seleccionParcial
  }, [seleccionParcial])

  function alternarTodas() {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (todasSeleccionadas) {
        idsSeleccionables.forEach((id) => next.delete(id))
      } else {
        idsSeleccionables.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function borrar(idGradoSeccion: number, nombre: string) {
    try {
      await eliminar.mutateAsync(idGradoSeccion)
      toast.success(`Sección ${nombre} eliminada`)
      refetch()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar la sección"
      )
    }
  }

  async function guardarNueva() {
    if (!nombreNuevo.trim()) return

    const nombre = nombreNuevo.trim().toUpperCase()

    if (nombre.length !== 1 || !/^[A-Z]$/.test(nombre)) {
      toast.error("La sección debe ser una sola letra (A-Z)")
      return
    }

    try {
      await crear.mutateAsync({
        idGrado: grado.idGrado,
        idTurno,
        nombre,
        idAnio: anio.idAnio,
      })

      toast.success(`Sección ${nombre} agregada`)
      setNombreNuevo("")
      setAgregar(false)
      refetch()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al agregar la sección"
      )
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Editar secciones
          </DialogTitle>
          <DialogDescription>
            Gestiona las secciones de {grado.nombre} en {contexto}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-[13px] text-muted-foreground">Cargando...</p>
            ) : seccionesConLetra.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Este grado todavía no tiene secciones en {contexto}. Agrega la primera.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {seccionesConLetra.map((s) => {
                  const bloqueada = enUso(s)
                  const editandoFila = editId === s.idGradoSeccion
                  const anioBloqueado = motivoBloqueo !== null
                  return (
                    <li
                      key={s.idGradoSeccion}
                      className="flex items-center justify-between gap-3 rounded-md border p-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(s.idGradoSeccion)}
                          disabled={!esSeleccionable(s)}
                          onChange={(e) => {
                            const setSel = new Set(seleccionados)
                            if (e.target.checked) {
                              setSel.add(s.idGradoSeccion)
                            } else {
                              setSel.delete(s.idGradoSeccion)
                            }
                            setSeleccionados(setSel)
                          }}
                          aria-label={`Seleccionar sección ${s.nombre}`}
                        />
                        {editandoFila ? (
                          <div className="flex w-full flex-col gap-1">
                            <Input
                              value={editNombre}
                              onChange={(e) => {
                                let v = e.target.value.toUpperCase()
                                if (v.length > 1) v = v[0] ?? ""
                                if (v && !/^[A-Z]$/.test(v)) v = ""
                                setEditNombre(v)
                                setEditError(null)
                              }}
                              autoFocus
                              maxLength={1}
                              disabled={anioBloqueado}
                              className="h-8"
                            />
                            {editError && (
                              <p className="text-xs text-destructive">{editError}</p>
                            )}
                          </div>
                        ) : (
                          <div
                            className="min-w-0 flex-1 cursor-text"
                            onClick={() => {
                              if (!puedeActualizar || anioBloqueado) return
                              setEditId(s.idGradoSeccion)
                              setEditNombre(s.nombre)
                              setEditError(null)
                            }}
                            onFocus={() => {
                              if (!puedeActualizar || anioBloqueado) return
                              setEditId(s.idGradoSeccion)
                              setEditNombre(s.nombre)
                              setEditError(null)
                            }}
                            tabIndex={0}
                            role="textbox"
                            aria-label={`Editar sección ${s.nombre}`}
                          >
                            <p className="text-sm font-medium">{s.nombre}</p>
                            {bloqueada && (
                              <p className="text-xs text-muted-foreground">
                                {s.tieneMatriculas ? "con alumnos" : "con cursos"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {editandoFila ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={anioBloqueado || actualizar.isPending}
                            onClick={async () => {
                              const nombreEdit = editNombre.trim().toUpperCase()
                              if (nombreEdit === s.nombre) {
                                setEditId(null)
                                setEditNombre("")
                                setEditError(null)
                                return
                              }
                              if (nombreEdit.length !== 1 || !/^[A-Z]$/.test(nombreEdit)) {
                                setEditError("La sección debe ser una sola letra (A-Z)")
                                return
                              }
                              const duplicado = seccionesConLetra.some(
                                (sec) =>
                                  sec.idGradoSeccion !== s.idGradoSeccion &&
                                  sec.nombre.toUpperCase() === nombreEdit,
                              )
                              if (duplicado) {
                                setEditError("Ya existe otra sección con esa letra")
                                return
                              }
                              try {
                                await actualizar.mutateAsync({
                                  idGradoSeccion: s.idGradoSeccion,
                                  nombre: nombreEdit,
                                })
                                toast.success(
                                  `Sección ${s.nombre} actualizada a ${nombreEdit}`,
                                )
                                setEditId(null)
                                setEditNombre("")
                                setEditError(null)
                                refetch()
                              } catch (error) {
                                setEditError(
                                  error instanceof Error
                                    ? error.message
                                    : "Error al actualizar la sección",
                                )
                              }
                            }}
                            aria-label="Guardar sección"
                            title="Guardar"
                          >
                            <Check />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditId(null)
                              setEditNombre("")
                              setEditError(null)
                            }}
                            aria-label="Cancelar edición"
                            title="Cancelar"
                          >
                            <X />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={
                            !puedeEliminar ||
                            bloqueada ||
                            eliminar.isPending ||
                            motivoBloqueo !== null
                          }
                          onClick={() =>
                            setConfirmarEliminar({
                              open: true,
                              id: s.idGradoSeccion,
                              nombre: s.nombre,
                            })
                          }
                          aria-label={`Eliminar sección ${s.nombre}`}
                          title={
                            bloqueada
                              ? "No se puede eliminar: tiene alumnos matriculados o cursos asignados"
                              : motivoBloqueo
                                ? motivoBloqueo
                                : `Eliminar sección ${s.nombre}`
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {!isLoading && seccionesConLetra.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input
                  type="checkbox"
                  ref={refTodas}
                  checked={todasSeleccionadas}
                  disabled={seleccionables.length === 0}
                  onChange={alternarTodas}
                />
                Seleccionar todas
              </label>
              {seleccionados.size > 0 && (
                <span className="text-[13px] text-muted-foreground">
                  {seleccionados.size === 1
                    ? "1 sección seleccionada"
                    : `${seleccionados.size} secciones seleccionadas`}
                </span>
              )}
            </div>
          )}

          {agregar && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              {/*
                Turno y año no se eligen acá: los define la fila que se abrió.
                El mismo texto queda a la vista para que el usuario sepa dónde
                va a caer la letra que escriba.
              */}
              <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                {contexto}
              </p>
              <Field>
                <FieldLabel>Sección</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="B"
                    maxLength={1}
                    value={nombreNuevo}
                    onChange={(e) => {
                      let v = e.target.value.toUpperCase()
                      if (v.length > 1) v = v[0] ?? ""
                      if (v && !/^[A-Z]$/.test(v)) v = ""
                      setNombreNuevo(v)
                    }}
                    autoFocus
                  />
                  <FieldDescription className="text-xs">
                    Ingrese una sola letra (A, B, C, ...).
                  </FieldDescription>
                </FieldContent>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAgregar(false); setNombreNuevo("") }}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!nombreNuevo || crear.isPending}
                  onClick={guardarNueva}
                >
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap justify-between gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {!agregar && (
              <Button
                type="button"
                variant="outline"
                disabled={!puedeActualizar || motivoBloqueo !== null}
                title={motivoBloqueo ?? undefined}
                onClick={() => setAgregar(true)}
              >
                <Plus className="mr-1 size-4" /> Agregar otra sección
              </Button>
            )}
            {seleccionados.size > 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const ids = Array.from(seleccionados)
                  const nombres = seccionesConLetra
                    .filter((s) => ids.includes(s.idGradoSeccion))
                    .map((s) => s.nombre)
                  setConfirmarLote({ open: true, ids, nombres })
                }}
              >
                {seleccionados.size === 1
                  ? "Eliminar seleccionada"
                  : "Eliminar seleccionadas"}
              </Button>
            )}
          </div>
          <DialogTrigger render={<Button variant="outline" />}>Cerrar</DialogTrigger>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={confirmarEliminar.open}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setConfirmarEliminar({ open: false, id: null, nombre: "" })
          }
        }}
      >
        <DialogContent className="sm:max-w-md" forceOverlay>
          <DialogHeader>
            <DialogTitle>Eliminar sección</DialogTitle>
            <DialogDescription>
              ¿Eliminar la sección {confirmarEliminar.nombre} de {grado.nombre} en {contexto}?
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const sec = seccionesConLetra.find(
              (s) => s.idGradoSeccion === confirmarEliminar.id,
            )
            if (sec && enUso(sec)) {
              return (
                <p className="text-xs text-muted-foreground">
                  {sec.tieneMatriculas
                    ? "Esta sección tiene alumnos matriculados y no se puede eliminar."
                    : "Esta sección tiene cursos asignados y no se puede eliminar."}
                </p>
              )
            }
            return null
          })()}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setConfirmarEliminar({ open: false, id: null, nombre: "" })
              }
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={eliminar.isPending}
              onClick={async () => {
                if (confirmarEliminar.id === null) return
                await borrar(confirmarEliminar.id, confirmarEliminar.nombre)
                setConfirmarEliminar({ open: false, id: null, nombre: "" })
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmarLote.open}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setConfirmarLote({ open: false, ids: [], nombres: [] })
          }
        }}
      >
        <DialogContent className="sm:max-w-md" forceOverlay>
          <DialogHeader>
            <DialogTitle>Eliminar secciones seleccionadas</DialogTitle>
            <DialogDescription>
              Se eliminarán {confirmarLote.ids.length} secci
              {confirmarLote.ids.length === 1 ? "ó" : "ones"}
              ({confirmarLote.nombres.join(", ")}) de{" "}
              {grado.nombre} en {contexto}.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setConfirmarLote({ open: false, ids: [], nombres: [] })
              }
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={eliminarLote.isPending}
              onClick={async () => {
                if (confirmarLote.ids.length === 0) return
                try {
                  await eliminarLote.mutateAsync(confirmarLote.ids)
                  setSeleccionados(new Set())
                  setConfirmarLote({ open: false, ids: [], nombres: [] })
                  refetch()
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Error al eliminar las secciones",
                  )
                }
              }}
            >
              Eliminar seleccionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

