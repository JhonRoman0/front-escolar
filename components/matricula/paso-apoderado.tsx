"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Trash2, UserCheck, Users } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { CampoContrasena } from "@/components/shared/campo-contrasena"
import { CampoDni } from "@/components/shared/campo-dni"
import { TarjetaSeccion } from "@/components/shared/tarjeta-seccion"
import { useBuscarApoderadoInscripcion } from "@/hooks/use-matricula"
import { useParentescos, useSexos } from "@/hooks/use-pagos"
import { useConsultarDni } from "@/hooks/use-reniec"
import type { ApoderadoBusqueda } from "@/lib/api/matricula"
import { REGEX_DNI, REGEX_NO_LETRAS_ESPACIOS } from "@/lib/schemas/comun"
import {
  apoderadoPasoDefault,
  apoderadosPasoSchema,
  type ApoderadoPasoValues,
  type ApoderadosPasoValues,
} from "@/lib/schemas/matricula"

/** Convierte lo que devuelve la búsqueda en los valores del formulario. */
export function apoderadoDesdeBusqueda(a: ApoderadoBusqueda): ApoderadoPasoValues {
  return {
    ...apoderadoPasoDefault,
    estado: a.estado,
    documentoIdentidad: a.documentoIdentidad,
    nombre: a.nombre ?? "",
    apellidoPat: a.apellidoPat ?? "",
    apellidoMat: a.apellidoMat ?? "",
    fechaNaci: a.fechaNaci ?? "",
    sexo: a.sexo ?? "",
    direccion: a.direccion ?? "",
    idParentesco: a.idParentesco ?? 0,
    celular: a.celular ?? "",
    gmail: a.gmail ?? "",
    hijos: a.hijos,
  }
}

interface PasoApoderadoProps {
  value: ApoderadoPasoValues[]
  idAlumno: number | null
  validando: boolean
  onAtras: (valores: ApoderadoPasoValues[]) => void
  onSiguiente: (valores: ApoderadoPasoValues[]) => void
}

export function PasoApoderado({ value, idAlumno, validando, onAtras, onSiguiente }: PasoApoderadoProps) {
  const form = useForm<ApoderadosPasoValues>({
    resolver: zodResolver(apoderadosPasoSchema),
    defaultValues: { apoderados: value.length ? value : [apoderadoPasoDefault] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "apoderados" })

  const handleSiguiente = form.handleSubmit((valores) => onSiguiente(valores.apoderados))

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, indice) => (
        <TarjetaSeccion key={field.id}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {indice === 0 ? "Apoderado principal" : "Apoderado secundario"}
            </p>
            {indice > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(indice)}>
                <Trash2 className="text-destructive" data-icon="inline-start" />
                Quitar
              </Button>
            )}
          </div>
          <FormularioApoderado form={form} indice={indice} idAlumno={idAlumno} />
        </TarjetaSeccion>
      ))}

      {fields.length < 2 && (
        <Button type="button" variant="outline" className="self-start" onClick={() => append(apoderadoPasoDefault)}>
          <Plus data-icon="inline-start" />
          Agregar apoderado secundario
        </Button>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onAtras(form.getValues("apoderados"))}>
          Atrás
        </Button>
        <Button type="button" variant="brand" onClick={handleSiguiente} disabled={validando}>
          {validando ? "Validando..." : "Siguiente"}
        </Button>
      </div>
    </div>
  )
}

