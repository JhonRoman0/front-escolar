"use client"

import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { BotonGuardar } from "@/components/shared/boton-guardar"
import { CamposNombres } from "@/components/shared/campos-nombres"
import { useActualizarApoderado } from "@/hooks/use-estudiantes"
import { useParentescos, useSexos } from "@/hooks/use-pagos"
import type { AlumnoResponse, ApoderadoResponse } from "@/lib/api/estudiantes"
import {
  MENSAJE_DNI,
  MENSAJE_SOLO_LETRAS_Y_ESPACIOS,
  REGEX_DNI,
  REGEX_SOLO_LETRAS_Y_ESPACIOS,
  emailRequerido,
} from "@/lib/schemas/comun"

const nombre = (campo: string) =>
  z.string().trim().min(1, `${campo} es obligatorio`).max(30).regex(REGEX_SOLO_LETRAS_Y_ESPACIOS, MENSAJE_SOLO_LETRAS_Y_ESPACIOS)

const apoderadoSchema = z.object({
  documentoIdentidad: z.string().regex(REGEX_DNI, MENSAJE_DNI),
  nombre: nombre("El nombre"),
  apellidoPat: nombre("El apellido paterno"),
  apellidoMat: nombre("El apellido materno"),
  fechaNaci: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  sexo: z.string().min(1, "Selecciona el sexo"),
  direccion: z.string().trim().min(1, "La dirección es obligatoria").max(120),
  celular: z.string().regex(/^\d{9}$/, "El celular debe tener 9 dígitos"),
  gmail: emailRequerido,
  idParentesco: z.number().int().min(1, "Selecciona el parentesco"),
})
type ApoderadoValues = z.infer<typeof apoderadoSchema>

/** Todo obligatorio. El parentesco es el que tiene con el alumno desde el que se edita. */
export function ApoderadoEditarDialog({
  alumno,
  apoderado,
  onOpenChange,
}: {
  alumno: AlumnoResponse | null
  apoderado: ApoderadoResponse | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!alumno && !!apoderado} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Editar apoderado</DialogTitle>
        </DialogHeader>
        {alumno && apoderado && (
          <Formulario alumno={alumno} apoderado={apoderado} onCerrar={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  alumno,
  apoderado,
  onCerrar,
}: {
  alumno: AlumnoResponse
  apoderado: ApoderadoResponse
  onCerrar: () => void
}) {
  const actualizar = useActualizarApoderado()
  const { data: parentescos = [] } = useParentescos()
  const { data: sexos = [] } = useSexos()
  const form = useForm<ApoderadoValues>({
    resolver: zodResolver(apoderadoSchema),
    defaultValues: {
      documentoIdentidad: apoderado.documentoIdentidad ?? "",
      nombre: apoderado.nombre,
      apellidoPat: apoderado.apellidoPat,
      apellidoMat: apoderado.apellidoMat,
      fechaNaci: apoderado.fechaNaci ?? "",
      sexo: apoderado.sexo ?? "",
      direccion: apoderado.direccion ?? "",
      celular: apoderado.celular ?? "",
      gmail: apoderado.gmail ?? "",
      idParentesco: apoderado.idParentesco ?? 0,
    },
  })
  const errores = form.formState.errors

  async function onSubmit(values: ApoderadoValues) {
    const cambiaCorreo = values.gmail.trim().toLowerCase() !== (apoderado.gmail ?? "").toLowerCase()
    try {
      await actualizar.mutateAsync({
        id: apoderado.idApoderado,
        data: { ...values, gmail: values.gmail.trim(), direccion: values.direccion.trim(), idAlumno: alumno.idAlumno },
      })
      toast.success(
        cambiaCorreo
          ? `Apoderado actualizado. Se enviaron accesos nuevos a ${values.gmail.trim()}`
          : "Apoderado actualizado"
      )
      onCerrar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el apoderado")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="documentoIdentidad"
            render={({ field }) => (
              <Field>
                <FieldLabel>DNI *</FieldLabel>
                <FieldContent>
                  <Input maxLength={8} inputMode="numeric" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} />
                  <FieldError errors={[errores.documentoIdentidad]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="fechaNaci"
            render={({ field }) => (
              <Field>
                <FieldLabel>Fecha de nacimiento *</FieldLabel>
                <FieldContent>
                  <Input type="date" {...field} />
                  <FieldError errors={[errores.fechaNaci]} />
                </FieldContent>
              </Field>
            )}
          />
        </div>
        <CamposNombres control={form.control} errors={errores} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <Field>
                <FieldLabel>Sexo *</FieldLabel>
                <FieldContent>
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona">{sexos.find((s) => s.valor === field.value)?.nombre}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {sexos.map((s) => (
                          <SelectItem key={s.valor} value={s.valor}>{s.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errores.sexo]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="idParentesco"
            render={({ field }) => (
              <Field>
                <FieldLabel>Parentesco con {alumno.nombre} *</FieldLabel>
                <FieldContent>
                  <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona">{parentescos.find((p) => p.idParentesco === field.value)?.nombre}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {parentescos.map((p) => (
                          <SelectItem key={p.idParentesco} value={String(p.idParentesco)}>{p.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errores.idParentesco]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="celular"
            render={({ field }) => (
              <Field>
                <FieldLabel>Celular *</FieldLabel>
                <FieldContent>
                  <Input maxLength={9} inputMode="numeric" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} />
                  <FieldError errors={[errores.celular]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="gmail"
            render={({ field }) => (
              <Field>
                <FieldLabel>Correo electrónico *</FieldLabel>
                <FieldContent>
                  <Input type="email" {...field} />
                  <FieldDescription className="text-xs">Si lo cambias, se le envía una contraseña temporal al correo nuevo.</FieldDescription>
                  <FieldError errors={[errores.gmail]} />
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
              <FieldLabel>Dirección *</FieldLabel>
              <FieldContent>
                <Input maxLength={120} {...field} />
                <FieldError errors={[errores.direccion]} />
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
        <BotonGuardar etiqueta="Guardar cambios" enviando={actualizar.isPending} />
      </DialogFooter>
    </form>
  )
}
