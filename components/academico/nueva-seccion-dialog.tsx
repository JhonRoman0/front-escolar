"use client"

import { useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  useAniosEscolares,
  useCrearSeccionesLote,
  useGrados,
} from "@/hooks/use-academico"
import type { GradoResponse, NivelResponse, TurnoResponse } from "@/lib/api/academico"
import {
  crearSeccionSchema,
  duplicadosDeSeccion,
  type SeccionValues,
} from "@/lib/schemas/academico"

interface NuevaSeccionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  niveles: NivelResponse[]
  turnos: TurnoResponse[]
  turnoPorDefecto: TurnoResponse | null
}

/**
 * Letras que el grado ya tiene en ese turno y ese anio, que es la combinacion
 * contra la que el backend rechaza un duplicado. Sale del propio listado de
 * grados que ya carga la pantalla, asi que no hace falta un request extra.
 */
function letrasExistentes(
  grados: GradoResponse[],
  idGrado: number,
  idTurno: number,
  idAnio: number,
): string[] {
  const grado = grados.find((g) => g.idGrado === idGrado)
  if (!grado) return []
  return grado.secciones
    .filter((s) => s.nombre && s.idTurno === idTurno && s.idAnio === idAnio)
    .map((s) => s.nombre)
}

/**
 * Alta de varias secciones de una sola vez.
 *
 * Turno, nivel y grado se eligen una vez y todas las secciones colgantes
 * comparten esa combinacion y el anio vigente. Antes el formulario aceptaba una
 * sola letra por envio, asi que escribir A, B y C era elegir el mismo trio tres
 * veces.
 */
