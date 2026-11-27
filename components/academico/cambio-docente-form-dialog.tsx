"use client"

import { SelectorDocente } from "./selector-docente"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Check } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { ETIQUETA_TIPO_CAMBIO } from "@/components/academico/cambios-docente-constantes"
import {
  useActualizarCambioDocente,
  useAsignacionesParaCambio,
  useCrearCambioDocente,
  useDocentes,
  useMotivosCambioDocente,
} from "@/hooks/use-academico"
import {
  ACCESO,
  DIAS_CLASE,
  horaCorta,
  type AsignacionResponse,
  type CambioDocenteRequest,
  type CambioDocenteResponse,
  type HorarioResponse,
} from "@/lib/api/academico"
import { fechaHoyISO } from "@/lib/fechas"
import {
  cambioDocenteSchema,
  TIPO_CAMBIO_DOCENTE,
  type CambioDocenteValues,
  type TipoCambioDocente,
} from "@/lib/schemas/academico"

export type ModoCambioDocente = "crear" | "editar-programado" | "editar-vigente"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  modo: ModoCambioDocente
  cambio?: CambioDocenteResponse | null
}

function valoresIniciales(cambio?: CambioDocenteResponse | null): CambioDocenteValues {
  return {
    tipo: cambio?.tipo ?? TIPO_CAMBIO_DOCENTE.TEMPORAL,
    fechaInicio: cambio?.fechaInicio ?? fechaHoyISO(),
    fechaFin: cambio?.fechaFin ?? "",
    idMotivo: cambio?.idMotivo ?? 0,
    motivoDetalle: cambio?.motivoDetalle ?? "",
    idsAsignacion: cambio?.detalles.map((detalle) => detalle.idAsignacion) ?? [],
    idDocenteSustituto: cambio?.idDocenteNuevo ?? 0,
  }
}

function diaTexto(diaSemana: number): string {
  return DIAS_CLASE.find((dia) => dia.value === diaSemana)?.label ?? `Día ${diaSemana}`
}

function horariosOrdenados(horarios: HorarioResponse[]): HorarioResponse[] {
  return [...horarios].sort(
    (a, b) => a.diaSemana - b.diaSemana || horaCorta(a.horaInicio).localeCompare(horaCorta(b.horaInicio))
  )
}

function horarioValido(horario: HorarioResponse): boolean {
  return Number.isInteger(horario.diaSemana) && !!horario.horaInicio && !!horario.horaFin
}

function seSolapan(a: HorarioResponse, b: HorarioResponse): boolean {
  if (a.diaSemana !== b.diaSemana) return false
  const inicioA = horaCorta(a.horaInicio)
  const finA = horaCorta(a.horaFin)
  const inicioB = horaCorta(b.horaInicio)
  const finB = horaCorta(b.horaFin)
  return inicioA < finB && inicioB < finA
}

type HorarioAsignacion = HorarioResponse & {
  curso: string
  grado: string
  seccion: string
}

function horariosDe(asignaciones: AsignacionResponse[]): HorarioAsignacion[] {
  return asignaciones.flatMap((asignacion) =>
    (asignacion.horarios ?? [])
      .filter(horarioValido)
      .map((horario) => ({
        ...horario,
        curso: asignacion.curso,
        grado: asignacion.grado,
        seccion: asignacion.seccion,
      }))
  )
}

function descripcionAsignacion(horario: HorarioAsignacion): string {
  return `${horario.curso} · ${horario.grado} ${horario.seccion}`
}

function textoHorario(horario: HorarioAsignacion): string {
  return `${diaTexto(horario.diaSemana)} de ${horaCorta(horario.horaInicio)} a ${horaCorta(horario.horaFin)}`
}

function cruceEntreSeleccionadas(
  horarios: HorarioAsignacion[]
): [HorarioAsignacion, HorarioAsignacion] | null {
  for (let i = 0; i < horarios.length; i++) {
    for (let j = i + 1; j < horarios.length; j++) {
      if (seSolapan(horarios[i], horarios[j])) return [horarios[i], horarios[j]]
    }
  }
  return null
}

