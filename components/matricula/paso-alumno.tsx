"use client"

import { useValidarDniPersona } from "@/hooks/use-validar-dni-persona"
import { REGEX_DNI } from "@/lib/schemas/comun"
import { useState } from "react"
import { toast } from "sonner"
import { GraduationCap } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { BloqueFoto } from "@/components/shared/bloque-foto"
import { CampoChip } from "@/components/shared/campo-chip"
import { CampoDni } from "@/components/shared/campo-dni"
import { CamposNombres } from "@/components/shared/campos-nombres"
import { useBuscarAlumnoInscripcion } from "@/hooks/use-matricula"
import { useSexos } from "@/hooks/use-pagos"
import { useConsultarDni } from "@/hooks/use-reniec"
import type { ApoderadoBusqueda } from "@/lib/api/matricula"
import { alumnoPasoDefault, crearAlumnoPasoSchema, type AlumnoPasoValues } from "@/lib/schemas/matricula"

import { hoyNacimiento, NACIMIENTO_MINIMO_ALUMNO } from "@/lib/edades"

export interface AlumnoPaso {
  valores: AlumnoPasoValues
  // Alumno que ya está en el colegio: sus datos no se tocan, solo la foto.
  existe: boolean
  idAlumno: number | null
  urlFoto: string | null
  foto: File | null
  ultimaMatricula: string | null
}

interface PasoAlumnoProps {
  value: AlumnoPaso | null
  onCancelar: () => void
  onSiguiente: (data: AlumnoPaso, apoderados: ApoderadoBusqueda[] | null) => void
}

