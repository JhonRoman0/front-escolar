"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, CircleHelp, Clock3, CloudSun, DoorOpen, GraduationCap, Loader2, Pencil, Sun, TriangleAlert, X, type LucideIcon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { useEliminarConToast } from "@/hooks/use-eliminar-toast"
import {
  AccionesFila,
  CampoAcceso,
  CargandoTarjetas,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useAulas,
  useCrudAniosEscolares,
  useCrudAulas,
  useCrudCursos,
  useCrudTurnos,
  useCursos,
  useTurnos,
} from "@/hooks/use-academico"
import type {
  AnioEscolarResponse,
  AulaResponse,
  CursoResponse,
  TurnoResponse,
} from "@/lib/api/academico"
import { horaCorta } from "@/lib/api/academico"
import { conflictosTurnos, type TurnoFranja } from "@/lib/turnos"
import {
  anioEscolarSchema,
  aulaSchema,
  crearTurnoSchema,
  cursoSchema,
  turnoSchema,
  type AnioEscolarValues,
  type AulaValues,
  type CursoValues,
  type TurnoValues,
} from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"
import { SeccionesEstructura } from "./secciones-estructura"

interface CatalogosTabProps {
  puedeTurnos: boolean
  puedeAnios: boolean
  puedeAulas: boolean
  puedeGrados: boolean
}

type EstructuraKey = "anios" | "grados" | "turnos" | "aulas"

