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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import type { GradoResponse, TurnoResponse } from "@/lib/api/academico"

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
  const [editando, setEditando] = useState<{ grado: GradoResponse; idTurno: number } | null>(
    null,
  )

  const turnoActivo = turnos.find((t) => t.accesoId === 1) ?? null
  const anioVigente = anios.find((a) => a.estado === 1) ?? null
  const faltaTurno = !turnoActivo
  const faltaAnio = !anioVigente
  const bloqueado = (faltaTurno || faltaAnio) && !cargandoTurnos && !cargandoAnios

  if (bloqueado) {
    return (
      <RequisitosPendientes
        faltaTurno={faltaTurno}
        faltaAnio={faltaAnio}
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
          descripcion="Cada sección pertenece a un grado, un turno y el año vigente."
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
          onEditar={(grado, idTurno) => setEditando({ grado, idTurno })}
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
        {editando && (
          <EditarSeccionesDialog
            key={`${editando.grado.idGrado}-${editando.idTurno}`}
            grado={editando.grado}
            turnoInicial={editando.idTurno}
            onOpenChange={(abierto) => {
              if (!abierto) setEditando(null)
            }}
            turnos={turnos}
          />
        )}
      </CardContent>
    </Card>
  )
}
interface RequisitosPendientesProps {
  faltaTurno: boolean
  faltaAnio: boolean
  onIrATurnos?: () => void
  onIrAAnios?: () => void
}

function RequisitosPendientes({
  faltaTurno,
  faltaAnio,
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
      titulo: "No hay un año escolar vigente",
      descripcion: "Cada sección nueva se registra en el año vigente. Activa uno o crea el nuevo.",
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
          descripcion="Una sección necesita un turno y un año escolar vigente, así que ambos deben existir antes de registrarla."
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
  turnoInicial,
  onOpenChange,
  turnos,
}: {
  grado: GradoResponse
  turnoInicial?: number
  onOpenChange: (open: boolean) => void
  turnos: TurnoResponse[]
}) {
  const eliminar = useEliminarSeccion()
  const crear = useCrearSeccion()
  const { data: secciones = [], isLoading, refetch } = useSeccionesPorGrado(grado.idGrado)
  const [agregar, setAgregar] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState("")
  const [turnoNuevo, setTurnoNuevo] = useState<number | null>(turnoInicial ?? grado.idTurno ?? null)
  const puedeEliminar = usePuede("GRADOS", "ELIMINAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")

  const seccionesConLetra = secciones.filter((s) => s.nombre)

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
    if (!turnoNuevo || !nombreNuevo.trim()) return

    const nombre = nombreNuevo.trim().toUpperCase()

    if (nombre.length !== 1 || !/^[A-Z]$/.test(nombre)) {
      toast.error("La sección debe ser una sola letra (A-Z)")
      return
    }

    try {
      await crear.mutateAsync({
        idGrado: grado.idGrado,
        idTurno: turnoNuevo,
        nombre,
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
            Gestiona las secciones de {grado.nombre}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-[13px] text-muted-foreground">Cargando...</p>
            ) : seccionesConLetra.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Este grado todavía no tiene secciones. Agrega la primera.
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

                        <p className="text-xs text-muted-foreground">
                          {s.turno} · {s.anio}

                          {bloqueada && (
                            <>
                              {" · "}
                              {s.tieneMatriculas ? "con alumnos" : "con cursos"}
                            </>
                          )}
                        </p>
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
              <Field>
                <FieldLabel>Turno</FieldLabel>
                <FieldContent>
                  <Select
                    value={turnoNuevo ? String(turnoNuevo) : ""}
                    onValueChange={(v) => setTurnoNuevo(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {turnos.find((t) => t.idTurno === turnoNuevo)?.nombre ?? "Selecciona"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {turnos.map((t) => (
                          <SelectItem key={t.idTurno} value={String(t.idTurno)}>
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAgregar(false); setNombreNuevo("") }}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!nombreNuevo || !turnoNuevo || crear.isPending}
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
              disabled={!puedeActualizar}
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
