"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import { CalendarDays, CircleHelp, Clock3, DoorOpen, GraduationCap, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useState } from "react"

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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  AccionesFila,
  CampoAcceso,
  FilasCargando,
  HeaderTabla,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useAulas,
  useCrudAniosEscolares,
  useCrudAulas,
  useCrudCursos,
  useCrudGrados,
  useCrudTurnos,
  useCursos,
  useGrados,
  useTurnos,
} from "@/hooks/use-academico"
import type {
  AnioEscolarResponse,
  AulaResponse,
  CursoResponse,
  GradoResponse,
  GradoRequest,
  TurnoResponse,
} from "@/lib/api/academico"
import { horaCorta } from "@/lib/api/academico"
import {
  anioEscolarSchema,
  aulaSchema,
  cursoSchema,
  gradoSchema,
  turnoSchema,
  type AnioEscolarValues,
  type AulaValues,
  type CursoValues,
  type GradoValues,
  type TurnoValues,
} from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"
import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"

interface CatalogosTabProps {
  puedeCursos: boolean
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
  const opciones: { value: EstructuraKey; label: string; icon: React.ElementType; show: boolean }[] = useMemo(
    () => [
      { value: "anios", label: "Año escolar", icon: CalendarDays, show: puedeAnios },
      { value: "grados", label: "Grados y secciones", icon: GraduationCap, show: puedeGrados },
      { value: "turnos", label: "Turnos", icon: Clock3, show: puedeTurnos },
      { value: "aulas", label: "Aulas", icon: DoorOpen, show: puedeAulas },
    ],
    [puedeAnios, puedeAulas, puedeGrados, puedeTurnos]
  )

  const visibles = opciones.filter((o) => o.show)
  const defaultValue = visibles[0]?.value ?? "anios"

  if (!visibles.length) return null

