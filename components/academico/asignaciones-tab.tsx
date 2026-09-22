"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, X } from "lucide-react"
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
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
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

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useAsignaciones,
  useAulas,
  useCrudAsignaciones,
  useCursos,
  useDocentes,
  useGrados,
  useHorasDocente,
} from "@/hooks/use-academico"
import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import type {
  AsignacionRequest,
  AsignacionResponse,
  HorarioRequest,
} from "@/lib/api/academico"
import { horaCorta } from "@/lib/api/academico"
import {
  asignacionSchema,
  type AsignacionValues,
  type HorarioValues,
} from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"

const DIAS = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
]

function formatoHorario(h: {
  diaSemana: number
  horaInicio: string
  horaFin: string
  aula: string
}) {
  return `${DIAS[h.diaSemana]} ${horaCorta(h.horaInicio)}–${horaCorta(h.horaFin)} · ${h.aula}`
}

export default function AsignacionesTab() {
  const { data, isLoading, isError, refetch } = useAsignaciones()
  const crud = useCrudAsignaciones()
  const puedeCrear = usePuede("ASIGNACIONES", "CREAR")
  const puedeActualizar = usePuede("ASIGNACIONES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ASIGNACIONES", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AsignacionResponse | null>(null)

  async function handleEliminar(asignacion: AsignacionResponse) {
    try {
      await crud.eliminar.mutateAsync(asignacion.idAsignacion)
      toast.success(
        `Asignación de "${asignacion.curso}" (${asignacion.grado} ${asignacion.seccion}) eliminada`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <div className="space-y-4">
      <HorasDocenteCard />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Asignaciones</h2>
              <p className="text-sm text-muted-foreground">
                Cursos asignados a docentes con su horario semanal.
              </p>
            </div>
            {puedeCrear && (
              <Button
                onClick={() => {
                  setEditando(null)
                  setDialogOpen(true)
                }}
              >
                <Plus />
                Nueva asignación
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead>Grado - Sección</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={7} />
              ) : isError ? (
                <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={7} mensaje="Aún no hay asignaciones." />
              ) : (
                data.map((asignacion) => (
                  <TableRow key={asignacion.idAsignacion}>
                    <TableCell className="font-medium">
                      {asignacion.curso}
                    </TableCell>
                    <TableCell>{asignacion.docente}</TableCell>
                    <TableCell>
                      {asignacion.grado} {asignacion.seccion}
                    </TableCell>
                    <TableCell>{asignacion.turno}</TableCell>
                    <TableCell>{asignacion.anio}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {asignacion.horarios.map((h) => (
                          <Badge key={h.idHorario} variant="secondary">
                            {formatoHorario(h)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {puedeActualizar && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Editar ${asignacion.curso}`}
                            onClick={() => {
                              setEditando(asignacion)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar asignación"
                            descripcion={`Se eliminará la asignación de "${asignacion.curso}" (${asignacion.docente}).`}
                            onConfirm={() => handleEliminar(asignacion)}
                          />
                        )}
                      </div>
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
        </CardContent>
      </Card>

      <AsignacionFormDialog
        key={editando?.idAsignacion ?? "nuevo"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asignacion={editando}
      />
    </div>
  )
}

// ── Formulario crear/editar ─────────────────────────────────────────────

function AsignacionFormDialog({
  open,
  onOpenChange,
  asignacion,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  asignacion?: AsignacionResponse | null
}) {
  const crud = useCrudAsignaciones()
  const { data: cursos = [] } = useCursos()
  const { data: docentes = [] } = useDocentes()
  const { data: grados = [] } = useGrados()
  const { data: anios = [] } = useAniosEscolares()
  const { data: aulas = [] } = useAulas()
  const esEdicion = !!asignacion

  const form = useForm<AsignacionValues>({
    resolver: zodResolver(asignacionSchema),
    defaultValues: {
      idCurso: asignacion?.idCurso ?? 0,
      idDocente: asignacion?.idDocente ?? 0,
      idGradoSeccion: asignacion?.idGradoSeccion ?? 0,
      idAnio: asignacion?.idAnio ?? 0,
      horarios:
        asignacion?.horarios.map((h) => ({
          idAula: h.idAula,
          diaSemana: h.diaSemana,
          horaInicio: horaCorta(h.horaInicio),
          horaFin: horaCorta(h.horaFin),
        })) ?? [{ idAula: 0, diaSemana: 1, horaInicio: "", horaFin: "" }],
      accesoId: asignacion?.accesoId ?? 1,
    },
  })

  const horarios = useWatch({ control: form.control, name: "horarios" }) ?? []
  const idGradoSeccionWatch = useWatch({ control: form.control, name: "idGradoSeccion" })

  const gradoActual = grados.find((g) =>
    g.secciones.some((s) => s.idGradoSeccion === idGradoSeccionWatch) ||
    (g.idGradoSeccionDefault != null && g.idGradoSeccionDefault === idGradoSeccionWatch)
  )

  function setHorario(index: number, patch: Partial<HorarioValues>) {
    const actuales = form.getValues("horarios")
    const next = actuales.map((h, i) => (i === index ? { ...h, ...patch } : h))
    form.setValue("horarios", next, { shouldValidate: true })
  }

  function agregarHorario() {
    form.setValue("horarios", [
      ...form.getValues("horarios"),
      { idAula: 0, diaSemana: 1, horaInicio: "", horaFin: "" },
    ])
  }

  function quitarHorario(index: number) {
    form.setValue(
      "horarios",
      form.getValues("horarios").filter((_, i) => i !== index),
      { shouldValidate: true }
    )
  }

  function buildRequest(values: AsignacionValues): AsignacionRequest {
    const data: AsignacionRequest = {
      idCurso: values.idCurso,
      idDocente: values.idDocente,
      idGradoSeccion: values.idGradoSeccion,
      idAnio: values.idAnio,
      horarios: values.horarios.map<HorarioRequest>((h) => ({
        idAula: h.idAula,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    }
    if (esEdicion) data.accesoId = values.accesoId
    return data
  }

  async function onSubmit(values: AsignacionValues) {
    try {
      if (esEdicion && asignacion) {
        await crud.actualizar.mutateAsync({
          id: asignacion.idAsignacion,
          data: buildRequest(values),
        })
        toast.success("Asignación actualizada")
      } else {
        await crud.crear.mutateAsync(buildRequest(values))
        toast.success("Asignación creada")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  const enviando = crud.crear.isPending || crud.actualizar.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar asignación" : "Nueva asignación"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="idCurso"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Curso</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {cursos.find((c) => c.idCurso === field.value)?.nombre ??
                            "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {cursos.map((c) => (
                          <SelectItem key={c.idCurso} value={String(c.idCurso)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idCurso]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idDocente"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Docente</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {docentes.find((d) => d.idDocente === field.value)
                            ? `${docentes.find((d) => d.idDocente === field.value)?.nombre} ${docentes.find((d) => d.idDocente === field.value)?.apellidoPat}`
                            : "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {docentes.map((d) => (
                          <SelectItem key={d.idDocente} value={String(d.idDocente)}>
                            {d.nombre} {d.apellidoPat} {d.apellidoMat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idDocente]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idGradoSeccion"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Grado - Sección</FieldLabel>
                  <FieldContent>
                    <GradoSeccionCascada
                      key={open ? `a-${asignacion?.idAsignacion ?? "n"}` : "closed"}
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? 0)}
                      defaultIdNivel={gradoActual?.idNivel ?? null}
                      defaultIdGrado={gradoActual?.idGrado ?? null}
                    />
                    <FieldError
                      errors={[form.formState.errors.idGradoSeccion]}
                    />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idAnio"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Año escolar</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {anios.find((a) => a.idAnio === field.value)?.anio ??
                            "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {anios.map((a) => (
                          <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                            {a.anio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idAnio]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <Field>
            <FieldLabel>Horarios</FieldLabel>
            <FieldContent>
              <div className="space-y-3">
                {horarios.map((horario, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-5"
                  >
                    <div className="sm:col-span-2">
                      <Select
                        value={horario.idAula ? String(horario.idAula) : ""}
                        onValueChange={(v) =>
                          setHorario(index, { idAula: Number(v) })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {aulas.find((a) => a.idAula === horario.idAula)
                              ?.nombre ?? "Aula"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {aulas.map((a) => (
                            <SelectItem key={a.idAula} value={String(a.idAula)}>
                              {a.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select
                        value={String(horario.diaSemana)}
                        onValueChange={(v) =>
                          setHorario(index, { diaSemana: Number(v) })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{DIAS[horario.diaSemana]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DIAS.slice(1).map((d, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="time"
                      aria-label="Hora de inicio"
                      value={horario.horaInicio}
                      onChange={(e) =>
                        setHorario(index, { horaInicio: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        aria-label="Hora de fin"
                        value={horario.horaFin}
                        onChange={(e) =>
                          setHorario(index, { horaFin: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={horarios.length === 1}
                        onClick={() => quitarHorario(index)}
                        aria-label={`Quitar horario ${index + 1}`}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarHorario}
                >
                  <Plus />
                  Agregar horario
                </Button>
                <FieldError errors={[form.formState.errors.horarios]} />
              </div>
            </FieldContent>
          </Field>

          {esEdicion && (
            <Controller
              control={form.control}
              name="accesoId"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <FieldContent>
                    <Select
                      value={String(field.value ?? 1)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {field.value === 1 ? "Activo" : "Inactivo"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Activo</SelectItem>
                        <SelectItem value="0">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              )}
            />
          )}

          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear asignación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Horas por docente ───────────────────────────────────────────────────

function HorasDocenteCard() {
  const { data: docentes = [] } = useDocentes()
  const [idDocente, setIdDocente] = useState<number | null>(null)
  const { data: horas, isLoading, isError, refetch } = useHorasDocente(idDocente)

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Horas de clase por docente</h2>
            <p className="text-sm text-muted-foreground">
              Total de horas semanales y mensuales (semana × 4.33).
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={idDocente ? String(idDocente) : ""}
              onValueChange={(v) => setIdDocente(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {docentes.find((d) => d.idDocente === idDocente)
                    ?.nombre
                    ? `${docentes.find((d) => d.idDocente === idDocente)?.nombre} ${docentes.find((d) => d.idDocente === idDocente)?.apellidoPat}`
                    : "Selecciona un docente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {docentes.map((d) => (
                  <SelectItem key={d.idDocente} value={String(d.idDocente)}>
                    {d.nombre} {d.apellidoPat} {d.apellidoMat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {idDocente && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Horas / semana</p>
                <p className="text-2xl font-bold text-primary">
                  {isLoading
                    ? "…"
                    : isError
                      ? "—"
                      : (horas?.horasSemana ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Horas / mes</p>
                <p className="text-2xl font-bold text-primary">
                  {isLoading
                    ? "…"
                    : isError
                      ? "—"
                      : (horas?.horasMes ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}