export function PasoAlumno({ value, onCancelar, onSiguiente }: PasoAlumnoProps) {
  const buscarAlumno = useBuscarAlumnoInscripcion()
  const consultarDni = useConsultarDni()
  const { data: sexos = [] } = useSexos()
  const [existente, setExistente] = useState<Omit<AlumnoPaso, "valores" | "foto"> | null>(
    value?.existe ? { existe: true, idAlumno: value.idAlumno, urlFoto: value.urlFoto, ultimaMatricula: value.ultimaMatricula } : null
  )
  const [apoderadosPrevios, setApoderadosPrevios] = useState<ApoderadoBusqueda[] | null>(null)
  const [foto, setFoto] = useState<File | null>(value?.foto ?? null)
  const [preview, setPreview] = useState<string | null>(
    value?.foto ? URL.createObjectURL(value.foto) : (value?.urlFoto ?? null)
  )
  const [errorFoto, setErrorFoto] = useState(false)

  const [fechaOriginal, setFechaOriginal] = useState(value?.existe ? value.valores.fechaNacimiento : null)
  const form = useForm<AlumnoPasoValues>({
    resolver: zodResolver(crearAlumnoPasoSchema(existente ? fechaOriginal : undefined)),
    defaultValues: value?.valores ?? alumnoPasoDefault,
  })
  const tieneDiscapacidad = useWatch({ control: form.control, name: "tieneDiscapacidad" })
  const [nombre, apellidoPat] = useWatch({ control: form.control, name: ["nombre", "apellidoPat"] })
  const bloqueado = !!existente

  const comprobacionDni = useValidarDniPersona({
    validar: (dni) => buscarAlumno.mutateAsync(dni),
    original: bloqueado ? form.getValues("documentoIdentidad") : undefined,
    onError: (message) => form.setError("documentoIdentidad", { message }),
    onValido: () => form.clearErrors("documentoIdentidad"),
  })

  async function handleBuscar() {
    const dni = form.getValues("documentoIdentidad").trim()
    if (!REGEX_DNI.test(dni)) return
    const sigueVigente = comprobacionDni.capturarVigencia()
    let internoCorrecto = false
    try {
      const alumno = await buscarAlumno.mutateAsync(dni)
      if (!sigueVigente()) return
      internoCorrecto = true
      form.clearErrors("documentoIdentidad")
      if (alumno.existe) {
        setFechaOriginal(alumno.fechaNacimiento ?? null)
        form.reset({
          documentoIdentidad: dni,
          nombre: alumno.nombre ?? "",
          apellidoPat: alumno.apellidoPat ?? "",
          apellidoMat: alumno.apellidoMat ?? "",
          fechaNacimiento: alumno.fechaNacimiento ?? "",
          sexo: alumno.sexo ?? "",
          direccion: alumno.direccion ?? "",
          tieneDiscapacidad: alumno.tieneDiscapacidad,
          discapacidad: alumno.discapacidad ?? "",
        })
        setExistente({ existe: true, idAlumno: alumno.idAlumno, urlFoto: alumno.urlFoto, ultimaMatricula: alumno.ultimaMatricula })
        setApoderadosPrevios(alumno.apoderados)
        setFoto(null)
        setPreview(alumno.urlFoto)
        toast.success(`${alumno.nombre} ${alumno.apellidoPat} ya es alumno del colegio`)
        return
      }
      setExistente(null)
      setApoderadosPrevios(null)
      const previos = form.getValues()
      const r = await consultarDni.mutateAsync(dni)
      if (!sigueVigente()) return
      const actuales = form.getValues()
      if (actuales.nombre !== previos.nombre || actuales.apellidoPat !== previos.apellidoPat || actuales.apellidoMat !== previos.apellidoMat) return
      form.setValue("nombre", r.nombres ?? "", { shouldValidate: true })
      form.setValue("apellidoPat", r.apellidoPaterno ?? "", { shouldValidate: true })
      form.setValue("apellidoMat", r.apellidoMaterno ?? "", { shouldValidate: true })
      toast.success("Datos completados desde RENIEC")
    } catch (error) {
      if (!sigueVigente()) return
      if (!internoCorrecto) form.setError("documentoIdentidad", { message: error instanceof Error ? error.message : "No se pudo comprobar el DNI en el colegio. Reintenta." })
      else toast.error(error instanceof Error ? error.message : "No se pudo consultar el DNI")
    }
  }

  function handleCambiarDni(dni: string) {
    comprobacionDni.invalidar()
    form.clearErrors("documentoIdentidad")
    form.setValue("documentoIdentidad", dni)
    // Otro DNI es otro alumno: se olvida el que se había encontrado.
    if (existente) {
      setExistente(null)
      setApoderadosPrevios(null)
      form.reset({ ...alumnoPasoDefault, documentoIdentidad: dni })
      setFoto(null)
      setPreview(null)
    }
  }

  function handleArchivo(file: File) {
    setFoto(file)
    setPreview(URL.createObjectURL(file))
    setErrorFoto(false)
  }

  function handleQuitarFoto() {
    setFoto(null)
    setPreview(existente?.urlFoto ?? null)
  }

  const handleSiguiente = form.handleSubmit(async (valores) => {
    if (!await comprobacionDni.comprobar(valores.documentoIdentidad)) return
    if (!foto && !existente?.urlFoto) {
      setErrorFoto(true)
      toast.error("La foto del alumno es obligatoria")
      return
    }
    onSiguiente(
      {
        valores,
        existe: !!existente,
        idAlumno: existente?.idAlumno ?? null,
        urlFoto: existente?.urlFoto ?? null,
        foto,
        ultimaMatricula: existente?.ultimaMatricula ?? null,
      },
      apoderadosPrevios
    )
  }, () => {
    if (!foto && !existente?.urlFoto) setErrorFoto(true)
  })

  const iniciales = `${nombre?.[0] ?? ""}${apellidoPat?.[0] ?? ""}`.toUpperCase()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1">
        <div className="flex w-full justify-center">
          <BloqueFoto
            preview={preview}
            alt="Foto del alumno"
            iniciales={iniciales}
            fallback="A"
            hayFotoNueva={!!foto}
            mostrarQuitar={!!foto}
            notaSinFoto={errorFoto ? null : "Obligatoria"}
            onChangeArchivo={handleArchivo}
            onQuitar={handleQuitarFoto}
          />
        </div>
        {errorFoto && <p className="text-xs text-destructive">La foto del alumno es obligatoria</p>}
      </div>

      {existente && (
        <div className="flex gap-3 rounded-lg border border-brand/25 bg-brand-subtle/40 p-3 text-sm">
          <GraduationCap className="mt-0.5 size-4 shrink-0 text-brand" />
          <div>
            <p className="font-medium">Alumno del colegio</p>
            <p className="text-xs text-muted-foreground">
              {existente.ultimaMatricula
                ? `Última matrícula: ${existente.ultimaMatricula}. `
                : "Aún no tiene matrículas. "}
              Sus datos se conservan; aquí solo puedes actualizar la foto y la dirección.
            </p>
          </div>
        </div>
      )}

      <Controller
        control={form.control}
        name="documentoIdentidad"
        render={({ field }) => (
          <CampoDni
            value={field.value}
            onChange={handleCambiarDni}
            onBlur={() => { field.onBlur(); void comprobacionDni.comprobar(field.value) }}
            name={field.name}
            inputRef={field.ref}
            cargando={buscarAlumno.isPending || consultarDni.isPending || comprobacionDni.comprobando}
            onBuscar={handleBuscar}
            error={form.formState.errors.documentoIdentidad}
            autoFocus
            label="Documento de identidad *"
            placeholder="Ingrese el DNI"
          />
        )}
      />

      <div className="flex flex-col gap-4">
        <fieldset disabled={bloqueado} className="flex flex-col gap-4">
          <CamposNombres control={form.control} errors={form.formState.errors} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fechaNacimiento"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento *</FieldLabel>
                  <FieldContent>
                    <Input
                      type="date"
                      onFocus={(event) => { if (!bloqueado) event.currentTarget.max = hoyNacimiento() }}
                      min={bloqueado ? undefined : NACIMIENTO_MINIMO_ALUMNO}
                      max={bloqueado ? undefined : hoyNacimiento()}
                      {...field}
                    />
                    <FieldError errors={[form.formState.errors.fechaNacimiento]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="sexo"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Sexo *</FieldLabel>
                  <FieldContent>
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")} disabled={bloqueado}>
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
                    <FieldError errors={[form.formState.errors.sexo]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

        </fieldset>

          <Controller
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <Field>
                <FieldLabel>Dirección *</FieldLabel>
                <FieldContent>
                  <Input placeholder="Av. Villahermosa 123" maxLength={120} {...field} />
                  <FieldError errors={[form.formState.errors.direccion]} />
                </FieldContent>
              </Field>
            )}
          />

        <fieldset disabled={bloqueado} className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="tieneDiscapacidad"
            render={({ field }) => (
              <CampoChip checked={field.value} onCheckedChange={field.onChange} disabled={bloqueado}>
                Tiene alguna discapacidad
              </CampoChip>
            )}
          />
          {tieneDiscapacidad && (
            <Controller
              control={form.control}
              name="discapacidad"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Discapacidad *</FieldLabel>
                  <FieldContent>
                    <Textarea placeholder="Describe la discapacidad del alumno" maxLength={255} rows={2} {...field} />
                    <FieldError errors={[form.formState.errors.discapacidad]} />
                  </FieldContent>
                </Field>
              )}
            />
          )}
        </fieldset>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="button" variant="brand" onClick={handleSiguiente} disabled={form.formState.isSubmitting}>Siguiente</Button>
      </div>
    </div>
  )
}