  return (
    <Tabs defaultValue={defaultValue} className="flex flex-col gap-4">
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

      {puedeAnios && (
        <TabsContent value="anios">
          <AniosTab />
        </TabsContent>
      )}
      {puedeGrados && (
        <TabsContent value="grados">
          <GradosInner />
        </TabsContent>
      )}
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
        <HeaderTabla
          titulo="Cursos"
          descripcion="Las materias que se dictan (Matemática, Comunicación...)."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
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
          key={editando?.idCurso ?? "nuevo"}
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
  const form = useForm<CursoValues>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nombre: curso?.nombre ?? "",
      accesoId: curso?.accesoId ?? 1,
    },
  })

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

  async function handleEliminar(aula: AulaResponse) {
    try {
      await crud.eliminar.mutateAsync(aula.idAula)
      toast.success(`Aula "${aula.nombre}" eliminada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderTabla
          titulo="Aulas"
          descripcion="Los salones o ambientes disponibles para las clases."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
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
          key={editando?.idAula ?? "nuevo"}
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

// ── Grados dentro de Estructura ────────────────────────────────────────

const NIVELES = [
  { idNivel: 1, nombre: "Inicial" },
  { idNivel: 2, nombre: "Primaria" },
  { idNivel: 3, nombre: "Secundaria" },
] as const

function GradosInner() {
  const { data, isLoading, isError, refetch } = useGrados()
  const crud = useCrudGrados()
  const puedeCrear = usePuede("GRADOS", "CREAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("GRADOS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<GradoResponse | null>(null)

  async function handleEliminar(grado: GradoResponse) {
    try {
      await crud.eliminar.mutateAsync(grado.idGrado)
      toast.success(`Grado "${grado.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-[20px] font-semibold tracking-tight">Grados y secciones</h2>
            <p className="text-[14px] leading-5 text-muted-foreground">Un grado agrupa secciones dentro de un turno y año escolar.</p>
          </div>
          {puedeCrear && (
            <Button className="bg-[#274CB4] text-white hover:bg-[#274CB4]/85" onClick={() => { setEditando(null); setDialogOpen(true) }}>
              Nuevo grado
            </Button>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grado</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Secciones</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={7} />
              ) : isError ? (
                <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={7} mensaje="Aún no hay grados." />
              ) : (
                data.map((grado) => (
                  <TableRow key={grado.idGrado}>
                    <TableCell className="font-medium">{grado.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{grado.nivel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {grado.secciones.map((s) => (
                          <Badge key={s.idSeccion} variant="secondary">
                            {s.nombre}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{grado.turno}</TableCell>
                    <TableCell>{grado.anio}</TableCell>
                    <TableCell>
                      <EstadoBadge accesoId={grado.accesoId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {puedeActualizar && (
                          <Button variant="outline" size="icon-sm" aria-label={`Editar ${grado.nombre}`} onClick={() => { setEditando(grado); setDialogOpen(true) }}>
                            Editar
                          </Button>
                        )}
                        {puedeEliminar && <ConfirmarEliminar titulo="Eliminar grado" descripcion={`Se marcará "${grado.nombre}" y sus secciones como eliminado.`} onConfirm={() => handleEliminar(grado)} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isError && <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>}
        <GradoDialog key={editando?.idGrado ?? "nuevo"} open={dialogOpen} onOpenChange={setDialogOpen} grado={editando} />
      </CardContent>
    </Card>
  )
}

function GradoDialog({
  open,
  onOpenChange,
  grado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grado?: GradoResponse | null
}) {
  const crud = useCrudGrados()
  const { data: anios = [] } = useAniosEscolares()
  const { data: turnos = [] } = useTurnos()
  const esEdicion = !!grado
  const form = useForm<GradoValues>({
    resolver: zodResolver(gradoSchema),
    defaultValues: {
      nombre: grado?.nombre ?? "",
      idNivel: grado?.idNivel ?? 0,
      idAnio: grado?.idAnio ?? 0,
      idTurno: grado?.idTurno ?? 0,
      secciones: grado?.secciones.map((s) => s.nombre) ?? [],
      accesoId: grado?.accesoId ?? 1,
    },
  })
  const idNivelSeleccionado = form.watch("idNivel")
  const enviando = crud.crear.isPending || crud.actualizar.isPending
  const idNivelVal = form.watch("idNivel")
  const idAnioVal = form.watch("idAnio")
  const idTurnoVal = form.watch("idTurno")
  const submitDisabled = enviando || !idNivelVal || !idAnioVal || !idTurnoVal

  function buildRequest(values: GradoValues): GradoRequest {
    return {
      nombre: values.nombre,
      idNivel: values.idNivel,
      idAnio: values.idAnio,
      idTurno: values.idTurno,
      secciones: values.idNivel === 1 ? [] : values.secciones.map((s) => s.trim()).filter(Boolean),
      ...(esEdicion ? { accesoId: values.accesoId } : {}),
    }
  }

  async function onSubmit(values: GradoValues) {
    try {
      if (esEdicion && grado) await crud.actualizar.mutateAsync({ id: grado.idGrado, data: buildRequest(values) })
      else await crud.crear.mutateAsync(buildRequest(values))
      toast.success(esEdicion ? "Grado actualizado" : "Grado creado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar grado" : "Nuevo grado"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller control={form.control} name="nombre" render={({ field }) => (<Field><FieldLabel>Nombre del grado</FieldLabel><FieldContent><Input placeholder="Primero de Secundaria" autoFocus {...field} /><FieldError errors={[form.formState.errors.nombre]} /></FieldContent></Field>)} />
            <Controller control={form.control} name="idNivel" render={({ field }) => (<Field><FieldLabel>Nivel</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => { const val = Number(v); field.onChange(val); if (val === 1) form.setValue("secciones", []) }}><SelectTrigger className="w-full"><SelectValue>{NIVELES.find((n) => n.idNivel === field.value)?.nombre ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{NIVELES.map((n) => (<SelectItem key={n.idNivel} value={String(n.idNivel)}>{n.nombre}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldDescription className="text-xs">Inicial no lleva secciones.</FieldDescription><FieldError errors={[form.formState.errors.idNivel]} /></FieldContent></Field>)} />
            <FieldSet><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Controller control={form.control} name="idAnio" render={({ field }) => (<Field><FieldLabel>Año escolar</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}><SelectTrigger className="w-full"><SelectValue>{anios.find((a) => a.idAnio === field.value)?.anio ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{anios.map((a) => (<SelectItem key={a.idAnio} value={String(a.idAnio)}>{a.anio}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldError errors={[form.formState.errors.idAnio]} /></FieldContent></Field>)} /><Controller control={form.control} name="idTurno" render={({ field }) => (<Field><FieldLabel>Turno</FieldLabel><FieldContent><Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}><SelectTrigger className="w-full"><SelectValue>{turnos.find((t) => t.idTurno === field.value)?.nombre ?? "Selecciona"}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{turnos.map((t) => (<SelectItem key={t.idTurno} value={String(t.idTurno)}>{t.nombre}</SelectItem>))}</SelectGroup></SelectContent></Select><FieldError errors={[form.formState.errors.idTurno]} /></FieldContent></Field>)} /></div></FieldSet>
            {idNivelSeleccionado !== 1 && (<Field><FieldLabel>Secciones</FieldLabel><FieldContent><Controller control={form.control} name="secciones" render={({ field }) => (<div className="flex flex-col gap-2">{field.value.map((seccion, index) => (<div key={index} className="flex gap-2"><Input className="flex-1" placeholder="A" value={seccion} onChange={(e) => { const next = [...field.value]; next[index] = e.target.value; field.onChange(next) }} /><Button type="button" variant="outline" size="icon" disabled={field.value.length <= 1} onClick={() => field.onChange(field.value.filter((_, i) => i !== index))} aria-label={`Quitar sección ${index + 1}`}>X</Button></div>))}<Button type="button" variant="outline" size="sm" onClick={() => field.onChange([...field.value, ""])}>Agregar sección</Button></div>)} /><FieldError errors={[form.formState.errors.secciones]} /></FieldContent></Field>)}
            {esEdicion && (<Controller control={form.control} name="accesoId" render={({ field }) => (<Field><FieldLabel>Estado</FieldLabel><FieldContent><CampoAcceso value={field.value} onChange={field.onChange} /></FieldContent></Field>)} />)}
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><Button type="submit" disabled={submitDisabled}>{enviando && <Loader2 className="animate-spin" data-icon="inline-start" />}{esEdicion ? "Guardar cambios" : "Crear grado"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Turnos ───────────────────────────────────────────────────────────────

const CAMPOS_TURNO: {
  name: keyof TurnoValues
  label: string
  placeholder?: string
  descripcion?: string
}[] = [
  { name: "horaEntrada", label: "Hora de entrada", placeholder: "07:45", descripcion: "Desde esta hora se puede marcar asistencia." },
  { name: "horaEntradaLimite", label: "Límite de entrada", placeholder: "08:00", descripcion: "Hasta aquí es Puntual; luego, Tardanza." },
  { name: "horaFaltaLimite", label: "Límite de falta", placeholder: "08:30", descripcion: "Hasta aquí es Tardanza; luego requiere justificación." },
  { name: "horaSalida", label: "Hora de salida", placeholder: "13:00", descripcion: "Hasta aquí se acepta justificación; luego, Inasistencia." },
]

function TurnosTab() {
  const { data, isLoading, isError, refetch } = useTurnos()
  const crud = useCrudTurnos()
  const puedeCrear = usePuede("TURNOS", "CREAR")
  const puedeActualizar = usePuede("TURNOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("TURNOS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<TurnoResponse | null>(null)

  async function handleEliminar(turno: TurnoResponse) {
    try {
      await crud.eliminar.mutateAsync(turno.idTurno)
      toast.success(`Turno "${turno.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderTabla titulo="Turnos" descripcion="Definen los horarios de entrada/salida para asistencia." puedeCrear={puedeCrear} onNuevo={() => { setEditando(null); setDialogOpen(true) }} />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turno</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Límite entrada</TableHead>
                <TableHead>Límite falta</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <FilasCargando columnas={7} /> : isError ? <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." /> : !data?.length ? <MensajeSinDatos columnas={7} mensaje="Aún no hay turnos." /> : data.map((turno) => (
                <TableRow key={turno.idTurno}>
                  <TableCell className="font-medium">{turno.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{horaCorta(turno.horaEntrada)}</TableCell>
                  <TableCell className="font-mono text-xs">{horaCorta(turno.horaEntradaLimite)}</TableCell>
                  <TableCell className="font-mono text-xs">{horaCorta(turno.horaFaltaLimite)}</TableCell>
                  <TableCell className="font-mono text-xs">{horaCorta(turno.horaSalida)}</TableCell>
                  <TableCell><EstadoBadge accesoId={turno.accesoId} /></TableCell>
                  <TableCell className="text-right"><AccionesFila puedeActualizar={puedeActualizar} puedeEliminar={puedeEliminar} onEditar={() => { setEditando(turno); setDialogOpen(true) }} onEliminar={() => handleEliminar(turno)} tituloEliminar="Eliminar turno" descripcionEliminar={`Se marcará "${turno.nombre}" como eliminado.`} ariaEditar={`Editar ${turno.nombre}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {isError && <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>}
        <TurnoDialog key={editando?.idTurno ?? "nuevo"} open={dialogOpen} onOpenChange={setDialogOpen} turno={editando} crear={crud.crear} actualizar={crud.actualizar} />
      </CardContent>
    </Card>
  )
}

function TurnoDialog({
  open,
  onOpenChange,
  turno,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  turno?: TurnoResponse | null
  crear: ReturnType<typeof useCrudTurnos>["crear"]
  actualizar: ReturnType<typeof useCrudTurnos>["actualizar"]
}) {
  const esEdicion = !!turno
  const form = useForm<TurnoValues>({
    resolver: zodResolver(turnoSchema),
    defaultValues: {
      nombre: turno?.nombre ?? "",
      horaEntrada: horaCorta(turno?.horaEntrada),
      horaEntradaLimite: horaCorta(turno?.horaEntradaLimite),
      horaFaltaLimite: horaCorta(turno?.horaFaltaLimite),
      horaSalida: horaCorta(turno?.horaSalida),
      accesoId: turno?.accesoId ?? 1,
    },
  })

  async function onSubmit(values: TurnoValues) {
    try {
      if (esEdicion && turno) await actualizar.mutateAsync({ id: turno.idTurno, data: values })
      else await crear.mutateAsync(values)
      toast.success(esEdicion ? "Turno actualizado" : "Turno creado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{esEdicion ? "Editar turno" : "Nuevo turno"}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller control={form.control} name="nombre" render={({ field }) => (<Field><FieldLabel>Nombre del turno</FieldLabel><FieldContent><Input placeholder="Mañana" autoFocus {...field} /><FieldError errors={[form.formState.errors.nombre]} /></FieldContent></Field>)} />
            <TooltipProvider delay={0}>
              <FieldSet><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{CAMPOS_TURNO.map((campo) => (<Controller key={campo.name} control={form.control} name={campo.name} render={({ field }) => (<Field><div className="flex items-center gap-1.5"><FieldLabel>{campo.label}</FieldLabel>{campo.descripcion && (<Tooltip><TooltipTrigger aria-label={`Info ${campo.label}`} className="inline-flex size-6 items-center justify-center rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-[220px] text-xs leading-snug"><p>{campo.descripcion}</p></TooltipContent></Tooltip>)}</div><FieldContent><Input type="time" {...field} /><FieldError errors={[form.formState.errors[campo.name]]} /></FieldContent></Field>)} />))}</div></FieldSet>
            </TooltipProvider>
            {esEdicion && <Controller control={form.control} name="accesoId" render={({ field }) => (<Field><FieldLabel>Estado</FieldLabel><FieldContent><CampoAcceso value={field.value} onChange={field.onChange} /></FieldContent></Field>)} />}
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><Button type="submit" disabled={crear.isPending || actualizar.isPending}>{(crear.isPending || actualizar.isPending) && <Loader2 className="animate-spin" data-icon="inline-start" />}{esEdicion ? "Guardar cambios" : "Crear turno"}</Button></DialogFooter>
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

  async function handleEliminar(anio: AnioEscolarResponse) {
    try {
      await crud.eliminar.mutateAsync(anio.idAnio)
      toast.success(`Año escolar ${anio.anio} eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderTabla titulo="Años escolares" descripcion="Solo un año puede estar vigente: al activarlo, los demás se cierran." puedeCrear={puedeCrear} onNuevo={() => { setEditando(null); setDialogOpen(true) }} />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Bloqueo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <FilasCargando columnas={6} /> : isError ? <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." /> : !data?.length ? <MensajeSinDatos columnas={6} mensaje="Aún no hay años escolares." /> : data.map((anio) => (
                <TableRow key={anio.idAnio}>
                  <TableCell className="font-medium">{anio.anio}</TableCell>
                  <TableCell className="text-xs">{anio.fechaInicio || "—"}</TableCell>
                  <TableCell className="text-xs">{anio.fechaFin || "—"}</TableCell>
                  <TableCell>{anio.bloqueoHorariosPorFecha ? <Badge variant="warning">Sí</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell><AnioBadge estado={anio.estado} /></TableCell>
                  <TableCell className="text-right"><AccionesFila puedeActualizar={puedeActualizar} puedeEliminar={puedeEliminar} onEditar={() => { setEditando(anio); setDialogOpen(true) }} onEliminar={() => handleEliminar(anio)} tituloEliminar="Eliminar año escolar" descripcionEliminar={`Se marcará el año ${anio.anio} como eliminado.`} ariaEditar={`Editar año ${anio.anio}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {isError && <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>}
        <AnioDialog key={editando?.idAnio ?? "nuevo"} open={dialogOpen} onOpenChange={setDialogOpen} anio={editando} crear={crud.crear} actualizar={crud.actualizar} />
      </CardContent>
    </Card>
  )
}

export function AnioBadge({ estado }: { estado: number }) {
  if (estado === 1) return <Badge variant="success">Vigente</Badge>
  return <Badge variant="outline">Cerrado</Badge>
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
  const form = useForm<AnioEscolarValues>({
    resolver: zodResolver(anioEscolarSchema),
    defaultValues: {
      anio: anio?.anio ?? "",
      estado: anio?.estado ?? 1,
      fechaInicio: anio?.fechaInicio ?? "",
      fechaFin: anio?.fechaFin ?? "",
      bloqueoHorariosPorFecha: anio?.bloqueoHorariosPorFecha ?? false,
    },
  })

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
            <Controller control={form.control} name="anio" render={({ field }) => (<Field><FieldLabel>Año</FieldLabel><FieldContent><Input placeholder="2026" maxLength={4} autoFocus {...field} /><FieldDescription className="text-xs">Formato 4 dígitos, ej: 2026.</FieldDescription><FieldError errors={[form.formState.errors.anio]} /></FieldContent></Field>)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Controller control={form.control} name="fechaInicio" render={({ field }) => (<Field><FieldLabel>Fecha de inicio</FieldLabel><FieldContent><Input type="date" {...field} /><FieldError errors={[form.formState.errors.fechaInicio]} /></FieldContent></Field>)} /><Controller control={form.control} name="fechaFin" render={({ field }) => (<Field><FieldLabel>Fecha de fin</FieldLabel><FieldContent><Input type="date" {...field} /><FieldError errors={[form.formState.errors.fechaFin]} /></FieldContent></Field>)} /></div>
            <Controller control={form.control} name="bloqueoHorariosPorFecha" render={({ field }) => (<Field><FieldContent><div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"><Switch checked={field.value ?? false} onCheckedChange={field.onChange} className="mt-0.5" /><div className="space-y-1"><FieldLabel className="text-sm font-medium leading-none">Bloquear horarios por fecha</FieldLabel><FieldDescription className="text-xs leading-snug">Cuando la fecha de inicio del ciclo haya pasado, no se permitirá modificar horarios.</FieldDescription></div></div></FieldContent></Field>)} />
            <Controller control={form.control} name="estado" render={({ field }) => (<Field><FieldLabel>Estado</FieldLabel><FieldContent><EstadoSelect value={field.value ?? 1} onChange={field.onChange} /></FieldContent></Field>)} />
          </FieldGroup>
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><Button type="submit" disabled={crear.isPending || actualizar.isPending}>{(crear.isPending || actualizar.isPending) && <Loader2 className="animate-spin" data-icon="inline-start" />}{esEdicion ? "Guardar cambios" : "Crear año"}</Button></DialogFooter>
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
  const form = useForm<AulaValues>({
    resolver: zodResolver(aulaSchema),
    defaultValues: {
      nombre: aula?.nombre ?? "",
      capacidad: aula?.capacidad ?? undefined,
      accesoId: aula?.accesoId ?? 1,
    },
  })

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
          <DialogFooter><DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger><Button type="submit" disabled={crear.isPending || actualizar.isPending}>{(crear.isPending || actualizar.isPending) && <Loader2 className="animate-spin" data-icon="inline-start" />}{esEdicion ? "Guardar cambios" : "Crear aula"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Piezas compartidas ───────────────────────────────────────────────────

function EstadoSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant={value === 1 ? "default" : "outline"} onClick={() => onChange(1)}>Vigente</Button>
      <Button type="button" variant={value === 2 ? "default" : "outline"} onClick={() => onChange(2)}>Cerrado</Button>
    </div>
  )
}