export function NuevaSeccionDialog({
  open,
  onOpenChange,
  niveles,
  turnos,
  turnoPorDefecto,
}: NuevaSeccionDialogProps) {
  // Se cargan todos los grados y el nivel filtra en memoria, en vez de pedir
  // /grados?idNivel= cada vez que cambia el select: la pantalla de arriba ya
  // tiene esta lista en cache, asi que no sale ningun request extra y cambiar de
  // nivel no muestra un spinnner. Tambien deja elegir un grado que todavia no
  // tiene secciones, que es justo el caso de "le quiero crear la primera".
  const { data: grados = [] } = useGrados()
  const { data: anios = [] } = useAniosEscolares()
  const crearLote = useCrearSeccionesLote()

  const anioVigente = anios.find((a) => a.estado === 1) ?? null
  const idAnioVigente = anioVigente?.idAnio ?? 0

  const form = useForm<SeccionValues>({
    /*
     * El resolver se arma en cada render y usa los valores que estan siendo
     * validados, no los del ultimo render: asi el filtro de duplicados siempre
     * corresponde a la combinacion que el usuario esta viendo. React Hook Form
     * copia las opciones del form en cada render, asi que el schema se refresca
     * solo cuando la lista de grados se actualiza.
     */
    resolver: (values, context, options) =>
      zodResolver(
        crearSeccionSchema(
          letrasExistentes(grados, values.idGrado, values.idTurno, idAnioVigente),
        ),
      )(values, context, options),
    defaultValues: {
      idTurno: turnoPorDefecto?.idTurno ?? 0,
      idNivel: 0,
      idGrado: 0,
      secciones: [""],
    },
  })

  const idNivel = useWatch({ control: form.control, name: "idNivel" })
  const idGrado = useWatch({ control: form.control, name: "idGrado" })
  const idTurno = useWatch({ control: form.control, name: "idTurno" })
  const secciones = useWatch({ control: form.control, name: "secciones" })
  const gradosNivel = idNivel ? grados.filter((g) => g.idNivel === idNivel) : []

  /*
   * Las secciones cuelgan de la combinacion turno + nivel + grado, asi que sin
   * ella todavia no se puede validar contra las que ya existen (letrasExistentes
   * devuelve vacio sin grado) y la letra no significa nada. Es la misma regla que
   * ya aplicaba el boton de guardar, asi que vive en una sola constante para que
   * el input y el boton no se puedan desalinear. El select de grado no la usa: el
   * depende solo de nivel, que es una regla mas estrecha.
   */
  const faltaDestino = !idTurno || !idNivel || !idGrado

  /*
   * Los choques se calculan en cada render en vez de:setError al escribir. Asi el
   * error desaparece solo cuando el usuario corrige, y borrar una fila del medio
   * no deja el mensaje pegado en el indice equivocado, porque siempre se recalcula
   * desde los valores actuales. Es la misma comprobacion que hace el resolver al
   * enviar, solo que sin esperar al "Crear secciones".
   */
  const conflictos = useMemo(
    () =>
      duplicadosDeSeccion(
        secciones,
        letrasExistentes(grados, idGrado, idTurno, idAnioVigente),
      ),
    [secciones, grados, idGrado, idTurno, idAnioVigente],
  )

  // El dialogo se renderiza siempre y solo cambia `open`, asi que useForm
  // conserva los valores entre aperturas. Resetear al abrir deja el formulario
  // limpio, con un solo input de seccion y el turno que ya estaba activo.
  useEffect(() => {
    if (!open) return
    form.reset({
      idTurno: turnoPorDefecto?.idTurno ?? 0,
      idNivel: 0,
      idGrado: 0,
      secciones: [""],
    })
  }, [open, turnoPorDefecto, form])

  /*
   * En `errors.secciones` conviven dos cosas: un error por indice, cuando la
   * letra concreta es la invalida, y un error del array en general. Se separan
   * porque el primero va bajo su input y el otro no tiene input al que colgarse.
   */
  const erroresSecciones = form.formState.errors.secciones
  const porIndice = Array.isArray(erroresSecciones)
    ? (erroresSecciones as { message?: string }[])
    : undefined
  const errorGeneral = Array.isArray(erroresSecciones) ? undefined : erroresSecciones

  async function onSubmit(values: SeccionValues) {
    const nombres = values.secciones
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)

    if (!nombres.length) return

    try {
      await crearLote.mutateAsync({
        idGrado: values.idGrado,
        idTurno: values.idTurno,
        nombres,
      })
      const detalle = nombres.join(", ")
      toast.success(
        nombres.length === 1
          ? `Sección ${detalle} creada`
          : `Secciones ${detalle} creadas`,
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear las secciones",
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Nueva sección
          </DialogTitle>
          <DialogDescription>
            Elige turno, nivel y grado una sola vez y agrega todas las secciones
            que los comparten. Se crean en el año escolar vigente
            {anioVigente ? ` ${anioVigente.anio}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <FieldSet>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="idTurno"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Turno</FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {turnos.find((t) => t.idTurno === field.value)?.nombre ??
                                "Selecciona"}
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
                        <FieldError errors={[form.formState.errors.idTurno]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="idNivel"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Nivel</FieldLabel>
                      <FieldContent>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => {
                            field.onChange(Number(v))
                            // El grado cuelga del nivel, asi que cambiar de nivel
                            // lo deja sin dato y hay que elegirlo de nuevo.
                            form.setValue("idGrado", 0)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {niveles.find((n) => n.idNivel === field.value)?.nombre ??
                                "Selecciona"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {niveles.map((n) => (
                                <SelectItem key={n.idNivel} value={String(n.idNivel)}>
                                  {n.nombre}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError errors={[form.formState.errors.idNivel]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            <Controller
              control={form.control}
              name="idGrado"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Grado</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!idNivel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {gradosNivel.find((g) => g.idGrado === field.value)?.nombre ??
                            "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {gradosNivel.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Ese nivel todavía no tiene grados
                          </div>
                        ) : (
                          <SelectGroup>
                            {gradosNivel.map((g) => (
                              <SelectItem key={g.idGrado} value={String(g.idGrado)}>
                                {g.nombre}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idGrado]} />
                  </FieldContent>
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Secciones</FieldLabel>
              <FieldContent>
                <div className="flex flex-col gap-2">
                {/*
                  El array se recorre a mano en vez de con useFieldArray: los
                  tipos de ruta de un field array de React Hook Form se infieren
                  del tipo que devuelve zod, y con estos schemas esa inferencia
                  revienta ("excesivamente profunda"). El error por indice sigue
                  llegando igual, porque lo arma el resolver y no el campo.
                */}
                <Controller
                  control={form.control}
                  name="secciones"
                  render={({ field }) => (
                    <>
                      {field.value.map((seccion, i) => {
                        // El texto del error se pinta aparte, pero el borde rojo
                        // del input solo sale por `aria-invalid`, asi que se marca
                        // aqui para que se vea cual de los inputs es el malo.
                        const invalido = conflictos.has(i) || Boolean(porIndice?.[i])
                        return (
                        <div key={i} className="flex items-start gap-2">
                          <Field className="flex-1">
                            <Input
                              placeholder="A"
                              maxLength={1}
                              autoFocus={i === 0}
                              aria-label={`Sección ${i + 1}`}
                              aria-invalid={invalido}
                              disabled={faltaDestino}
                              value={seccion}
                              onChange={(e) => {
                                // Una sola letra y en mayuscula: es como se
                                // rotulan las secciones en todos los listados.
                                const bruto = e.target.value.toUpperCase()
                                const valor = /^[A-Z]?$/.test(bruto) ? bruto : ""
                                const siguiente = [...field.value]
                                siguiente[i] = valor
                                field.onChange(siguiente)
                              }}
                            />
                            <FieldError
                              errors={[
                                ...(conflictos.has(i)
                                  ? [{ message: conflictos.get(i) }]
                                  : porIndice?.[i]
                                    ? [porIndice[i]]
                                    : []),
                              ]}
                            />
                          </Field>
                          {/*
                            El primer input no lleva X a proposito: es el unico
                            que garantiza que quede al menos una seccion. Si se
                            pudiera quitar, el formulario quedaria sin nada que
                            enviar.
                          */}
                          {i > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                field.onChange(field.value.filter((_, j) => j !== i))
                              }
                              aria-label={`Quitar sección ${i + 1}`}
                              title={`Quitar sección ${i + 1}`}
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                        )
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={() => field.onChange([...field.value, ""])}
                        disabled={faltaDestino}
                      >
                        <Plus data-icon="inline-start" />
                        Agregar otra sección
                      </Button>
                    </>
                  )}
                />
              </div>
                <FieldError errors={errorGeneral ? [errorGeneral] : []} />
                <FieldDescription className="text-xs">
                  {faltaDestino
                    ? "Elige turno, nivel y grado para agregar las secciones."
                    : "Una letra por sección (A, B, C, ...). La primera no se puede quitar, siempre queda al menos una."}
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <BotonGuardar
              etiqueta="Crear secciones"
              enviando={crearLote.isPending}
              disabled={faltaDestino}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}