/** Búsqueda por DNI y campos de un apoderado; también lo usa Estudiantes al agregar uno. */
export function FormularioApoderado({
  form,
  indice,
  idAlumno,
}: {
  form: UseFormReturn<ApoderadosPasoValues>
  indice: number
  idAlumno: number | null
}) {
  const buscar = useBuscarApoderadoInscripcion()
  const consultarDni = useConsultarDni()
  const { data: parentescos = [] } = useParentescos()
  const { data: sexos = [] } = useSexos()
  const estado = useWatch({ control: form.control, name: `apoderados.${indice}.estado` })
  const hijos = useWatch({ control: form.control, name: `apoderados.${indice}.hijos` })
  const errores = form.formState.errors.apoderados?.[indice]
  const base = `apoderados.${indice}` as const
  const [comprobando, setComprobando] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [avisoConsulta, setAvisoConsulta] = useState("")
  const version = useRef(0)
  const consultaExterna = useRef(0)
  const edicionesNombres = useRef({ nombre: 0, apellidoPat: 0, apellidoMat: 0 })
  const comprobacion = useRef<{
    dni: string
    version: number
    promesa: Promise<ApoderadoPasoValues["estado"] | null>
  } | null>(null)

  // Una respuesta de un formulario anterior nunca debe actualizar el actual.
  useEffect(() => () => {
    version.current += 1
    consultaExterna.current += 1
    comprobacion.current = null
  }, [idAlumno, indice])

  function sigueVigente(dni: string, solicitud: number) {
    return version.current === solicitud && form.getValues(`${base}.documentoIdentidad`).trim() === dni
  }

  function comprobarInternamente(): Promise<ApoderadoPasoValues["estado"] | null> {
    const dni = form.getValues(`${base}.documentoIdentidad`).trim()
    if (!REGEX_DNI.test(dni)) return Promise.resolve(null)
    if (comprobacion.current?.dni === dni && comprobacion.current.version === version.current) {
      return comprobacion.current.promesa
    }
    const estadoActual = form.getValues(`${base}.estado`)
    if (estadoActual !== "") return Promise.resolve(estadoActual)

    const solicitud = version.current
    setComprobando(true)
    const promesa = (async () => {
      try {
        const encontrado = await buscar.mutateAsync({ dni, idAlumno })
        if (!sigueVigente(dni, solicitud)) return null
        if (encontrado.documentoIdentidad !== dni || !["NUEVO", "APODERADO", "USUARIO"].includes(encontrado.estado)) {
          throw new Error("La comprobación interna devolvió una respuesta incompleta. Reintenta con la lupa.")
        }
        const actuales = form.getValues(base)
        if (encontrado.estado === "NUEVO") {
          // La búsqueda interna solo clasifica: no borra lo escrito manualmente.
          form.setValue(`${base}.estado`, "NUEVO")
        } else {
          const valores = apoderadoDesdeBusqueda(encontrado)
          valores.idParentesco = encontrado.idParentesco ?? actuales.idParentesco
          if (encontrado.estado === "USUARIO") {
            valores.sexo = encontrado.sexo ?? actuales.sexo
            valores.direccion = encontrado.direccion ?? actuales.direccion
            valores.celular = encontrado.celular ?? actuales.celular
          }
          form.setValue(base, valores)
        }
        form.clearErrors(`${base}.documentoIdentidad`)
        if (form.formState.isSubmitted) void form.trigger(base)
        return encontrado.estado
      } catch (error) {
        if (sigueVigente(dni, solicitud)) {
          form.setError(`${base}.documentoIdentidad`, {
            message: error instanceof Error ? error.message : "No se pudo comprobar el DNI en el colegio. Reintenta con la lupa.",
          })
        }
        return null
      } finally {
        if (sigueVigente(dni, solicitud)) {
          setComprobando(false)
          comprobacion.current = null
        }
      }
    })()
    comprobacion.current = { dni, version: solicitud, promesa }
    return promesa
  }

  async function handleBuscar() {
    const dni = form.getValues(`${base}.documentoIdentidad`).trim()
    if (!REGEX_DNI.test(dni) || consultando) return
    const solicitud = version.current
    const consulta = ++consultaExterna.current
    const clasificacion = await comprobarInternamente()
    if (!sigueVigente(dni, solicitud) || consulta !== consultaExterna.current || clasificacion !== "NUEVO") return
    const ediciones = { ...edicionesNombres.current }
    setConsultando(true)
    setAvisoConsulta("Consultando datos del DNI. Puedes seguir escribiendo o continuar sin esperar esta ayuda.")
    try {
      const r = await consultarDni.mutateAsync(dni)
      if (!sigueVigente(dni, solicitud) || consulta !== consultaExterna.current) return
      if (r.dni !== dni) throw new Error("La respuesta no corresponde al DNI consultado")
      const datos = { nombre: r.nombres, apellidoPat: r.apellidoPaterno, apellidoMat: r.apellidoMaterno }
      let completados = 0
      for (const campo of ["nombre", "apellidoPat", "apellidoMat"] as const) {
        if (datos[campo]?.trim() && !form.getValues(`${base}.${campo}`).trim() && ediciones[campo] === edicionesNombres.current[campo]) {
          form.setValue(`${base}.${campo}`, datos[campo], { shouldValidate: true })
          completados += 1
        }
      }
      const origen = r.origen === "LOCAL" ? "el colegio" : r.origen === "CACHE" ? "la caché de consultas" : r.origen === "RENIEC" ? "RENIEC" : "el servicio de consulta"
      setAvisoConsulta(completados
        ? `Se completaron campos vacíos con datos de ${origen}. Revisa la información antes de continuar.`
        : "La consulta no añadió datos. Se conservaron los campos manuales; puedes completarlos y continuar.")
    } catch {
      if (sigueVigente(dni, solicitud) && consulta === consultaExterna.current) {
        setAvisoConsulta("No se pudo obtener información de la consulta de DNI. Puedes completar los datos manualmente y continuar.")
      }
    } finally {
      if (sigueVigente(dni, solicitud) && consulta === consultaExterna.current) setConsultando(false)
    }
  }

  function handleCambiarDni(dni: string) {
    if (dni === form.getValues(`${base}.documentoIdentidad`)) return
    version.current += 1
    consultaExterna.current += 1
    comprobacion.current = null
    setComprobando(false)
    setConsultando(false)
    setAvisoConsulta("")
    // Otro DNI es otra persona: hay que volver a buscarlo.
    form.setValue(base, { ...apoderadoPasoDefault, documentoIdentidad: dni })
    form.clearErrors(base)
  }

  const yaEsApoderado = estado === "APODERADO"
  const tieneCuenta = estado === "APODERADO" || estado === "USUARIO"

  return (
    <div className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name={`${base}.documentoIdentidad`}
        render={({ field }) => (
          <CampoDni
            value={field.value}
            onChange={handleCambiarDni}
            onBlur={() => {
              field.onBlur()
              void comprobarInternamente()
            }}
            name={field.name}
            inputRef={field.ref}
            cargando={consultando}
            onBuscar={handleBuscar}
            error={errores?.documentoIdentidad}
            label="Documento de identidad *"
            placeholder="Ingrese el DNI"
          />
        )}
      />

      <p role="status" className="text-xs text-muted-foreground">
        {comprobando
          ? "Comprobando el DNI en la base del colegio. Puedes seguir llenando los campos."
          : estado === "NUEVO"
            ? "DNI comprobado en el colegio: persona nueva. Completa los datos manualmente o usa la lupa como ayuda opcional."
            : estado === ""
              ? "Al salir del DNI se comprobará si ya existe en el colegio. Esta comprobación es necesaria para continuar; la consulta de datos es opcional."
              : "Se reutilizarán los datos registrados en el colegio; no se creará una persona duplicada."}
      </p>
      {avisoConsulta && <p role="status" className="text-xs text-muted-foreground">{avisoConsulta}</p>}

      {yaEsApoderado && (
        <Aviso icono={Users} titulo="Ya es apoderado en el colegio">
          {hijos.length ? `Apoderado de: ${hijos.join(", ")}. ` : ""}
          No se registra de nuevo: solo se vincula a este alumno. Sus datos se editan desde Estudiantes.
        </Aviso>
      )}
      {estado === "USUARIO" && (
        <Aviso icono={UserCheck} titulo="Ya tiene cuenta en el sistema">
          Se reutiliza su cuenta y se le añade el rol Apoderado: no se le pide correo ni contraseña.
        </Aviso>
      )}

      <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["nombre", "apellidoPat", "apellidoMat"] as const).map((campo) => (
              <Controller
                key={campo}
                control={form.control}
                name={`${base}.${campo}`}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{campo === "nombre" ? "Nombres *" : campo === "apellidoPat" ? "Ap. paterno *" : "Ap. materno *"}</FieldLabel>
                    <FieldContent>
                      <Input
                        maxLength={30}
                        disabled={tieneCuenta}
                        {...field}
                        onChange={(e) => {
                          edicionesNombres.current[campo] += 1
                          field.onChange(e.target.value.replace(REGEX_NO_LETRAS_ESPACIOS, ""))
                        }}
                      />
                      <FieldError errors={[errores?.[campo]]} />
                    </FieldContent>
                  </Field>
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name={`${base}.fechaNaci`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento *</FieldLabel>
                  <FieldContent>
                    <Input type="date" disabled={tieneCuenta} {...field} />
                    <FieldError errors={[errores?.fechaNaci]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={`${base}.idParentesco`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Parentesco con el alumno *</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Padre, madre...">
                          {parentescos.find((p) => p.idParentesco === field.value)?.nombre}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {parentescos.map((p) => (
                            <SelectItem key={p.idParentesco} value={String(p.idParentesco)}>{p.nombre}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errores?.idParentesco]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <fieldset disabled={yaEsApoderado} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name={`${base}.sexo`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Sexo *</FieldLabel>
                  <FieldContent>
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")} disabled={yaEsApoderado}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona">
                          {sexos.find((s) => s.valor === field.value)?.nombre}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sexos.map((s) => (
                            <SelectItem key={s.valor} value={s.valor}>{s.nombre}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errores?.sexo]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={`${base}.celular`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Celular *</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="982323412"
                      maxLength={9}
                      inputMode="numeric"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                    />
                    <FieldError errors={[errores?.celular]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={`${base}.direccion`}
              render={({ field }) => (
                <Field className="sm:col-span-2">
                  <FieldLabel>Dirección *</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Av. Villahermosa 123" maxLength={120} {...field} />
                    <FieldError errors={[errores?.direccion]} />
                  </FieldContent>
                </Field>
              )}
            />
          </fieldset>

          {!tieneCuenta && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name={`${base}.gmail`}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Correo electrónico *</FieldLabel>
                    <FieldContent>
                      <Input type="email" placeholder="apoderado@correo.com" {...field} />
                      <FieldDescription className="text-xs">Aquí le llegarán sus accesos.</FieldDescription>
                      <FieldError errors={[errores?.gmail]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name={`${base}.contraseña`}
                render={({ field }) => (
                  <CampoContrasena
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                    error={errores?.contraseña}
                    label="Contraseña *"
                    descripcion="Temporal: se le pedirá cambiarla al ingresar."
                  />
                )}
              />
            </div>
          )}
      </>
    </div>
  )
}

function Aviso({
  icono: Icono,
  titulo,
  children,
}: {
  icono: React.ElementType
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-brand/25 bg-brand-subtle/40 p-3 text-sm">
      <Icono className="mt-0.5 size-4 shrink-0 text-brand" />
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
