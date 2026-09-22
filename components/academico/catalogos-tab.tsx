"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

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
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
  useCrudTurnos,
  useCursos,
  useTurnos,
} from "@/hooks/use-academico"
import type {
  AnioEscolarResponse,
  AulaResponse,
  CursoRequest,
  CursoResponse,
  TurnoResponse,
} from "@/lib/api/academico"
import { horaCorta } from "@/lib/api/academico"
import {
  anioEscolarSchema,
  aulaSchema,
  turnoSchema,
  type AnioEscolarValues,
  type AulaValues,
  type TurnoValues,
} from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"

interface CatalogosTabProps {
  puedeCursos: boolean
  puedeTurnos: boolean
  puedeAnios: boolean
  puedeAulas: boolean
}

export default function CatalogosTab({
  puedeCursos,
  puedeTurnos,
  puedeAnios,
  puedeAulas,
}: CatalogosTabProps) {
  return (
    <Tabs defaultValue="cursos">
      <TabsList className="w-full justify-start overflow-x-auto">
        {puedeCursos && <TabsTrigger value="cursos">Cursos</TabsTrigger>}
        {puedeTurnos && <TabsTrigger value="turnos">Turnos</TabsTrigger>}
        {puedeAnios && (
          <TabsTrigger value="anios">Años Escolares</TabsTrigger>
        )}
        {puedeAulas && <TabsTrigger value="aulas">Aulas</TabsTrigger>}
      </TabsList>
      {puedeCursos && (
        <TabsContent value="cursos">
          <CursosTab />
        </TabsContent>
      )}
      {puedeTurnos && (
        <TabsContent value="turnos">
          <TurnosTab />
        </TabsContent>
      )}
      {puedeAnios && (
        <TabsContent value="anios">
          <AniosTab />
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

// ── Cursos ───────────────────────────────────────────────────────────────

function CursosTab() {
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
      <CardContent className="space-y-4 p-4">
        <HeaderTabla
          titulo="Cursos"
          descripcion="Las materias que se dictan (Matemática, Comunicación...)."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
        />
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
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <SimpleDialog
          key={editando?.idCurso ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          titulo={editando ? "Editar curso" : "Nuevo curso"}
          nombre={editando?.nombre ?? ""}
          accesoId={editando?.accesoId ?? 1}
          esEdicion={!!editando}
          onSubmit={(nombre, accesoId) => {
            const data: CursoRequest = { nombre }
            if (editando) data.accesoId = accesoId
            return editando
              ? crud.actualizar.mutateAsync({ id: editando.idCurso, data })
              : crud.crear.mutateAsync(data)
          }}
          placeholder="Matemática"
        />
      </CardContent>
    </Card>
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
      <CardContent className="space-y-4 p-4">
        <HeaderTabla
          titulo="Aulas"
          descripcion="Los salones o ambientes disponibles para las clases."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
        />
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

// ── Turnos ───────────────────────────────────────────────────────────────

const CAMPOS_TURNO: {
  name: keyof TurnoValues
  label: string
  placeholder?: string
  descripcion?: string
}[] = [
  {
    name: "horaEntrada",
    label: "Hora de entrada",
    placeholder: "07:45",
    descripcion: "Desde esta hora se puede marcar asistencia.",
  },
  {
    name: "horaEntradaLimite",
    label: "Límite de entrada",
    placeholder: "08:00",
    descripcion: "Hasta esta hora el registro es Puntual; después, Tardanza.",
  },
  {
    name: "horaFaltaLimite",
    label: "Límite de falta",
    placeholder: "08:30",
    descripcion:
      "Hasta esta hora el registro es Tardanza; después requiere justificación.",
  },
  {
    name: "horaSalida",
    label: "Hora de salida",
    placeholder: "13:00",
    descripcion:
      "Hasta esta hora se acepta justificación; después queda Inasistencia.",
  },
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
      <CardContent className="space-y-4 p-4">
        <HeaderTabla
          titulo="Turnos"
          descripcion="Definen los horarios de entrada/salida para asistencia."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
        />
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
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay turnos." />
            ) : (
              data.map((turno) => (
                <TableRow key={turno.idTurno}>
                  <TableCell className="font-medium">{turno.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(turno.horaEntrada)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(turno.horaEntradaLimite)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(turno.horaFaltaLimite)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(turno.horaSalida)}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge accesoId={turno.accesoId} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AccionesFila
                      puedeActualizar={puedeActualizar}
                      puedeEliminar={puedeEliminar}
                      onEditar={() => {
                        setEditando(turno)
                        setDialogOpen(true)
                      }}
                      onEliminar={() => handleEliminar(turno)}
                      tituloEliminar="Eliminar turno"
                      descripcionEliminar={`Se marcará "${turno.nombre}" como eliminado.`}
                      ariaEditar={`Editar ${turno.nombre}`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <TurnoDialog
          key={editando?.idTurno ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          turno={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
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
      if (esEdicion && turno) {
        await actualizar.mutateAsync({ id: turno.idTurno, data: values })
        toast.success("Turno actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Turno creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar turno" : "Nuevo turno"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nombre del turno</FieldLabel>
                <FieldContent>
                  <Input placeholder="Mañana" {...field} />
                  <FieldError errors={[form.formState.errors.nombre]} />
                </FieldContent>
              </Field>
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS_TURNO.map((campo) => (
              <Controller
                key={campo.name}
                control={form.control}
                name={campo.name}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{campo.label}</FieldLabel>
                    <FieldContent>
                      <Input type="time" {...field} />
                      {campo.descripcion && (
                        <FieldDescription>{campo.descripcion}</FieldDescription>
                      )}
                      <FieldError errors={[form.formState.errors[campo.name]]} />
                    </FieldContent>
                  </Field>
                )}
              />
            ))}
          </div>
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
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
              {(crear.isPending || actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear turno"}
            </Button>
          </DialogFooter>
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
      <CardContent className="space-y-4 p-4">
        <HeaderTabla
          titulo="Años escolares"
          descripcion="Solo un año puede estar vigente: al activarlo, los demás se cierran."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
        />
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
            {isLoading ? (
              <FilasCargando columnas={6} />
            ) : isError ? (
              <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={6} mensaje="Aún no hay años escolares." />
            ) : (
              data.map((anio) => (
                <TableRow key={anio.idAnio}>
                  <TableCell className="font-medium">{anio.anio}</TableCell>
                  <TableCell className="text-xs">
                    {anio.fechaInicio || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {anio.fechaFin || "—"}
                  </TableCell>
                  <TableCell>
                    {anio.bloqueoHorariosPorFecha ? (
                      <Badge variant="warning">Sí</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <AnioBadge estado={anio.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AccionesFila
                      puedeActualizar={puedeActualizar}
                      puedeEliminar={puedeEliminar}
                      onEditar={() => {
                        setEditando(anio)
                        setDialogOpen(true)
                      }}
                      onEliminar={() => handleEliminar(anio)}
                      tituloEliminar="Eliminar año escolar"
                      descripcionEliminar={`Se marcará el año ${anio.anio} como eliminado.`}
                      ariaEditar={`Editar año ${anio.anio}`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <AnioDialog
          key={editando?.idAnio ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          anio={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

export function AnioBadge({ estado }: { estado: number }) {
  if (estado === 1) {
    return <Badge variant="success">Vigente</Badge>
  }
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
      if (esEdicion && anio) {
        await actualizar.mutateAsync({ id: anio.idAnio, data: values })
        toast.success("Año escolar actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Año escolar creado")
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
          <DialogTitle>
            {esEdicion ? "Editar año escolar" : "Nuevo año escolar"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="anio"
            render={({ field }) => (
              <Field>
                <FieldLabel>Año</FieldLabel>
                <FieldContent>
                  <Input placeholder="2026" maxLength={4} {...field} />
                  <FieldError errors={[form.formState.errors.anio]} />
                </FieldContent>
              </Field>
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fechaInicio"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de inicio</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
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
                    <Input type="date" {...field} />
                    <FieldError errors={[form.formState.errors.fechaFin]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="bloqueoHorariosPorFecha"
            render={({ field }) => (
              <Field>
                <FieldContent>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                    <div>
                      <FieldLabel>Bloquear horarios por fecha</FieldLabel>
                      <FieldDescription>
                        Cuando la fecha de inicio del ciclo haya pasado, no se
                        permitirá modificar horarios.
                      </FieldDescription>
                    </div>
                  </div>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="estado"
            render={({ field }) => (
              <Field>
                <FieldLabel>Estado</FieldLabel>
                <FieldContent>
                  <EstadoSelect
                    value={field.value ?? 1}
                    onChange={field.onChange}
                  />
                </FieldContent>
              </Field>
            )}
          />
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
              {(crear.isPending || actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear año"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Aula dialog (con capacidad) ──────────────────────────────────────────

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
      if (esEdicion && aula) {
        await actualizar.mutateAsync({ id: aula.idAula, data: values })
        toast.success("Aula actualizada")
      } else {
        await crear.mutateAsync(values)
        toast.success("Aula creada")
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
          <DialogTitle>{esEdicion ? "Editar aula" : "Nueva aula"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <FieldContent>
                  <Input placeholder="Aula 101" {...field} />
                  <FieldError errors={[form.formState.errors.nombre]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="capacidad"
            render={({ field }) => (
              <Field>
                <FieldLabel>Capacidad</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min="1"
                    placeholder="30"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                  />
                  <FieldError errors={[form.formState.errors.capacidad]} />
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
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
              {(crear.isPending || actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear aula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Diálogo simple (Curso) ───────────────────────────────────────────────

function SimpleDialog({
  open,
  onOpenChange,
  titulo,
  nombre,
  accesoId,
  esEdicion,
  onSubmit,
  placeholder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  nombre: string
  accesoId: number
  esEdicion: boolean
  onSubmit: (nombre: string, accesoId: number) => Promise<unknown>
  placeholder: string
}) {
  const [nombreLocal, setNombreLocal] = useState(nombre)
  const [accesoIdLocal, setAccesoIdLocal] = useState(accesoId)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreLocal.trim()) {
      setError("El nombre es requerido")
      return
    }
    setCargando(true)
    setError(null)
    try {
      await onSubmit(nombreLocal.trim(), accesoIdLocal)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setCargando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field>
            <FieldLabel>Nombre</FieldLabel>
            <FieldContent>
              <Input
                placeholder={placeholder}
                value={nombreLocal}
                onChange={(e) => setNombreLocal(e.target.value)}
              />
              <FieldError errors={[{ message: error ?? undefined }]} />
            </FieldContent>
          </Field>
          {esEdicion && (
            <Field>
              <FieldLabel>Estado</FieldLabel>
              <FieldContent>
                <CampoAcceso value={accesoIdLocal} onChange={setAccesoIdLocal} />
              </FieldContent>
            </Field>
          )}
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={cargando}>
              {cargando && <Loader2 className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
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
      <Button
        type="button"
        variant={value === 1 ? "default" : "outline"}
        onClick={() => onChange(1)}
      >
        Vigente
      </Button>
      <Button
        type="button"
        variant={value === 2 ? "default" : "outline"}
        onClick={() => onChange(2)}
      >
        Cerrado
      </Button>
    </div>
  )
}