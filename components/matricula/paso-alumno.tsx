"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useAlumnoPorDocumento } from "@/hooks/use-estudiantes"
import { useConsultarDni } from "@/hooks/use-reniec"
import { ApiError } from "@/lib/api"
import type { AlumnoResponse } from "@/lib/api/estudiantes"

export interface PasoAlumnoData {
  existe: boolean
  alumno?: AlumnoResponse
  nombre?: string
  apellidoPat?: string
  apellidoMat?: string
  fechaNacimiento?: string
  direccion?: string
  documentoIdentidad?: string
}

const alumnoStepSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(50),
    apellidoPat: z.string().trim().min(1, "El apellido paterno es obligatorio").max(50),
    apellidoMat: z.string().trim().min(1, "El apellido materno es obligatorio").max(50),
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)"),
    direccion: z.string().max(100).optional().or(z.literal("")).nullable(),
    documentoIdentidad: z.string().max(20).optional().or(z.literal("")).nullable(),
  })

type AlumnoStepValues = z.infer<typeof alumnoStepSchema>

const defaultValues: AlumnoStepValues = {
  nombre: "",
  apellidoPat: "",
  apellidoMat: "",
  fechaNacimiento: "",
  direccion: "",
  documentoIdentidad: "",
}

interface PasoAlumnoProps {
  value: PasoAlumnoData | null
  onChange: (data: PasoAlumnoData) => void
  onNext: () => void
}

export function PasoAlumno({ value, onChange, onNext }: PasoAlumnoProps) {
  const buscarAlumno = useAlumnoPorDocumento()
  const reniec = useConsultarDni()
  const [busqueda, setBusqueda] = useState(value?.documentoIdentidad ?? "")
  const [alumnoSel, setAlumnoSel] = useState<AlumnoResponse | null>(
    value?.existe ? (value.alumno ?? null) : null
  )

  const form = useForm<AlumnoStepValues>({
    resolver: zodResolver(alumnoStepSchema),
    defaultValues: value?.existe
      ? defaultValues
      : {
          nombre: value?.nombre ?? "",
          apellidoPat: value?.apellidoPat ?? "",
          apellidoMat: value?.apellidoMat ?? "",
          fechaNacimiento: value?.fechaNacimiento ?? "",
          direccion: value?.direccion ?? "",
          documentoIdentidad: value?.documentoIdentidad ?? busqueda,
        },
  })

  async function buscarPorDocumento() {
    const dni = busqueda.trim()
    if (!dni) return
    try {
      const alumno = await buscarAlumno.mutateAsync(dni)
      setAlumnoSel(alumno)
      onChange({ existe: true, alumno })
      toast.success(
        `Alumno encontrado: ${alumno.nombre} ${alumno.apellidoPat} ${alumno.apellidoMat}`
      )
    } catch (error) {
      const isNotFound =
        (error instanceof ApiError && error.status === 404) ||
        (error instanceof Error && error.message.toLowerCase().includes("no encontrado"))
      if (isNotFound) {
        if (/^\d{8}$/.test(dni)) {
          try {
            const r = await reniec.mutateAsync(dni)
            setAlumnoSel(null)
            form.setValue("documentoIdentidad", r.dni ?? dni)
            form.setValue("nombre", r.nombres ?? "", { shouldValidate: true })
            form.setValue("apellidoPat", r.apellidoPaterno ?? "", { shouldValidate: true })
            form.setValue("apellidoMat", r.apellidoMaterno ?? "", { shouldValidate: true })
            const mensaje = r.origen === "RENIEC" || r.origen === "CACHE" ? "Datos completados desde RENIEC" : "Datos completados automáticamente"
            toast.success(mensaje)
            return
          } catch (reniecError) {
            if (reniecError instanceof ApiError && reniecError.status === 404) {
              setAlumnoSel(null)
              form.setValue("documentoIdentidad", dni)
              toast.info("No encontramos ese DNI en RENIEC. Completa los datos.")
              return
            }
            toast.error(reniecError instanceof Error ? reniecError.message : "No se pudo consultar RENIEC")
            return
          }
        }
        setAlumnoSel(null)
        form.setValue("documentoIdentidad", dni)
        toast.info("No encontramos ese DNI. Completa los datos del alumno.")
      } else {
        const msg = error instanceof Error ? error.message : ""
        toast.error(msg || "No se pudo buscar el alumno")
      }
    }
  }

  function cambiarAlumno() {
    setAlumnoSel(null)
    onChange({ existe: false })
  }

  function handleSiguiente() {
    if (alumnoSel) {
      onNext()
      return
    }
    form.handleSubmit((values) => {
      onChange({
        existe: false,
        nombre: values.nombre,
        apellidoPat: values.apellidoPat,
        apellidoMat: values.apellidoMat,
        fechaNacimiento: values.fechaNacimiento,
        direccion: values.direccion || undefined,
        documentoIdentidad: values.documentoIdentidad || busqueda || undefined,
      })
      onNext()
    })()
  }

  const iniciales = alumnoSel
    ? `${alumnoSel.nombre[0] ?? ""}${alumnoSel.apellidoPat[0] ?? ""}`.toUpperCase()
    : `${form.getValues("nombre")[0] ?? ""}${form.getValues("apellidoPat")[0] ?? ""}`.toUpperCase()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Paso 1 — Alumno</h3>
        <p className="text-sm text-muted-foreground">
          Busca el alumno por DNI o regístralo si es nuevo.
        </p>
      </div>

      {alumnoSel ? (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {alumnoSel.urlFoto ? (
                <AvatarImage src={alumnoSel.urlFoto} alt="Foto del alumno" />
              ) : (
                <AvatarFallback className="rounded-full text-sm">
                  {iniciales}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium">
                {alumnoSel.nombre} {alumnoSel.apellidoPat} {alumnoSel.apellidoMat}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {alumnoSel.codigo}
                {alumnoSel.documentoIdentidad ? ` · ${alumnoSel.documentoIdentidad}` : ""}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={cambiarAlumno}>
            Cambiar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar alumno por DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarPorDocumento()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={buscarPorDocumento}
              disabled={buscarAlumno.isPending}
            >
              {buscarAlumno.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o completa los datos</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="documentoIdentidad"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Documento de identidad</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="DNI"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <FieldError errors={[form.formState.errors.documentoIdentidad]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="fechaNacimiento"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[form.formState.errors.fechaNacimiento]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombres</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Luis" {...field} />
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="apellidoPat"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. paterno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="García" {...field} />
                    <FieldError errors={[form.formState.errors.apellidoPat]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="apellidoMat"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. materno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Torres" {...field} />
                    <FieldError errors={[form.formState.errors.apellidoMat]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="direccion"
            render={({ field }) => (
              <Field>
                <FieldLabel>Dirección</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="Av. Los Pinos 123"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  <FieldError errors={[form.formState.errors.direccion]} />
                </FieldContent>
              </Field>
            )}
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSiguiente}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