export default function CatalogosTab({
  puedeTurnos,
  puedeAnios,
  puedeAulas,
  puedeGrados,
}: CatalogosTabProps) {
  // Orden de configuración: primero los catálogos libres (turnos, aulas), luego el
  // año escolar y al final grados, que es el único que depende de los anteriores.
  const opciones: { value: EstructuraKey; label: string; icon: React.ElementType; show: boolean }[] = useMemo(
    () => [
      { value: "turnos", label: "Turnos", icon: Clock3, show: puedeTurnos },
      { value: "aulas", label: "Aulas", icon: DoorOpen, show: puedeAulas },
      { value: "anios", label: "Año escolar", icon: CalendarDays, show: puedeAnios },
      { value: "grados", label: "Secciones", icon: GraduationCap, show: puedeGrados },
    ],
    [puedeAnios, puedeAulas, puedeGrados, puedeTurnos]
  )

  const visibles = opciones.filter((o) => o.show)
  const defaultValue = visibles[0]?.value ?? "turnos"
  // null = todavía en la primera pestaña visible; un valor = navigated a mano,
  // necesario para que el panel de requisitos de grados pueda llevar al usuario.
  const [activo, setActivo] = useState<EstructuraKey | null>(null)

  if (!visibles.length) return null

  return (
    <Tabs
      value={activo ?? defaultValue}
      onValueChange={(v) => setActivo(v as EstructuraKey)}
      className="flex flex-col gap-4"
    >
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-full justify-start gap-6 rounded-none bg-transparent p-0 sm:gap-8">
          {visibles.map((o) => {
            const Icon = o.icon
            return (
              <TabsTrigger key={o.value} value={o.value} className="flex-none gap-2 py-3">
                <Icon className="size-4" />
                {o.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {puedeTurnos && (
        <TabsContent value="turnos">
          <TurnosTab />
        </TabsContent>
      )}
      {puedeAulas && (
        <TabsContent value="aulas">
          <AulasTab />
        </TabsContent>
      )}
      {puedeAnios && (
        <TabsContent value="anios">
          <AniosTab />
        </TabsContent>
      )}
      {puedeGrados && (
        <TabsContent value="grados">
          <SeccionesEstructura
            onIrATurnos={puedeTurnos ? () => setActivo("turnos") : undefined}
            onIrAAnios={puedeAnios ? () => setActivo("anios") : undefined}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}

// ── Cursos (export para top-level) ──────────────────────────────────────

export function CursosTab() {
  const { data, isLoading, isError, refetch } = useCursos()
  const crud = useCrudCursos()
  const puedeCrear = usePuede("CURSOS", "CREAR")
  const puedeActualizar = usePuede("CURSOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("CURSOS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<CursoResponse | null>(null)

  async function handleEliminar(curso: CursoResponse) {
    try {
      await crud.eliminar.mutateAsync(curso.idCurso)
      toast.success(`Curso "${curso.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Cursos"
          descripcion="Las materias que se dictan (Matemática, Comunicación...)."
          acciones={
            <BotonNuevo
              texto="Nuevo curso"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={3} />
              ) : isError ? (
                <MensajeSinDatos columnas={3} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={3} mensaje="Aún no hay cursos." />
              ) : (
                data.map((curso) => (
                  <TableRow key={curso.idCurso}>
                    <TableCell className="font-medium">{curso.nombre}</TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={curso.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AccionesFila
                        puedeActualizar={puedeActualizar}
                        puedeEliminar={puedeEliminar}
                        onEditar={() => {
                          setEditando(curso)
                          setDialogOpen(true)
                        }}
                        onEliminar={() => handleEliminar(curso)}
                        tituloEliminar="Eliminar curso"
                        descripcionEliminar={`Se marcará "${curso.nombre}" como eliminado.`}
                        ariaEditar={`Editar ${curso.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <CursoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          curso={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

function CursoDialog({
  open,
  onOpenChange,
  curso,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curso?: CursoResponse | null
  crear: ReturnType<typeof useCrudCursos>["crear"]
  actualizar: ReturnType<typeof useCrudCursos>["actualizar"]
}) {
  const esEdicion = !!curso
  // Primitivos y no el objeto: un refetch de React Query devuelve una referencia
  // nueva y con el objeto en las deps el reset se dispararía mientras se escribe.
  const nombre = curso?.nombre ?? ""
  const accesoId = curso?.accesoId ?? 1
  const form = useForm<CursoValues>({
    resolver: zodResolver(cursoSchema),
    defaultValues: { nombre, accesoId },
  })

  // El diálogo se renderiza siempre y solo cambia `open`, así que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el form limpio
  // sin depender de una key que solo remonta cuando cambia el registro.
  useEffect(() => {
    if (!open) return
    form.reset({ nombre, accesoId })
  }, [open, nombre, accesoId, form])

  async function onSubmit(values: CursoValues) {
    try {
      if (esEdicion && curso) {
        await actualizar.mutateAsync({ id: curso.idCurso, data: { nombre: values.nombre, accesoId: values.accesoId } })
        toast.success("Curso actualizado")
      } else {
        await crear.mutateAsync({ nombre: values.nombre })
        toast.success("Curso creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar curso" : "Nuevo curso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre del curso</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Matemática" autoFocus {...field} />
                    <FieldDescription className="text-xs">Máx. 50 caracteres. Ej: Comunicación, Ciencia.</FieldDescription>
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            {esEdicion && (
              <Controller
                control={form.control}
                name="accesoId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Estado</FieldLabel>
                    <FieldContent>
                      <CampoAcceso value={field.value} onChange={field.onChange} />
                    </FieldContent>
                  </Field>
                )}
              />
            )}
          </FieldGroup>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
              {(crear.isPending || actualizar.isPending) && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {esEdicion ? "Guardar cambios" : "Crear curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Aulas ────────────────────────────────────────────────────────────────

function AulasTab() {
  const { data, isLoading, isError, refetch } = useAulas()
  const crud = useCrudAulas()
  const puedeCrear = usePuede("AULAS", "CREAR")
  const puedeActualizar = usePuede("AULAS", "ACTUALIZAR")
  const puedeEliminar = usePuede("AULAS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AulaResponse | null>(null)

  const eliminarConToast = useEliminarConToast()

  function handleEliminar(aula: AulaResponse) {
    return eliminarConToast(crud.eliminar.mutateAsync, {
      id: aula.idAula,
      mensaje: `Aula "${aula.nombre}" eliminada`,
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Aulas"
          descripcion="Los salones o ambientes disponibles para las clases."
          acciones={
            <BotonNuevo
              texto="Nueva aula"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aula</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={4} />
              ) : isError ? (
                <MensajeSinDatos columnas={4} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={4} mensaje="Aún no hay aulas." />
              ) : (
                data.map((aula) => (
                  <TableRow key={aula.idAula}>
                    <TableCell className="font-medium">{aula.nombre}</TableCell>
                    <TableCell>{aula.capacidad ?? "—"}</TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={aula.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AccionesFila
                        puedeActualizar={puedeActualizar}
                        puedeEliminar={puedeEliminar}
                        onEditar={() => {
                          setEditando(aula)
                          setDialogOpen(true)
                        }}
                        onEliminar={() => handleEliminar(aula)}
                        tituloEliminar="Eliminar aula"
                        descripcionEliminar={`Se marcará "${aula.nombre}" como eliminada.`}
                        ariaEditar={`Editar ${aula.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <AulaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          aula={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

// ── Turnos ───────────────────────────────────────────────────────────────

const CAMPOS_TURNO: {
  name: "horaEntrada" | "horaEntradaLimite" | "horaFaltaLimite" | "horaSalida"
  label: string
  descripcion: string
}[] = [
  { name: "horaEntrada", label: "Hora de entrada", descripcion: "La hora en que los estudiantes llegan al colegio." },
  { name: "horaEntradaLimite", label: "Límite de puntualidad", descripcion: "Hasta esta hora la asistencia se marca como puntual." },
  { name: "horaFaltaLimite", label: "Tardanza hasta", descripcion: "Desde el límite de puntualidad hasta esta hora se marca como tardanza." },
  { name: "horaSalida", label: "Hora de salida", descripcion: "Desde el límite de tardanza hasta esta hora se puede marcar como justificada, si el alumno justifica a tiempo." },
]

function TurnosTab() {
  const { data, isLoading, isError, refetch } = useTurnos()
  const crud = useCrudTurnos()
  const puedeCrear = usePuede("TURNOS", "CREAR")
  const puedeActualizar = usePuede("TURNOS", "ACTUALIZAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  // El solapamiento se calcula sobre lo guardado, así que la franja aparece
  // después de guardar el turno que lo provoca, no mientras se tipea.
  const franjas = useMemo<TurnoFranja[]>(
    () =>
      (data ?? [])
        .filter((t) => (t.accesoId ?? 1) === 1)
        .map((t) => ({
          id: t.idTurno,
          nombre: t.nombre,
          horaEntrada: horaCorta(t.horaEntrada),
          horaSalida: horaCorta(t.horaSalida),
        })),
    [data],
  )
  const conflictos = useMemo(() => conflictosTurnos(franjas), [franjas])

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Turnos"
          descripcion="Horarios de entrada y tardanza por turno"
          acciones={
            <BotonNuevo
              texto="Nuevo turno"
              puedeCrear={puedeCrear}
              onClick={() => setDialogOpen(true)}
            />
          }
        />
        {conflictos.length > 0 && (
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Hay turnos que se pisan</p>
              {conflictos.map(({ anterior, siguiente }) => (
                <p key={`${anterior.id}-${siguiente.id}`}>
                  {anterior.nombre} termina a las {anterior.horaSalida} y {siguiente.nombre} empieza a las{" "}
                  {siguiente.horaEntrada}. Corrige la hora de entrada de {siguiente.nombre}.
                </p>
              ))}
            </div>
          </div>
        )}
        {isLoading ? (
          <CargandoTarjetas filas={2} />
        ) : isError ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No se pudieron cargar los turnos. Recarga la pantalla.</div>
        ) : !data?.length ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Aún no hay turnos configurados.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((turno) => (
              <TurnoCard
                key={turno.idTurno}
                turno={turno}
                franjas={franjas}
                puedeEditar={puedeActualizar}
                editando={editandoId === turno.idTurno}
                onEditar={() => setEditandoId(turno.idTurno)}
                onCancelar={() => setEditandoId(null)}
                actualizar={crud.actualizar}
              />
            ))}
          </div>
        )}
        {isError && (
          <div><Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button></div>
        )}
        <TurnoDialog open={dialogOpen} onOpenChange={setDialogOpen} crear={crud.crear} />
      </CardContent>
    </Card>
  )
}

function claveIconoTurno(nombre: string) {
  const n = nombre.toLowerCase()
  if (n.includes("mañana") || n.includes("manana") || n.includes("am")) return "manana"
  if (n.includes("tarde") || n.includes("noche") || n.includes("pm")) return "tarde"
  return "otro"
}

const ICONOS_TURNO: Record<string, LucideIcon> = { manana: Sun, tarde: CloudSun, otro: Clock3 }

function TurnoCard({
  turno,
  franjas,
  puedeEditar,
  editando,
  onEditar,
  onCancelar,
  actualizar,
}: {
  turno: TurnoResponse
  franjas: TurnoFranja[]
  puedeEditar: boolean
  editando: boolean
  onEditar: () => void
  onCancelar: () => void
  actualizar: ReturnType<typeof useCrudTurnos>["actualizar"]
}) {
  // El turno se valida contra el que lo precede en la jornada. Editar el
  // primero de la cadena nunca falla por los que vienen después.
  const schema = useMemo(
    () => crearTurnoSchema(franjas, turno.idTurno),
    [franjas, turno.idTurno],
  )
  const valores = {
    nombre: turno.nombre,
    horaEntrada: horaCorta(turno.horaEntrada),
    horaEntradaLimite: horaCorta(turno.horaEntradaLimite),
    horaFaltaLimite: horaCorta(turno.horaFaltaLimite),
    horaSalida: horaCorta(turno.horaSalida),
    accesoId: turno.accesoId ?? 1,
  }
  const form = useForm<TurnoValues>({
    resolver: zodResolver(schema),
    // Con onChange el aviso aparece apenas el horario queda inválido, sin
    // esperar a pulsar Guardar. Las horas vienen de la base, así que no hay
    // campos vacíos que generen ruido.
    mode: "onChange",
    defaultValues: valores,
  })
  const enviando = actualizar.isPending
  const Icono = ICONOS_TURNO[claveIconoTurno(turno.nombre)]

  function editar() {
    form.reset(valores)
    // Las cuatro horas vienen de la base y son obligatorias, así que validar
    // acá no inventa errores de formato: solo saca a la luz un conflicto que
    // ya estaba guardado.
    void form.trigger()
    onEditar()
  }

  function cancelar() {
    form.reset(valores)
    onCancelar()
  }

  async function guardar(values: TurnoValues) {
    try {
      await actualizar.mutateAsync({ id: turno.idTurno, data: values })
      toast.success(`Turno "${turno.nombre}" actualizado`)
      onCancelar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icono className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{turno.nombre}</span>
        </div>
        {puedeEditar && !editando && (
          <Button variant="outline" size="sm" onClick={editar}>
            <Pencil /> Editar
          </Button>
        )}
      </div>
      {editando ? (
        <form onSubmit={form.handleSubmit(guardar)} className="flex flex-col gap-4 p-4" noValidate>
          <TooltipProvider delay={0}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CAMPOS_TURNO.map((campo) => (
                <Controller
                  key={campo.name}
                  control={form.control}
                  name={campo.name}
                  render={({ field }) => (
                    <Field>
                      <div className="flex items-center gap-1.5">
                        <FieldLabel>{campo.label}</FieldLabel>
                        <Tooltip>
                          <TooltipTrigger aria-label={`Info ${campo.label}`} className="inline-flex size-5 items-center justify-center rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                            <CircleHelp className="size-3 text-brand" />
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="max-w-[220px] text-xs leading-snug">
                            <p>{campo.descripcion}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FieldContent>
                        <Input type="time" {...field} />
                        <FieldError errors={[form.formState.errors[campo.name]]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              ))}
            </div>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelar}>
              <X /> Cancelar
            </Button>
            <BotonGuardar etiqueta="Guardar" enviando={enviando} size="sm" />
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS_TURNO.map((campo) => (
            <div key={campo.name} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{campo.label}</p>
              <p className="font-mono text-sm">{horaCorta(turno[campo.name])}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TurnoDialog({
  open,
  onOpenChange,
  crear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  crear: ReturnType<typeof useCrudTurnos>["crear"]
}) {
  const form = useForm<TurnoValues>({
    resolver: zodResolver(turnoSchema),
    defaultValues: {
      nombre: "",
      horaEntrada: "",
      horaEntradaLimite: "",
      horaFaltaLimite: "",
      horaSalida: "",
      accesoId: 1,
    },
  })

  // El diálogo se renderiza siempre y solo cambia `open`, así que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el form limpio
  // sin depender de una key que solo remonta cuando cambia el registro.
  useEffect(() => {
    if (!open) return
    form.reset({
      nombre: "",
      horaEntrada: "",
      horaEntradaLimite: "",
      horaFaltaLimite: "",
      horaSalida: "",
      accesoId: 1,
    })
  }, [open, form])

  async function onSubmit(values: TurnoValues) {
    try {
      await crear.mutateAsync(values)
      toast.success("Turno creado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">Nuevo turno</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller control={form.control} name="nombre" render={({ field }) => (<Field><FieldLabel>Nombre del turno</FieldLabel><FieldContent><Input placeholder="Mañana" autoFocus {...field} /><FieldError errors={[form.formState.errors.nombre]} /></FieldContent></Field>)} />
            <TooltipProvider delay={0}>
              <FieldSet><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{CAMPOS_TURNO.map((campo) => (<Controller key={campo.name} control={form.control} name={campo.name} render={({ field }) => (<Field><div className="flex items-center gap-1.5"><FieldLabel>{campo.label}</FieldLabel><Tooltip><TooltipTrigger aria-label={`Info ${campo.label}`} className="inline-flex size-5 items-center justify-center rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="size-3 text-brand" /></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-[220px] text-xs leading-snug"><p>{campo.descripcion}</p></TooltipContent></Tooltip></div><FieldContent><Input type="time" {...field} /><FieldError errors={[form.formState.errors[campo.name]]} /></FieldContent></Field>)} />))}</div></FieldSet>
            </TooltipProvider>
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><BotonGuardar etiqueta="Crear turno" enviando={crear.isPending} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Años escolares ───────────────────────────────────────────────────────

function AniosTab() {
  const { data, isLoading, isError, refetch } = useAniosEscolares()
  const crud = useCrudAniosEscolares()
  const puedeCrear = usePuede("ANIOS_ESCOLARES", "CREAR")
  const puedeActualizar = usePuede("ANIOS_ESCOLARES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ANIOS_ESCOLARES", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AnioEscolarResponse | null>(null)

  const eliminarConToast = useEliminarConToast()

  function handleEliminar(anio: AnioEscolarResponse) {
    return eliminarConToast(crud.eliminar.mutateAsync, {
      id: anio.idAnio,
      mensaje: `Año escolar ${anio.anio} eliminado`,
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Años escolares"
          descripcion="Al crear un año nuevo queda vigente y el anterior se cierra automáticamente."
          acciones={
            <BotonNuevo
              texto="Nuevo año escolar"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <FilasCargando columnas={5} /> : isError ? <MensajeSinDatos columnas={5} mensaje="No se pudo cargar. Recarga la pantalla." /> : !data?.length ? <MensajeSinDatos columnas={5} mensaje="Aún no hay años escolares." /> : data.map((anio) => (
                <TableRow key={anio.idAnio}>
                  <TableCell className="font-medium">{anio.anio}</TableCell>
                  <TableCell className="text-xs">{anio.fechaInicio || "—"}</TableCell>
                  <TableCell className="text-xs">{anio.fechaFin || "—"}</TableCell>
                  <TableCell><AnioBadge estado={anio.estado} /></TableCell>
                  <TableCell className="text-right"><AccionesFila puedeActualizar={puedeActualizar} puedeEliminar={puedeEliminar} onEditar={() => { setEditando(anio); setDialogOpen(true) }} onEliminar={() => handleEliminar(anio)} tituloEliminar="Eliminar año escolar" descripcionEliminar={`Se marcará el año ${anio.anio} como eliminado.`} ariaEditar={`Editar año ${anio.anio}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {isError && <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>}
        <AnioDialog open={dialogOpen} onOpenChange={setDialogOpen} anio={editando} crear={crud.crear} actualizar={crud.actualizar} />
      </CardContent>
    </Card>
  )
}

export function AnioBadge({ estado }: { estado: number }) {
  if (estado === 1) return <Badge variant="success">Vigente</Badge>
  return <Badge variant="outline">Cerrado</Badge>
}

// La fecha de fin debe ser estrictamente posterior a la de inicio (misma regla
// que validarFechas en AnioEscolarService). Se resuelve en UTC para que un
// desfase de zona horaria no reste un día.
function diaSiguiente(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return undefined
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function AnioDialog({
  open,
  onOpenChange,
  anio,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  anio?: AnioEscolarResponse | null
  crear: ReturnType<typeof useCrudAniosEscolares>["crear"]
  actualizar: ReturnType<typeof useCrudAniosEscolares>["actualizar"]
}) {
  const esEdicion = !!anio
  // Por si la base tiene un año con caracteres raros, se muestra ya limpio
  // en vez de obligar a corregirlo a mano.
  // Primitivos y no el objeto: un refetch de React Query devuelve una referencia
  // nueva y con el objeto en las deps el reset se dispararía mientras se escribe.
  const anioTexto = (anio?.anio ?? "").replace(/\D/g, "").slice(0, 4)
  const fechaInicioInicial = anio?.fechaInicio ?? ""
  const fechaFinInicial = anio?.fechaFin ?? ""
  const form = useForm<AnioEscolarValues>({
    resolver: zodResolver(anioEscolarSchema),
    defaultValues: { anio: anioTexto, fechaInicio: fechaInicioInicial, fechaFin: fechaFinInicial },
  })

  // El selector de fin no puede ofrecer fechas anteriores al día siguiente
  // del inicio. Sin fecha de inicio no hay mínimo y se puede elegir cualquiera.
  // useWatch en vez de form.watch: watch() no se puede memoizar y hace que React
  // Compiler se salte el componente entero.
  const fechaInicio = useWatch({ control: form.control, name: "fechaInicio" })
  const minFechaFin = diaSiguiente(fechaInicio)

  // El diálogo se renderiza siempre y solo cambia `open`, así que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el form limpio
  // sin depender de una key que solo remonta cuando cambia el registro.
  useEffect(() => {
    if (!open) return
    form.reset({ anio: anioTexto, fechaInicio: fechaInicioInicial, fechaFin: fechaFinInicial })
  }, [open, anioTexto, fechaInicioInicial, fechaFinInicial, form])

  async function onSubmit(values: AnioEscolarValues) {
    try {
      if (esEdicion && anio) await actualizar.mutateAsync({ id: anio.idAnio, data: values })
      else await crear.mutateAsync(values)
      toast.success(esEdicion ? "Año escolar actualizado" : "Año creado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar año escolar" : "Nuevo año escolar"}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="anio"
              render={({ field }) => {
                // El error y la descripción dicen lo mismo, así que cuando hay
                // error la descripción se oculta: el bloque de abajo no crece y
                // el motivo queda como único texto a leer.
                const error = form.formState.errors.anio
                return (
                  <Field>
                    <FieldLabel>Año</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="2026"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        {...field}
                        // Silencioso a propósito: una tecla que no es dígito
                        // simplemente no entra. El filtro vive aquí y no en
                        // onKeyDown para que también tape el pegado y el arrastre
                        // de texto. El slice deja el tope de 4 en el código y no
                        // apoyado en que el navegador respete maxLength.
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                      {!error && (
                        <FieldDescription className="text-xs">Solo números, 4 dígitos. Ej: 2026.</FieldDescription>
                      )}
                      <FieldError errors={[error]} />
                    </FieldContent>
                  </Field>
                )
              }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Fecha de inicio</FieldLabel>
                    <FieldContent>
                      <Input
                        type="date"
                        {...field}
                        onChange={(e) => {
                          const valor = e.target.value
                          field.onChange(valor)
                          // Si el inicio se mueve más allá del fin ya elegido,
                          // ese fin queda obsoleto: se limpia para no dejarlo inválido.
                          const min = diaSiguiente(valor)
                          const finActual = form.getValues("fechaFin")
                          if (valor && min && finActual && finActual < min) {
                            form.setValue("fechaFin", "")
                          }
                        }}
                      />
                      <FieldError errors={[form.formState.errors.fechaInicio]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Fecha de fin</FieldLabel>
                    <FieldContent>
                      <Input type="date" min={minFechaFin} {...field} />
                      <FieldError errors={[form.formState.errors.fechaFin]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><BotonGuardar etiqueta={esEdicion ? "Guardar cambios" : "Crear año"} enviando={crear.isPending || actualizar.isPending} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Aula dialog ──────────────────────────────────────────────────────────

function AulaDialog({
  open,
  onOpenChange,
  aula,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  aula?: AulaResponse | null
  crear: ReturnType<typeof useCrudAulas>["crear"]
  actualizar: ReturnType<typeof useCrudAulas>["actualizar"]
}) {
  const esEdicion = !!aula
  // Primitivos y no el objeto: un refetch de React Query devuelve una referencia
  // nueva y con el objeto en las deps el reset se dispararía mientras se escribe.
  const nombre = aula?.nombre ?? ""
  const capacidad = aula?.capacidad ?? undefined
  const accesoId = aula?.accesoId ?? 1
  const form = useForm<AulaValues>({
    resolver: zodResolver(aulaSchema),
    defaultValues: { nombre, capacidad, accesoId },
  })

  // El diálogo se renderiza siempre y solo cambia `open`, así que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el form limpio
  // sin depender de una key que solo remonta cuando cambia el registro.
  useEffect(() => {
    if (!open) return
    form.reset({ nombre, capacidad, accesoId })
  }, [open, nombre, capacidad, accesoId, form])

  async function onSubmit(values: AulaValues) {
    try {
      if (esEdicion && aula) await actualizar.mutateAsync({ id: aula.idAula, data: values })
      else await crear.mutateAsync(values)
      toast.success(esEdicion ? "Aula actualizada" : "Aula creada")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar aula" : "Nueva aula"}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller control={form.control} name="nombre" render={({ field }) => (<Field><FieldLabel>Nombre del aula</FieldLabel><FieldContent><Input placeholder="Aula 101" autoFocus {...field} /><FieldError errors={[form.formState.errors.nombre]} /></FieldContent></Field>)} />
            <Controller control={form.control} name="capacidad" render={({ field }) => (<Field><FieldLabel>Capacidad</FieldLabel><FieldContent><Input type="number" min="1" placeholder="30" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /><FieldDescription className="text-xs">Opcional. Número de asientos.</FieldDescription><FieldError errors={[form.formState.errors.capacidad]} /></FieldContent></Field>)} />
            {esEdicion && <Controller control={form.control} name="accesoId" render={({ field }) => (<Field><FieldLabel>Estado</FieldLabel><FieldContent><CampoAcceso value={field.value} onChange={field.onChange} /></FieldContent></Field>)} />}
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><BotonGuardar etiqueta={esEdicion ? "Guardar cambios" : "Crear aula"} enviando={crear.isPending || actualizar.isPending} /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
