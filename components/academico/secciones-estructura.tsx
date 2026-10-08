"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GraduationCap,
  Plus,
  Trash2,
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
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { SeccionesPorNivel } from "@/components/academico/secciones-por-nivel"
import { NuevaSeccionDialog } from "@/components/academico/nueva-seccion-dialog"
import {
  useAniosEscolares,
  useCrearSeccion,
  useEliminarSeccion,
  useGrados,
  useNiveles,
  useSeccionesPorGrado,
  useTurnos,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import {
  ESTADO_ANIO,
  aniosHabilitados,
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

  const turnoActivo = turnos.find((t) => t.accesoId === 1) ?? null
  const habilitados = aniosHabilitados(anios)
  const faltaTurno = !turnoActivo
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
        <SeccionesPorNivel
          grados={data ?? []}
          niveles={niveles}
          turnos={turnos}
          isLoading={isLoading}
          isError={isError}
          puedeActualizar={puedeActualizar}
          onEditar={(grado, idTurno, idAnio) => setEditando({ grado, idTurno, idAnio })}
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
  const { data: secciones = [], isLoading, refetch } = useSeccionesPorGrado(grado.idGrado)
  const [agregar, setAgregar] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState("")
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
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Secciones de {grado.nombre}
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
                  return (
                    <li
                      key={s.idGradoSeccion}
                      className="flex items-center justify-between gap-3 rounded-md border p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{s.nombre}</p>

                        {bloqueada && (
                          <p className="text-xs text-muted-foreground">
                            {s.tieneMatriculas ? "con alumnos" : "con cursos"}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!puedeEliminar || bloqueada || eliminar.isPending}
                        onClick={() => borrar(s.idGradoSeccion, s.nombre)}
                        aria-label={`Eliminar sección ${s.nombre}`}
                        title={
                          bloqueada
                            ? "No se puede eliminar: tiene alumnos matriculados o cursos asignados"
                            : `Eliminar sección ${s.nombre}`
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

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

        <DialogFooter>
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
          <DialogTrigger render={<Button variant="outline" />}>Cerrar</DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