function FilaAsignacion({
  asignacion,
  seleccionada,
  onSeleccionar,
}: {
  asignacion: AsignacionResponse
  seleccionada?: boolean
  onSeleccionar?: (seleccionada: boolean) => void
}) {
  const horarios = horariosOrdenados(asignacion.horarios ?? [])
  return (
    <label className="flex items-start gap-2 rounded-md border p-2 text-sm">
      {onSeleccionar && (
        <Checkbox
          className="mt-0.5"
          checked={!!seleccionada}
          onCheckedChange={(valor) => onSeleccionar(!!valor)}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {asignacion.curso} · {asignacion.grado} {asignacion.seccion}
        </div>
        {horarios.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {horarios.map((horario) => (
              <span key={horario.idHorario} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {diaTexto(horario.diaSemana)} {horaCorta(horario.horaInicio)}–{horaCorta(horario.horaFin)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Sin horarios registrados</p>
        )}
      </div>
    </label>
  )
}

export default function CambioDocenteFormDialog({
  open,
  onOpenChange,
  modo,
  cambio,
}: Props) {
  const esVigente = modo === "editar-vigente"
  const [idTitular, setIdTitular] = useState<number | null>(
    cambio?.idDocenteAnterior ?? null
  )
  const crear = useCrearCambioDocente()
  const actualizar = useActualizarCambioDocente()
  const { data: docentes = [] } = useDocentes(!esVigente)
  const opcionesDocentes = docentes.map(d => ({ id: d.idDocente, nombre: [d.nombre, d.apellidoPat, d.apellidoMat].filter(Boolean).join(" ") }))
  const { data: motivos = [], isLoading: cargandoMotivos } = useMotivosCambioDocente()
  const { data: asignacionesTitular = [], isSuccess: titularCargado } = useAsignacionesParaCambio(esVigente ? null : idTitular)

  const form = useForm<CambioDocenteValues>({
    resolver: esVigente ? undefined : zodResolver(cambioDocenteSchema),
    defaultValues: valoresIniciales(cambio),
  })
  const tipo = useWatch({ control: form.control, name: "tipo" })
  const idsAsignacion = useWatch({ control: form.control, name: "idsAsignacion" }) ?? []
  const idDocenteSustituto = useWatch({ control: form.control, name: "idDocenteSustituto" }) ?? 0

  const { data: asignacionesSustituto = [], isSuccess: sustitutoCargado } = useAsignacionesParaCambio(esVigente ? null : idDocenteSustituto || null)

  const activasTitular = asignacionesTitular.filter(
    (asignacion) => asignacion.accesoId === ACCESO.ACTIVO
  )
  const activasSustituto = asignacionesSustituto.filter(
    (asignacion) => asignacion.accesoId === ACCESO.ACTIVO
  )
  const motivosDisponibles = motivos.filter(
    (motivo) =>
      motivo.activo &&
      (tipo === TIPO_CAMBIO_DOCENTE.TEMPORAL ? motivo.aplicaTemporal : motivo.aplicaDefinitivo)
  )
  const todasSeleccionadas =
    activasTitular.length > 0 && activasTitular.every((a) => idsAsignacion.includes(a.idAsignacion))

  const seleccionadas = activasTitular.filter((asignacion) => idsAsignacion.includes(asignacion.idAsignacion))
  const horariosSeleccionados = horariosDe(seleccionadas)
  const horariosSustituto = horariosDe(activasSustituto)
  const evaluarCruces =
    !esVigente && !!idTitular && idsAsignacion.length > 0 && !!idDocenteSustituto
  const datosCompletos =
    evaluarCruces && titularCargado && sustitutoCargado && seleccionadas.length === idsAsignacion.length
    && seleccionadas.every(asignacion => horariosDe([asignacion]).length > 0)
    && activasSustituto.every(asignacion => horariosDe([asignacion]).length > 0)
  const cruceConSustituto = datosCompletos
    ? horariosSeleccionados.find((horario) =>
        horariosSustituto.some((otro) => seSolapan(horario, otro))
      )
    : undefined
  const parCruzado = datosCompletos ? cruceEntreSeleccionadas(horariosSeleccionados) : null
  const cruceEntreAsignaciones = parCruzado?.[1]
  const avisos: { texto: string; problema: boolean }[] = []

  if (evaluarCruces && !datosCompletos) {
    avisos.push({
      texto:
        "Validando disponibilidad: completa las asignaciones del titular y del sustituto con su curso, grado, sección, día y horario para comprobar los cruces.",
      problema: false,
    })
  } else if (datosCompletos) {
    if (cruceConSustituto) {
      const otro = horariosSustituto.find((horario) => seSolapan(cruceConSustituto, horario))!
      avisos.push({
        texto: `El sustituto ya tiene ${descripcionAsignacion(otro)} ${textoHorario(otro)}, y la asignación seleccionada ${descripcionAsignacion(cruceConSustituto)} tiene clase ${textoHorario(cruceConSustituto)}. Elige otro sustituto o quita esa asignación.`,
        problema: true,
      })
    }
    if (cruceEntreAsignaciones && parCruzado) {
      avisos.push({
        texto: `Las asignaciones seleccionadas ${descripcionAsignacion(parCruzado[0])} ${textoHorario(parCruzado[0])} y ${descripcionAsignacion(cruceEntreAsignaciones)} ${textoHorario(cruceEntreAsignaciones)} se cruzan. Quita una de las dos.`,
        problema: true,
      })
    }
    if (!cruceConSustituto && !cruceEntreAsignaciones) {
      avisos.push({
        texto:
          "Sin cruces detectados: las asignaciones seleccionadas no se cruzan entre sí ni con las clases del sustituto.",
        problema: false,
      })
    }
  }

  function cerrar() {
    form.reset(valoresIniciales(cambio))
    setIdTitular(cambio?.idDocenteAnterior ?? null)
    onOpenChange(false)
  }

  async function guardar(values: CambioDocenteValues) {
    if (!cambio && modo !== "crear") return
    const data: CambioDocenteRequest = {
      tipo: values.tipo,
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin || null,
      idMotivo: values.idMotivo,
      motivoDetalle: values.motivoDetalle || null,
      idsAsignacion: values.idsAsignacion,
      idDocenteSustituto: values.idDocenteSustituto,
    }
    try {
      if (modo === "crear") {
        await crear.mutateAsync(data)
      } else {
        await actualizar.mutateAsync({ id: cambio!.idCambio, data, vigente: esVigente })
      }
      toast.success(
        modo === "crear" ? "Cambio de docente registrado" : "Cambio de docente actualizado"
      )
      cerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cambio")
    }
  }

  const titulo =
    modo === "crear"
      ? "Nuevo cambio de docente"
      : esVigente
        ? "Editar cambio vigente"
        : "Editar cambio programado"
  const pendiente = crear.isPending || actualizar.isPending

  return (
    <Dialog open={open} onOpenChange={(siguiente) => !siguiente && cerrar()}>
      <DialogContent size="2xl" scroll="sticky">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(guardar)} className="flex min-h-0 flex-col gap-4" noValidate>
          <DialogBody className="space-y-5 pb-6">
            {esVigente && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Solo puedes editar el motivo, la fecha de fin y las observaciones.
              </p>
            )}

            <FieldGroup columnas={2}>
              {!esVigente && (
                <Controller
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Tipo</FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value}
                          onValueChange={(valor) => {
                            const siguiente = valor as TipoCambioDocente
                            field.onChange(siguiente)
                            form.setValue("idMotivo", 0)
                            if (siguiente === TIPO_CAMBIO_DOCENTE.DEFINITIVO) {
                              form.setValue("fechaFin", "")
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>{ETIQUETA_TIPO_CAMBIO[field.value]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {Object.values(TIPO_CAMBIO_DOCENTE).map((valor) => (
                                <SelectItem key={valor} value={valor}>
                                  {ETIQUETA_TIPO_CAMBIO[valor]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[form.formState.errors.tipo]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              )}
              <Controller
                control={form.control}
                name="idMotivo"
                render={({ field }) => {
                  const motivoSeleccionado = motivos.find(
                    (motivo) => motivo.idMotivoCambioDocente === field.value
                  )
                  const nombreMotivoSeleccionado =
                    motivoSeleccionado?.nombre ??
                    (field.value === cambio?.idMotivo ? cambio?.motivo : undefined)

                  return (
                    <Field>
                      <FieldLabel>Motivo</FieldLabel>
                      <FieldContent>
                        {cargandoMotivos ? (
                          <p className="text-sm text-muted-foreground">Cargando motivos…</p>
                        ) : !motivosDisponibles.length && !nombreMotivoSeleccionado ? (
                          <p className="text-sm text-muted-foreground">
                            No hay motivos configurados para este tipo. Configúralos en el apartado Motivos.
                          </p>
                        ) : (
                          <Select
                            value={field.value ? String(field.value) : null}
                            onValueChange={(valor) => field.onChange(Number(valor))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {nombreMotivoSeleccionado ?? "Selecciona un motivo"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {motivosDisponibles.map((motivo) => (
                                  <SelectItem
                                    key={motivo.idMotivoCambioDocente}
                                    value={String(motivo.idMotivoCambioDocente)}
                                  >
                                    {motivo.nombre}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                        <FieldError errors={[form.formState.errors.idMotivo]} />
                      </FieldContent>
                    </Field>
                  )
                }}
              />
              {!esVigente && (
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
              )}
              {tipo === TIPO_CAMBIO_DOCENTE.TEMPORAL && (
                <Controller
                  control={form.control}
                  name="fechaFin"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Fecha de fin (opcional)</FieldLabel>
                      <FieldContent>
                        <Input type="date" value={field.value ?? ""} onChange={field.onChange} />
                        <FieldError errors={[form.formState.errors.fechaFin]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              )}
            </FieldGroup>

            {!esVigente && (
              <>
                <Field>
                  <FieldLabel>Docente titular</FieldLabel>
                  <FieldContent>
                    <SelectorDocente
                      docentes={opcionesDocentes}
                      valor={idTitular}
                      etiqueta="Docente titular"
                      onChange={(id) => {
                        setIdTitular(id)
                        form.setValue("idsAsignacion", [])
                        if (id === idDocenteSustituto) form.setValue("idDocenteSustituto", 0)
                      }}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Asignaciones del titular</FieldLabel>
                  <FieldContent>
                    {!idTitular ? (
                      <p className="text-sm text-muted-foreground">Selecciona primero al docente titular.</p>
                    ) : !activasTitular.length ? (
                      <p className="text-sm text-muted-foreground">
                        Este docente no tiene asignaciones activas del año vigente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Año {activasTitular[0].anio}</p>
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox
                            checked={todasSeleccionadas}
                            onCheckedChange={(valor) =>
                              form.setValue(
                                "idsAsignacion",
                                valor ? activasTitular.map((a) => a.idAsignacion) : []
                              )
                            }
                          />
                          Seleccionar todas
                        </label>
                        <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border p-2">
                          {activasTitular.map((asignacion) => (
                            <FilaAsignacion
                              key={asignacion.idAsignacion}
                              asignacion={asignacion}
                              seleccionada={idsAsignacion.includes(asignacion.idAsignacion)}
                              onSeleccionar={(seleccionada) =>
                                form.setValue(
                                  "idsAsignacion",
                                  seleccionada
                                    ? [...idsAsignacion, asignacion.idAsignacion]
                                    : idsAsignacion.filter((id) => id !== asignacion.idAsignacion)
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <FieldError errors={[form.formState.errors.idsAsignacion]} />
                  </FieldContent>
                </Field>

                <Controller
                  control={form.control}
                  name="idDocenteSustituto"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Docente sustituto (obligatorio)</FieldLabel>
                      <FieldContent>
                        <SelectorDocente
                          docentes={opcionesDocentes.filter((docente) => docente.id !== idTitular)}
                          valor={field.value}
                          etiqueta="Docente sustituto"
                          onChange={(id) => field.onChange(id ?? 0)}
                        />
                        <FieldError errors={[form.formState.errors.idDocenteSustituto]} />
                      </FieldContent>
                    </Field>
                  )}
                />

                <Field>
                  <FieldLabel>Asignaciones del sustituto (informativas)</FieldLabel>
                  <FieldContent>
                    {!idDocenteSustituto ? (
                      <p className="text-sm text-muted-foreground">Selecciona primero al docente sustituto.</p>
                    ) : !activasSustituto.length ? (
                      <p className="text-sm text-muted-foreground">
                        El docente sustituto no tiene asignaciones activas del año vigente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Año {activasSustituto[0].anio}</p>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                          {activasSustituto.map((asignacion) => (
                            <FilaAsignacion key={asignacion.idAsignacion} asignacion={asignacion} />
                          ))}
                        </div>
                      </div>
                    )}
                  </FieldContent>
                </Field>

                {avisos.map((aviso, indice) => (
                  <div
                    key={indice}
                    className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                      aviso.problema
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {aviso.problema ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <Check className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>{aviso.texto}</span>
                  </div>
                ))}
              </>
            )}

            <Controller
              control={form.control}
              name="motivoDetalle"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Observaciones (opcional)</FieldLabel>
                  <FieldContent>
                    <Input {...field} placeholder="Observaciones adicionales del cambio" />
                    <FieldError errors={[form.formState.errors.motivoDetalle]} />
                  </FieldContent>
                </Field>
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <BotonGuardar
              etiqueta={modo === "crear" ? "Registrar cambio" : "Guardar cambios"}
              enviando={pendiente}
              disabled={!motivosDisponibles.length}
              size="sm"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
