"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Coffee, Lock, Pencil, Plus, X } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
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

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { SelectorHora } from "@/components/shared/selector-hora"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { FiltrosMalla, useFiltrosMalla } from "@/components/academico/cursos-tab"
import {
  useAsignaciones,
  useAulas,
  useCrudAsignaciones,
  useCursos,
  useDocentes,
  useGradosDelAnio,
  useHoraAcademica,
  useHorasDocente,
  useRecreos,
  useTurnos,
} from "@/hooks/use-academico"
import {
  ACCESO,
  DIAS_CLASE,
  ESTADO_ANIO,
  horaCorta,
  type AnioEscolarResponse,
  type RecreoResponse,
  type TipoAula,
  type AsignacionRequest,
  type AsignacionResponse,
  type NivelResponse,
} from "@/lib/api/academico"
import { asignacionSchema, type AsignacionValues } from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"

function nombreDia(dia: number) {
  return DIAS_CLASE.find((d) => d.value === dia)?.label ?? String(dia)
}

function formatoHorario(h: { diaSemana: number; horaInicio: string; horaFin: string; aula: string }) {
  return `${nombreDia(h.diaSemana)} ${horaCorta(h.horaInicio)}–${horaCorta(h.horaFin)} · ${h.aula}`
}

const HORARIO_VACIO = { idAula: 0, diaSemana: 1, horaInicio: "", horaFin: "" }

const TIPO_AULA_EN_HORARIO: Record<TipoAula, string> = {
  SALON: "Salón de la sección",
  AMBIENTE: "Ambiente especial · una clase a la vez",
  COMPARTIDO: "Espacio compartido",
}

/**
 * Recreos agrupados por los días que comparten horario: "Lun–Vie 09:20–09:40"
 * en vez de repetir la misma franja cinco veces.
 */
function resumenRecreos(recreos: RecreoResponse[]): { dias: string; franjas: string }[] {
  const porDia = new Map<number, string>()
  for (const dia of [...new Set(recreos.map((r) => r.diaSemana))].sort()) {
    porDia.set(
      dia,
      recreos
        .filter((r) => r.diaSemana === dia)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
        .map((r) => `${horaCorta(r.horaInicio)}–${horaCorta(r.horaFin)}`)
        .join(" y ")
    )
  }
  const grupos = new Map<string, number[]>()
  porDia.forEach((franjas, dia) => grupos.set(franjas, [...(grupos.get(franjas) ?? []), dia]))
  const corto = (dia: number) => DIAS_CLASE.find((d) => d.value === dia)?.corto ?? String(dia)
  return [...grupos.entries()].map(([franjas, dias]) => {
    // Días seguidos se juntan en un rango (Lun–Vie); si no, van separados.
    const seguidos = dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1)
    return {
      dias: seguidos ? `${corto(dias[0])}–${corto(dias[dias.length - 1])}` : dias.map(corto).join(", "),
      franjas,
    }
  })
}

