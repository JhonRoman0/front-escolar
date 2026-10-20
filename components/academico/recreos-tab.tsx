"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Lock, Plus, Trash2, X } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import * as z from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { SelectorHora } from "@/components/shared/selector-hora"
import { FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { FiltrosMalla, useFiltrosMalla } from "@/components/academico/cursos-tab"
import { guardarConToast } from "@/hooks/guardar-con-toast"
import {
  useActualizarRecreo,
  useCrearRecreos,
  useEliminarRecreo,
  useEliminarRecreosDelGrado,
  useGradosDelAnio,
  useRecreos,
  useTurnos,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import {
  ACCESO,
  DIAS_CLASE,
  ESTADO_ANIO,
  horaCorta,
  type AnioEscolarResponse,
  type NivelResponse,
  type RecreoResponse,
  type TurnoResponse,
} from "@/lib/api/academico"

const LUNES_A_VIERNES = [1, 2, 3, 4, 5]
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const franjaSchema = z
  .object({
    horaInicio: z.string().regex(HORA, "Elige la hora de inicio"),
    horaFin: z.string().regex(HORA, "Elige la hora de fin"),
  })
  .refine((f) => f.horaFin > f.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  })

const recreoSchema = z
  .object({
    idTurno: z.number({ error: "Selecciona el turno" }).int().min(1, "Selecciona el turno"),
    idGrados: z.array(z.number()).min(1, "Selecciona al menos un grado"),
    dias: z.array(z.number()).min(1, "Selecciona al menos un día"),
    franjas: z.array(franjaSchema).min(1, "Agrega al menos un recreo"),
  })
  .superRefine((valores, ctx) => {
    valores.franjas.forEach((a, i) => {
      valores.franjas.slice(0, i).forEach((b) => {
        if (a.horaInicio < b.horaFin && b.horaInicio < a.horaFin) {
          ctx.addIssue({ code: "custom", path: ["franjas", i, "horaInicio"], message: "Se cruza con otro recreo" })
        }
      })
    })
  })
type RecreoValues = z.infer<typeof recreoSchema>

function rango(r: { horaInicio: string; horaFin: string }) {
  return `${horaCorta(r.horaInicio)}–${horaCorta(r.horaFin)}`
}

export default function RecreosTab() {
  const filtros = useFiltrosMalla()
  const { anio, idAnio, idNivel, nivel } = filtros
  const { data: turnos = [] } = useTurnos()
  const turnosActivos = turnos.filter((t) => (t.accesoId ?? ACCESO.ACTIVO) === ACCESO.ACTIVO)
  const [idTurnoFiltro, setIdTurnoFiltro] = useState("")
  const { data: recreos = [], isLoading, isError, refetch } = useRecreos({ idAnio, idNivel })

  const puedeCrear = usePuede("RECREOS", "CREAR")
  const puedeActualizar = usePuede("RECREOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("RECREOS", "ELIMINAR")
  const eliminarDelGrado = useEliminarRecreosDelGrado()

  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [editando, setEditando] = useState<RecreoResponse | null>(null)

  // Por comenzar: todo. Vigente: solo la configuración inicial de cada grado.
  const editable = anio?.estado === ESTADO_ANIO.POR_COMENZAR
  const creable = !!anio && anio.estado !== ESTADO_ANIO.CERRADO

  // Una fila por grado y turno, con sus recreos repartidos por día.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { idGrado: number; grado: string; idTurno: number; turno: string; recreos: RecreoResponse[] }>()
    for (const r of recreos) {
      if (idTurnoFiltro && String(r.idTurno) !== idTurnoFiltro) continue
      const clave = `${r.idTurno}-${r.idGrado}`
      const grupo = mapa.get(clave) ?? { idGrado: r.idGrado, grado: r.grado, idTurno: r.idTurno, turno: r.turno, recreos: [] }
      grupo.recreos.push(r)
      mapa.set(clave, grupo)
    }
    return [...mapa.values()]
  }, [recreos, idTurnoFiltro])

  const columnas = DIAS_CLASE.length + 3

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Recreos"
          descripcion="Recreos por grado y turno. Aplican a todas las secciones del grado y son obligatorios cada día con clases."
          acciones={
            <BotonNuevo texto="Nuevo recreo" puedeCrear={puedeCrear && creable} onClick={() => setNuevoOpen(true)} />
          }
        />

        {anio && !editable && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
            <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              {anio.estado === ESTADO_ANIO.VIGENTE
                ? `El año ${anio.anio} está vigente: sus recreos ya no se editan ni se eliminan. Solo puedes configurar los grados que aún no tienen recreo.`
                : `El año ${anio.anio} está cerrado: sus recreos son de solo lectura.`}
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
          <FilterSelect
            label="Turno"
            value={idTurnoFiltro}
            onValueChange={setIdTurnoFiltro}
            options={turnosActivos.map((t) => ({ value: String(t.idTurno), label: t.nombre }))}
            allLabel="Todos"
            className="w-[170px]"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grado</TableHead>
                <TableHead>Turno</TableHead>
                {DIAS_CLASE.map((d) => (
                  <TableHead key={d.value} className="text-center">{d.corto}</TableHead>
                ))}
                <TableHead className="w-[60px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={columnas} />
              ) : isError ? (
                <MensajeSinDatos columnas={columnas} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !grupos.length ? (
                <MensajeSinDatos
                  columnas={columnas}
                  mensaje={`Aún no hay recreos de ${nivel?.nombre ?? "este nivel"} en el año ${anio?.anio ?? ""}.`}
                />
              ) : (
                grupos.map((g) => (
                  <TableRow key={`${g.idTurno}-${g.idGrado}`}>
                    <TableCell className="font-medium">{g.grado}</TableCell>
                    <TableCell>{g.turno}</TableCell>
                    {DIAS_CLASE.map((d) => {
                      const delDia = g.recreos.filter((r) => r.diaSemana === d.value)
                      return (
                        <TableCell key={d.value} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {delDia.length ? (
                              delDia.map((r) =>
                                editable && (puedeActualizar || puedeEliminar) ? (
                                  <button
                                    key={r.idRecreo}
                                    type="button"
                                    onClick={() => setEditando(r)}
                                    className="rounded-md border px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted"
                                    aria-label={`Editar recreo del ${d.label} ${rango(r)}`}
                                  >
                                    {rango(r)}
                                  </button>
                                ) : (
                                  <span key={r.idRecreo} className="font-mono text-[11px]">{rango(r)}</span>
                                )
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right">
                      {editable && puedeEliminar && idAnio && (
                        <ConfirmarEliminar
                          titulo={`Quitar los recreos de ${g.grado}`}
                          descripcion={`Se eliminarán todos los recreos de ${g.grado} en el turno ${g.turno}.`}
                          onConfirm={async () => {
                            try {
                              await eliminarDelGrado.mutateAsync({ idAnio, idTurno: g.idTurno, idGrado: g.idGrado })
                              toast.success(`Recreos de ${g.grado} eliminados`)
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Error al eliminar")
                              throw error
                            }
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isError && <BotonReintentar refetch={refetch} />}

        {nuevoOpen && anio && nivel && (
          <NuevoRecreoDialog
            onOpenChange={setNuevoOpen}
            anios={filtros.anios}
            niveles={filtros.niveles}
            anioInicial={anio}
            nivelInicial={nivel}
            turnos={turnosActivos}
          />
        )}

        {editando && (
          <EditarRecreoDialog
            recreo={editando}
            turno={turnos.find((t) => t.idTurno === editando.idTurno)}
            puedeActualizar={puedeActualizar}
            puedeEliminar={puedeEliminar}
            onClose={() => setEditando(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ── Crear ────────────────────────────────────────────────────────────────

function NuevoRecreoDialog({
  onOpenChange,
  anios,
  niveles,
  anioInicial,
  nivelInicial,
  turnos,
}: {
  onOpenChange: (open: boolean) => void
  anios: AnioEscolarResponse[]
  niveles: NivelResponse[]
  /** Arranca con el año y nivel de los filtros, pero se pueden cambiar. */
  anioInicial: AnioEscolarResponse
  nivelInicial: NivelResponse
  turnos: TurnoResponse[]
}) {
  const crear = useCrearRecreos()
  // Un año cerrado no admite recreos; uno vigente, solo los grados sin configurar.
  const aniosElegibles = anios.filter((a) => a.estado !== ESTADO_ANIO.CERRADO)
  const [idAnio, setIdAnio] = useState(anioInicial.idAnio)
  const [idNivel, setIdNivel] = useState(nivelInicial.idNivel)
  const anio = anios.find((a) => a.idAnio === idAnio) ?? anioInicial
  const nivel = niveles.find((n) => n.idNivel === idNivel) ?? nivelInicial
  const { data: grados = [], isLoading: cargandoGrados } = useGradosDelAnio(nivel.idNivel, anio.idAnio)
  // Recreos ya guardados del año y nivel: en un vigente marcan los grados ya configurados.
  const { data: recreosDelAnio = [] } = useRecreos({ idAnio: anio.idAnio, idNivel: nivel.idNivel })
  const form = useForm<RecreoValues>({
    resolver: zodResolver(recreoSchema),
    defaultValues: {
      idTurno: turnos.length === 1 ? turnos[0].idTurno : 0,
      idGrados: [],
      dias: LUNES_A_VIERNES,
      franjas: [{ horaInicio: "", horaFin: "" }],
    },
  })
  const franjas = useFieldArray({ control: form.control, name: "franjas" })
  const idTurno = useWatch({ control: form.control, name: "idTurno" })
  const turno = turnos.find((t) => t.idTurno === idTurno)
  const vigente = anio.estado === ESTADO_ANIO.VIGENTE

  // Solo los grados con alguna sección del año en ese turno.
  const gradosDelTurno = grados.filter((g) =>
    g.secciones.some((s) => s.idTurno === idTurno && s.idAnio === anio.idAnio)
  )
  const yaConfigurados = new Set(
    recreosDelAnio.filter((r) => r.idTurno === idTurno).map((r) => r.idGrado)
  )
  const elegibles = gradosDelTurno.filter((g) => !vigente || !yaConfigurados.has(g.idGrado))

  async function onSubmit(values: RecreoValues) {
    await guardarConToast(async () => {
      const creados = await crear.mutateAsync({
        idAnio: anio.idAnio,
        idNivel: nivel.idNivel,
        idTurno: values.idTurno,
        idGrados: values.idGrados,
        dias: values.dias,
        franjas: values.franjas.map((f) => ({ horaInicio: `${f.horaInicio}:00`, horaFin: `${f.horaFin}:00` })),
      })
      toast.success(`Se crearon ${creados.length} recreos`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Nuevo recreo</DialogTitle>
          <DialogDescription>
            Se crea un recreo por cada grado y día que marques.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Año escolar</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={String(anio.idAnio)}
                  onValueChange={(v) => {
                    if (!v) return
                    setIdAnio(Number(v))
                    // Los grados dependen del año y del nivel.
                    form.setValue("idGrados", [])
                  }}
                  options={aniosElegibles.map((a) => ({
                    value: String(a.idAnio),
                    label: `${a.anio}${a.estado === ESTADO_ANIO.VIGENTE ? " (vigente)" : " (por comenzar)"}`,
                  }))}
                  includeAll={false}
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Nivel</FieldLabel>
              <FieldContent>
                <FilterSelect
                  value={String(nivel.idNivel)}
                  onValueChange={(v) => {
                    if (!v) return
                    setIdNivel(Number(v))
                    form.setValue("idGrados", [])
                  }}
                  options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
                  includeAll={false}
                  className="w-full"
                />
              </FieldContent>
            </Field>
          </div>
          {vigente && (
            <p className="-mt-2 text-xs text-muted-foreground">
              El año {anio.anio} está vigente: solo puedes configurar los grados que aún no tienen recreo.
            </p>
          )}

          <Controller
            control={form.control}
            name="idTurno"
            render={({ field }) => (
              <Field>
                <FieldLabel>Turno</FieldLabel>
                <FieldContent>
                  <FilterSelect
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : 0)
                      // Los grados y las horas dependen del turno.
                      form.setValue("idGrados", [])
                      form.setValue("franjas", [{ horaInicio: "", horaFin: "" }])
                    }}
                    options={turnos.map((t) => ({
                      value: String(t.idTurno),
                      label: `${t.nombre} (${horaCorta(t.horaEntrada)} – ${horaCorta(t.horaSalida)})`,
                    }))}
                    includeAll={false}
                    allLabel="Selecciona el turno"
                    className="w-full"
                  />
                  <FieldError errors={[form.formState.errors.idTurno]} />
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="idGrados"
            render={({ field }) => (
              <Field>
                <FieldLabel>Grados</FieldLabel>
                <FieldContent>
                  {!turno ? (
                    <p className="text-sm text-muted-foreground">Elige el turno para ver sus grados.</p>
                  ) : cargandoGrados ? (
                    <p className="text-sm text-muted-foreground">Cargando grados...</p>
                  ) : !gradosDelTurno.length ? (
                    <p className="text-sm text-muted-foreground">
                      {nivel.nombre} no tiene secciones en el turno {turno.nombre} del año {anio.anio}.
                    </p>
                  ) : (
                    <Casillas
                      todosTexto="Todos los grados"
                      opciones={gradosDelTurno.map((g) => ({
                        value: g.idGrado,
                        label: g.nombre,
                        deshabilitada: !elegibles.includes(g),
                        nota: !elegibles.includes(g) ? "ya configurado" : undefined,
                      }))}
                      todos={elegibles.map((g) => g.idGrado)}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                  <FieldError errors={[form.formState.errors.idGrados]} />
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="dias"
            render={({ field }) => (
              <Field>
                <FieldLabel>Días</FieldLabel>
                <FieldContent>
                  <Casillas
                    todosTexto="Todos los días (lunes a viernes)"
                    opciones={DIAS_CLASE.map((d) => ({ value: d.value, label: d.label }))}
                    todos={LUNES_A_VIERNES}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FieldError errors={[form.formState.errors.dias]} />
                </FieldContent>
              </Field>
            )}
          />

          <Field>
            <FieldLabel>Recreos del día</FieldLabel>
            <FieldContent>
              <div className="flex flex-col gap-2">
                {franjas.fields.map((fila, i) => {
                  const errores = form.formState.errors.franjas?.[i]
                  return (
                    <div key={fila.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Controller
                          control={form.control}
                          name={`franjas.${i}.horaInicio`}
                          render={({ field }) => (
                            <SelectorHora
                              value={field.value}
                              onChange={field.onChange}
                              min={turno ? horaCorta(turno.horaEntrada) : null}
                              max={turno ? horaCorta(turno.horaSalida) : null}
                              invalido={!!errores?.horaInicio}
                              ariaLabel={`Inicio del recreo ${i + 1}`}
                            />
                          )}
                        />
                        <span className="text-muted-foreground">a</span>
                        <Controller
                          control={form.control}
                          name={`franjas.${i}.horaFin`}
                          render={({ field }) => (
                            <SelectorHora
                              value={field.value}
                              onChange={field.onChange}
                              min={turno ? horaCorta(turno.horaEntrada) : null}
                              max={turno ? horaCorta(turno.horaSalida) : null}
                              invalido={!!errores?.horaFin}
                              ariaLabel={`Fin del recreo ${i + 1}`}
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar el recreo ${i + 1}`}
                          disabled={franjas.fields.length === 1}
                          onClick={() => franjas.remove(i)}
                        >
                          <X />
                        </Button>
                      </div>
                      <FieldError errors={[errores?.horaInicio, errores?.horaFin]} />
                    </div>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => franjas.append({ horaInicio: "", horaFin: "" })}
                >
                  <Plus data-icon="inline-start" />
                  Agregar otro recreo
                </Button>
              </div>
              <FieldDescription className="text-xs">
                {turno
                  ? `Solo horas del turno ${turno.nombre}: de ${horaCorta(turno.horaEntrada)} a ${horaCorta(turno.horaSalida)}.`
                  : "Elige el turno para habilitar las horas."}
              </FieldDescription>
            </FieldContent>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <BotonGuardar etiqueta="Crear recreos" enviando={form.formState.isSubmitting} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Casillas con una opción "Todos" que marca o desmarca de un clic. */
function Casillas({
  opciones,
  todos,
  todosTexto,
  value,
  onChange,
}: {
  opciones: { value: number; label: string; deshabilitada?: boolean; nota?: string }[]
  /** Lo que marca "Todos" (por ejemplo lunes a viernes, sin el sábado). */
  todos: number[]
  todosTexto: string
  value: number[]
  onChange: (valores: number[]) => void
}) {
  const marcadosTodos = todos.length > 0 && todos.every((v) => value.includes(v))
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <label className="flex cursor-pointer items-center gap-2 border-b pb-2 text-sm font-medium">
        <Checkbox
          checked={marcadosTodos}
          disabled={!todos.length}
          onCheckedChange={(checked) =>
            onChange(checked ? [...new Set([...value, ...todos])] : value.filter((v) => !todos.includes(v)))
          }
        />
        {todosTexto}
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {opciones.map((o) => (
          <label
            key={o.value}
            className={`flex items-center gap-2 text-sm ${o.deshabilitada ? "text-muted-foreground" : "cursor-pointer"}`}
          >
            <Checkbox
              checked={value.includes(o.value)}
              disabled={o.deshabilitada}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, o.value] : value.filter((v) => v !== o.value))
              }
            />
            <span>
              {o.label}
              {o.nota && <span className="text-xs"> ({o.nota})</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Editar ───────────────────────────────────────────────────────────────

const editarSchema = z
  .object({
    diaSemana: z.number().int().min(1).max(6),
    horaInicio: z.string().regex(HORA, "Elige la hora de inicio"),
    horaFin: z.string().regex(HORA, "Elige la hora de fin"),
  })
  .refine((f) => f.horaFin > f.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  })
type EditarValues = z.infer<typeof editarSchema>

function EditarRecreoDialog({
  recreo,
  turno,
  puedeActualizar,
  puedeEliminar,
  onClose,
}: {
  recreo: RecreoResponse
  turno: TurnoResponse | undefined
  puedeActualizar: boolean
  puedeEliminar: boolean
  onClose: () => void
}) {
  const actualizar = useActualizarRecreo()
  const eliminar = useEliminarRecreo()
  const form = useForm<EditarValues>({
    resolver: zodResolver(editarSchema),
    defaultValues: {
      diaSemana: recreo.diaSemana,
      horaInicio: horaCorta(recreo.horaInicio),
      horaFin: horaCorta(recreo.horaFin),
    },
  })
  const min = turno ? horaCorta(turno.horaEntrada) : null
  const max = turno ? horaCorta(turno.horaSalida) : null

  async function onSubmit(values: EditarValues) {
    await guardarConToast(async () => {
      await actualizar.mutateAsync({
        id: recreo.idRecreo,
        data: { diaSemana: values.diaSemana, horaInicio: `${values.horaInicio}:00`, horaFin: `${values.horaFin}:00` },
      })
      toast.success("Recreo actualizado")
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Recreo de {recreo.grado}</DialogTitle>
          <DialogDescription>
            Turno {recreo.turno} · <Badge variant="outline">{rango(recreo)}</Badge>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="diaSemana"
            render={({ field }) => (
              <Field>
                <FieldLabel>Día</FieldLabel>
                <FieldContent>
                  <FilterSelect
                    value={String(field.value)}
                    onValueChange={(v) => v && field.onChange(Number(v))}
                    options={DIAS_CLASE.map((d) => ({ value: String(d.value), label: d.label }))}
                    includeAll={false}
                    className="w-full"
                  />
                </FieldContent>
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="horaInicio"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Inicio</FieldLabel>
                  <FieldContent>
                    <SelectorHora value={field.value} onChange={field.onChange} min={min} max={max} ariaLabel="Hora de inicio" />
                    <FieldError errors={[form.formState.errors.horaInicio]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="horaFin"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fin</FieldLabel>
                  <FieldContent>
                    <SelectorHora value={field.value} onChange={field.onChange} min={min} max={max} ariaLabel="Hora de fin" />
                    <FieldError errors={[form.formState.errors.horaFin]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
          <DialogFooter className="sm:justify-between">
            {puedeEliminar ? (
              <ConfirmarEliminar
                titulo="Eliminar recreo"
                descripcion={`Se eliminará el recreo de ${recreo.grado} de ${rango(recreo)}.`}
                icono={<Trash2 className="text-destructive" />}
                onConfirm={async () => {
                  try {
                    await eliminar.mutateAsync(recreo.idRecreo)
                    toast.success("Recreo eliminado")
                    onClose()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Error al eliminar")
                    throw error
                  }
                }}
              />
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {puedeActualizar && <BotonGuardar etiqueta="Guardar cambios" enviando={form.formState.isSubmitting} />}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