export default function AsignacionesTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio, idNivel, nivel } = filtros
  const { data, isLoading, isError, refetch } = useAsignaciones()
  const crud = useCrudAsignaciones()
  const puedeCrear = usePuede("ASIGNACIONES", "CREAR")
  const puedeActualizar = usePuede("ASIGNACIONES", "ACTUALIZAR")
  const puedeEliminar = usePuede("ASIGNACIONES", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AsignacionResponse | null>(null)

  // Por comenzar: todo. Vigente: solo se crea lo que falta. Cerrado: nada.
  const editable = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  const creable = !!anio && anio.estado !== ESTADO_ANIO.CERRADO

  const asignaciones = useMemo(
    () => (data ?? []).filter((a) => a.idAnio === idAnio && a.idNivel === idNivel),
    [data, idAnio, idNivel]
  )

  async function handleEliminar(asignacion: AsignacionResponse) {
    try {
      await crud.eliminar.mutateAsync(asignacion.idAsignacion)
      toast.success(`Asignación de "${asignacion.curso}" (${asignacion.grado} ${asignacion.seccion}) eliminada`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
      throw error
    }
  }

  return (
    <div className="space-y-4">
      <HorasDocenteCard />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <HeaderSeccion
            titulo="Asignaciones"
            descripcion="Cursos asignados a docentes con su horario semanal. Cada curso de una sección tiene un solo docente."
            acciones={
              puedeCrear && creable ? (
                <Button
                  variant="brand"
                  onClick={() => {
                    setEditando(null)
                    setDialogOpen(true)
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Nueva asignación
                </Button>
              ) : null
            }
          />

          {anio && !editable && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
              <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                {anio.estado === ESTADO_ANIO.VIGENTE
                  ? `El año ${anio.anio} está vigente: sus asignaciones ya no se editan ni se eliminan. Solo puedes asignar los cursos que aún no tienen docente; para reemplazar a un docente usa Cambios de docente.`
                  : `El año ${anio.anio} está cerrado: sus asignaciones son de solo lectura.`}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <FiltrosMalla
              anios={filtros.anios}
              niveles={filtros.niveles}
              idAnio={idAnio}
              idNivel={idNivel}
              onAnio={filtros.setIdAnio}
              onNivel={filtros.setIdNivel}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader appearance="soft-gray">
                <TableRow>
                  <TableHead>Grado - Sección</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead className="text-center">Horarios</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <FilasCargando columnas={6} />
                ) : isError ? (
                  <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
                ) : !asignaciones.length ? (
                  <MensajeSinDatos
                    columnas={6}
                    mensaje={`Aún no hay asignaciones de ${nivel?.nombre ?? "este nivel"} en el año ${anio?.anio ?? ""}.`}
                  />
                ) : (
                  asignaciones.map((asignacion) => (
                    <TableRow key={asignacion.idAsignacion}>
                      <TableCell className="font-medium">
                        {asignacion.grado} {asignacion.seccion}
                      </TableCell>
                      <TableCell>{asignacion.turno}</TableCell>
                      <TableCell>{asignacion.curso}</TableCell>
                      <TableCell>{asignacion.docente}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {asignacion.horarios.map((h) => (
                            <Badge key={h.idHorario} variant="secondary">
                              {formatoHorario(h)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          {puedeActualizar && editable && (
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
                          {puedeEliminar && editable && (
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
          </div>

          {isError && <BotonReintentar refetch={refetch} />}
        </CardContent>
      </Card>

      {dialogOpen && anio && nivel && (
        <AsignacionFormDialog
          onOpenChange={setDialogOpen}
          asignacion={editando}
          anios={filtros.anios}
          niveles={filtros.niveles}
          anioInicial={anio}
          nivelInicial={nivel}
          asignaciones={data ?? []}
        />
      )}
    </div>
  )
}

// ── Formulario crear/editar ─────────────────────────────────────────────

/** Etiqueta de un Select con el texto de la opción elegida. */
function Opcion<T>({ items, value, texto, vacio }: { items: T[]; value: (t: T) => boolean; texto: (t: T) => string; vacio: string }) {
  const elegido = items.find(value)
  return <>{elegido ? texto(elegido) : vacio}</>
}

function AsignacionFormDialog({
  onOpenChange,
  asignacion,
  anios,
  niveles,
  anioInicial,
  nivelInicial,
  asignaciones,
}: {
  onOpenChange: (open: boolean) => void
  asignacion: AsignacionResponse | null
  anios: AnioEscolarResponse[]
  niveles: NivelResponse[]
  anioInicial: AnioEscolarResponse
  nivelInicial: NivelResponse
  /** Todas las asignaciones: sirven para no ofrecer cursos que ya tienen docente. */
  asignaciones: AsignacionResponse[]
}) {
  const crud = useCrudAsignaciones()
  const esEdicion = !!asignacion
  const { data: docentes = [] } = useDocentes()
  const { data: aulas = [] } = useAulas()
  const { data: turnos = [] } = useTurnos()

  const form = useForm<AsignacionValues>({
    resolver: zodResolver(asignacionSchema),
    defaultValues: {
      idAnio: asignacion?.idAnio ?? anioInicial.idAnio,
      idNivel: asignacion?.idNivel ?? nivelInicial.idNivel,
      idGrado: asignacion?.idGrado ?? 0,
      idGradoSeccion: asignacion?.idGradoSeccion ?? 0,
      idDocente: asignacion?.idDocente ?? 0,
      idCurso: asignacion?.idCurso ?? 0,
      horarios:
        asignacion?.horarios.map((h) => ({
          idAula: h.idAula,
          diaSemana: h.diaSemana,
          horaInicio: horaCorta(h.horaInicio),
          horaFin: horaCorta(h.horaFin),
        })) ?? [HORARIO_VACIO],
    },
  })
  const horariosArray = useFieldArray({ control: form.control, name: "horarios" })
  const [idAnio, idNivel, idGrado, idGradoSeccion, horarios] = useWatch({
    control: form.control,
    name: ["idAnio", "idNivel", "idGrado", "idGradoSeccion", "horarios"],
  })

  // Un año cerrado no admite asignaciones; uno vigente solo las que faltan.
  const aniosElegibles = esEdicion
    ? anios.filter((a) => a.estado === ESTADO_ANIO.POR_COMENZAR)
    : anios.filter((a) => a.estado !== ESTADO_ANIO.CERRADO)

  const { data: grados = [] } = useGradosDelAnio(idNivel || null, idAnio || null)
  const gradosDelAnio = grados.filter((g) => g.secciones.some((s) => s.idAnio === idAnio))
  const grado = gradosDelAnio.find((g) => g.idGrado === idGrado)
  const secciones = grado?.secciones.filter((s) => s.idAnio === idAnio) ?? []
  const seccion = secciones.find((s) => s.idGradoSeccion === idGradoSeccion)
  const turno = turnos.find((t) => t.idTurno === seccion?.idTurno)
  // Sin salon la seccion no recibe cursos: cada horario parte de su salon.
  const sinSalon = !!seccion && !seccion.idAula
  const horarioVacio = { ...HORARIO_VACIO, idAula: seccion?.idAula ?? 0 }
  // Las clases duran bloques de la hora académica del año y nivel (pestaña
  // Configuración académica). Null: libre, en pasos de 5 minutos.
  const { data: horaAcademica } = useHoraAcademica(idAnio || null, idNivel || null)
  const minutosBloque = horaAcademica?.minutosHoraAcademica ?? null
  // Su salon, los ambientes especiales y los espacios compartidos; nunca el salon de otra seccion.
  const aulasPermitidas = aulas.filter(
    (a) => (a.accesoId ?? ACCESO.ACTIVO) === ACCESO.ACTIVO && (a.tipo !== "SALON" || a.idAula === seccion?.idAula)
  )

  // El docente debe estar activo y enseñar en el nivel.
  const docentesDelNivel = docentes.filter(
    (d) => (d.accesoId ?? ACCESO.ACTIVO) === ACCESO.ACTIVO && d.niveles.some((n) => n.idNivel === idNivel)
  )

  // Solo los cursos asignables de la malla y que la sección aún no tiene.
  const { data: cursos = [] } = useCursos({ idAnio: idAnio || null, idNivel: idNivel || null })
  const asignadosEnSeccion = new Set(
    asignaciones
      .filter((a) => a.idGradoSeccion === idGradoSeccion && a.idAsignacion !== asignacion?.idAsignacion)
      .map((a) => a.idCurso)
  )
  const cursosAsignables = cursos.filter(
    (c) =>
      c.accesoId === ACCESO.ACTIVO &&
      (c.tipo === "SUBCURSO" || (c.tipo === "AREA" && !c.tieneSubcursos)) &&
      !asignadosEnSeccion.has(c.idCurso)
  )
  const nombreCurso = (idCurso: number) => {
    const c = cursos.find((x) => x.idCurso === idCurso)
    if (!c) return ""
    const padre = c.idCursoPadre ? cursos.find((x) => x.idCurso === c.idCursoPadre) : null
    return padre ? `${padre.nombre} › ${c.nombre}` : c.nombre
  }

  // El grado necesita recreo en su turno, y uno cada día que tenga clase.
  const { data: recreos = [], isLoading: cargandoRecreos } = useRecreos({ idAnio: idAnio || null, idNivel: idNivel || null })
  const recreosDelGrado = recreos.filter((r) => r.idGrado === idGrado && r.idTurno === seccion?.idTurno)
  // Recreos del dia en "HH:mm", para deshabilitar esas horas en los selectores.
  const recreosDelDia = (dia: number | undefined) =>
    recreosDelGrado
      .filter((r) => r.diaSemana === dia)
      .map((r) => ({ inicio: horaCorta(r.horaInicio), fin: horaCorta(r.horaFin) }))
  const sinRecreo = !!seccion && !cargandoRecreos && recreosDelGrado.length === 0
  const diasSinRecreo = new Set(
    horarios.map((h) => h.diaSemana).filter((dia) => !recreosDelGrado.some((r) => r.diaSemana === dia))
  )
  const bloqueado = sinSalon || sinRecreo || (!!seccion && diasSinRecreo.size > 0)

  function cambiarCascada(campo: "idAnio" | "idNivel" | "idGrado" | "idGradoSeccion", valor: number) {
    form.setValue(campo, valor, { shouldValidate: true })
    // Lo que depende del campo cambiado deja de ser válido.
    const orden = ["idAnio", "idNivel", "idGrado", "idGradoSeccion"] as const
    for (const dependiente of orden.slice(orden.indexOf(campo) + 1)) form.setValue(dependiente, 0)
    if (campo !== "idGradoSeccion") form.setValue("idDocente", 0)
    form.setValue("idCurso", 0)
    if (campo === "idGradoSeccion" || campo === "idGrado") {
      const salon = campo === "idGradoSeccion" ? secciones.find((s) => s.idGradoSeccion === valor)?.idAula ?? 0 : 0
      form.setValue("horarios", [{ ...HORARIO_VACIO, idAula: salon }])
    }
  }

  async function guardar(values: AsignacionValues, otro: boolean) {
    if (bloqueado) return
    const data: AsignacionRequest = {
      idAnio: values.idAnio,
      idGradoSeccion: values.idGradoSeccion,
      idDocente: values.idDocente,
      idCurso: values.idCurso,
      horarios: values.horarios.map((h) => ({
        idAula: h.idAula,
        diaSemana: h.diaSemana,
        horaInicio: `${h.horaInicio}:00`,
        horaFin: `${h.horaFin}:00`,
      })),
    }
    try {
      if (esEdicion && asignacion) {
        await crud.actualizar.mutateAsync({ id: asignacion.idAsignacion, data })
        toast.success("Asignación actualizada")
        onOpenChange(false)
        return
      }
      await crud.crear.mutateAsync(data)
      toast.success(`${nombreCurso(values.idCurso)} asignado`)
      if (otro) {
        // Se queda con año, nivel, sección y docente para seguir con otro curso.
        form.reset({ ...values, idCurso: 0, horarios: [horarioVacio] })
      } else {
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  const enviando = crud.crear.isPending || crud.actualizar.isPending
  const errores = form.formState.errors

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {esEdicion ? "Editar asignación" : "Nueva asignación"}
          </DialogTitle>
          <DialogDescription>Elige la sección, el docente y el curso; luego su horario semanal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => guardar(v, false))} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Año escolar</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={idAnio ? String(idAnio) : ""}
                  onValueChange={(v) => v && cambiarCascada("idAnio", Number(v))}
                  options={aniosElegibles.map((a) => ({ value: String(a.idAnio), label: a.anio }))}
                  includeAll={false}
                  allLabel="Selecciona"
                  className="w-full"
                />
                <FieldError errors={[errores.idAnio]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Nivel</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={idNivel ? String(idNivel) : ""}
                  onValueChange={(v) => v && cambiarCascada("idNivel", Number(v))}
                  options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
                  includeAll={false}
                  allLabel="Selecciona"
                  className="w-full"
                />
                <FieldError errors={[errores.idNivel]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Grado</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={idGrado ? String(idGrado) : ""}
                  onValueChange={(v) => v && cambiarCascada("idGrado", Number(v))}
                  options={gradosDelAnio.map((g) => ({ value: String(g.idGrado), label: g.nombre }))}
                  includeAll={false}
                  allLabel={gradosDelAnio.length ? "Selecciona" : "Sin grados en este año"}
                  className="w-full"
                  disabled={!gradosDelAnio.length}
                />
                <FieldError errors={[errores.idGrado]} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Sección</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={idGradoSeccion ? String(idGradoSeccion) : ""}
                  onValueChange={(v) => v && cambiarCascada("idGradoSeccion", Number(v))}
                  options={secciones.map((s) => ({ value: String(s.idGradoSeccion), label: `${s.nombre} · ${s.turno}` }))}
                  includeAll={false}
                  allLabel="Selecciona"
                  className="w-full"
                  disabled={!secciones.length}
                />
                <FieldError errors={[errores.idGradoSeccion]} />
              </FieldContent>
            </Field>
          </div>

          {sinSalon && seccion && grado && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Asigna primero el salón de {grado.nombre} {seccion.nombre} en Grados y secciones.
            </div>
          )}

          {!sinSalon && sinRecreo && grado && turno && (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Primero configura el recreo de {grado.nombre} – turno {turno.nombre} en la pestaña Recreos.
            </div>
          )}

          <fieldset disabled={!seccion || sinSalon || sinRecreo} className="space-y-5 disabled:opacity-60">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="idDocente"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Docente</FieldLabel>
                    <FieldContent>
                      <Select value={field.value ? String(field.value) : null} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            <Opcion
                              items={docentes}
                              value={(d) => d.idDocente === field.value}
                              texto={(d) => `${d.nombre} ${d.apellidoPat}`}
                              vacio={docentesDelNivel.length ? "Selecciona" : "Sin docentes en este nivel"}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {docentesDelNivel.map((d) => (
                              <SelectItem key={d.idDocente} value={String(d.idDocente)}>
                                {d.nombre} {d.apellidoPat} {d.apellidoMat}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[errores.idDocente]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="idCurso"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Curso</FieldLabel>
                    <FieldContent>
                      <Select value={field.value ? String(field.value) : null} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            <span className="truncate">
                              {field.value ? nombreCurso(field.value) : cursosAsignables.length ? "Selecciona" : "Sin cursos por asignar"}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        {/* Nombres largos (Desarrollo personal, ciudadanía y cívica): la lista
                            puede ser más ancha que el botón y el texto baja de línea. */}
                        <SelectContent className="max-h-72 w-auto min-w-(--anchor-width) max-w-[min(26rem,calc(100vw-2rem))]">
                          <SelectGroup>
                            {cursosAsignables.map((c) => (
                              <SelectItem
                                key={c.idCurso}
                                value={String(c.idCurso)}
                                className="py-1.5 [&>*:first-child]:shrink [&>*:first-child]:whitespace-normal"
                              >
                                {nombreCurso(c.idCurso)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription className="text-xs">
                        Solo los cursos de la malla que esta sección aún no tiene asignados.
                      </FieldDescription>
                      <FieldError errors={[errores.idCurso]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </div>

            <Field>
              <FieldLabel>Horarios</FieldLabel>
              <FieldDescription className="text-xs">
                {turno
                  ? `Aula, día y horas dentro del turno ${turno.nombre} (${horaCorta(turno.horaEntrada)} – ${horaCorta(turno.horaSalida)}).${minutosBloque ? ` Cada clase dura bloques de ${minutosBloque} minutos.` : ""}`
                  : "Elige la sección para habilitar las horas de su turno."}
              </FieldDescription>
              <FieldContent>
                <div className="flex flex-col gap-3">
                  {recreosDelGrado.length > 0 && (
                    <div className="flex gap-3 rounded-lg border border-brand-info/20 bg-brand-subtle/60 p-3 text-sm dark:border-blue-800/50 dark:bg-blue-950/30">
                      <Coffee className="mt-0.5 size-4 shrink-0 text-brand-info dark:text-blue-300" />
                      <div className="space-y-1.5">
                        <p className="font-medium leading-tight">
                          Recreos de {grado?.nombre} – turno {turno?.nombre}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumenRecreos(recreosDelGrado).map(({ dias, franjas }) => (
                            <Badge key={dias} variant="outline" className="h-auto gap-1.5 bg-background py-0.5 font-normal">
                              <span className="font-medium">{dias}</span>
                              <span className="font-mono text-muted-foreground">{franjas}</span>
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Las clases no pueden cruzarse con estos horarios.</p>
                      </div>
                    </div>
                  )}
                  {/* Encabezados de las columnas (en móvil cada campo ya tiene su texto). */}
                  <div className="hidden grid-cols-[2fr_1.3fr_1fr_1fr_2.25rem] gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid">
                    <span>Aula</span>
                    <span>Día</span>
                    <span>Inicio</span>
                    <span>Fin</span>
                    <span />
                  </div>
                  {horariosArray.fields.map((fila, index) => {
                    const error = errores.horarios?.[index]
                    const dia = horarios[index]?.diaSemana
                    return (
                      <div key={fila.id} className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1.3fr_1fr_1fr_2.25rem]">
                          <Controller
                            control={form.control}
                            name={`horarios.${index}.idAula`}
                            render={({ field }) => (
                              <Select value={field.value ? String(field.value) : null} onValueChange={(v) => field.onChange(Number(v))}>
                                <SelectTrigger className="w-full" aria-label="Aula">
                                  <SelectValue>
                                    <Opcion items={aulas} value={(a) => a.idAula === field.value} texto={(a) => a.nombre} vacio="Aula" />
                                  </SelectValue>
                                </SelectTrigger>
                                {/* La lista puede ser más ancha que el botón: cada aula lleva su tipo debajo. */}
                                <SelectContent className="w-auto min-w-(--anchor-width)">
                                  <SelectGroup>
                                    {aulasPermitidas.map((a) => (
                                      <SelectItem key={a.idAula} value={String(a.idAula)} className="py-1.5">
                                        <span className="flex flex-col">
                                          <span>{a.nombre}</span>
                                          <span className="text-xs text-muted-foreground">{TIPO_AULA_EN_HORARIO[a.tipo]}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name={`horarios.${index}.diaSemana`}
                            render={({ field }) => (
                              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                                <SelectTrigger className="w-full" aria-label="Día">
                                  <SelectValue>{nombreDia(field.value)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {DIAS_CLASE.map((d) => (
                                      <SelectItem key={d.value} value={String(d.value)}>
                                        {d.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name={`horarios.${index}.horaInicio`}
                            render={({ field }) => (
                              <SelectorHora
                                value={field.value}
                                onChange={(inicio) => {
                                  field.onChange(inicio)
                                  // Un fin que ya no encaja con el nuevo inicio se borra.
                                  const fin = form.getValues(`horarios.${index}.horaFin`)
                                  const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
                                  const duracion = fin ? minutos(fin) - minutos(inicio) : 0
                                  if (fin && (duracion <= 0 || (minutosBloque != null && duracion % minutosBloque !== 0))) {
                                    form.setValue(`horarios.${index}.horaFin`, "")
                                  }
                                }}
                                min={turno ? horaCorta(turno.horaEntrada) : null}
                                max={turno ? horaCorta(turno.horaSalida) : null}
                                invalido={!!error?.horaInicio}
                                ariaLabel="Hora de inicio"
                                // No se empieza una clase dentro del recreo de ese día.
                                deshabilitada={(hora) => recreosDelDia(dia).some((r) => hora >= r.inicio && hora < r.fin)}
                              />
                            )}
                          />
                          <Controller
                            control={form.control}
                            name={`horarios.${index}.horaFin`}
                            render={({ field }) => (
                              <SelectorHora
                                value={field.value}
                                onChange={field.onChange}
                                min={turno ? horaCorta(turno.horaEntrada) : null}
                                max={turno ? horaCorta(turno.horaSalida) : null}
                                invalido={!!error?.horaFin}
                                ariaLabel="Hora de fin"
                                // Ni se termina una clase que atraviesa el recreo.
                                deshabilitada={(hora) => {
                                  const inicio = horarios[index]?.horaInicio
                                  return !!inicio && recreosDelDia(dia).some((r) => inicio < r.fin && r.inicio < hora)
                                }}
                                // Con hora académica: bloques completos desde el inicio.
                                {...(minutosBloque ? { bloquesDesde: horarios[index]?.horaInicio || null, minutosBloque } : {})}
                              />
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={horariosArray.fields.length === 1}
                            onClick={() => horariosArray.remove(index)}
                            aria-label={`Quitar horario ${index + 1}`}
                          >
                            <X />
                          </Button>
                        </div>
                        {seccion && !sinRecreo && dia && diasSinRecreo.has(dia) && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {grado?.nombre} no tiene recreo el {nombreDia(dia).toLowerCase()}: configúralo antes de poner clases ese día.
                          </p>
                        )}
                        <FieldError errors={[error?.idAula, error?.horaInicio, error?.horaFin]} />
                      </div>
                    )
                  })}
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => horariosArray.append(horarioVacio)}>
                    <Plus data-icon="inline-start" />
                    Agregar horario
                  </Button>
                  <FieldError errors={[errores.horarios?.root ?? (Array.isArray(errores.horarios) ? undefined : errores.horarios)]} />
                </div>
              </FieldContent>
            </Field>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {!esEdicion && (
              <Button
                type="button"
                variant="outline"
                disabled={enviando || bloqueado}
                onClick={form.handleSubmit((v) => guardar(v, true))}
              >
                Guardar y asignar otro curso
              </Button>
            )}
            <Button type="submit" variant="brand" disabled={enviando || bloqueado}>
              {esEdicion ? "Guardar cambios" : "Guardar"}
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
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-[18px] font-semibold tracking-tight">Horas de clase por docente</h2>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Resumen de carga horaria semanal y mensual.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={idDocente ? String(idDocente) : ""}
              onValueChange={(v) => setIdDocente(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {docentes.find((d) => d.idDocente === idDocente)?.nombre
                    ? `${docentes.find((d) => d.idDocente === idDocente)?.nombre} ${docentes.find((d) => d.idDocente === idDocente)?.apellidoPat}`
                    : "Selecciona un docente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {docentes.map((d) => (
                    <SelectItem key={d.idDocente} value={String(d.idDocente)}>
                      {d.nombre} {d.apellidoPat} {d.apellidoMat}
                    </SelectItem>
                  ))}
                </SelectGroup>
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
