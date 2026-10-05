"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { GradoSeccionCascada, type SeccionInfo } from "@/components/shared/grado-seccion-cascada"
import { useAniosEscolares } from "@/hooks/use-academico"
import type { PasoAlumnoData } from "./paso-alumno"
import type { PasoApoderadoData } from "./paso-apoderado"

export interface PasoMatriculaValues {
  idGradoSeccion: number
  solicitudMatricula: number
  fechaPago: string
  montoPago: number | undefined
  observaciones: string
}

const matriculaStepSchema = z
  .object({
    idGradoSeccion: z.number().int().min(1, "Debe seleccionar un grado - sección"),
    solicitudMatricula: z.number().int().min(1).max(3),
    fechaPago: z.string().default(""),
    montoPago: z.number().min(0, "El monto no puede ser negativo").optional(),
    observaciones: z.string().max(500).default(""),
  })
  .superRefine((val, ctx) => {
    if (val.solicitudMatricula === 2) {
      if (!val.fechaPago) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaPago"],
          message: "La fecha de pago es obligatoria al aprobar la solicitud",
        })
      }
      if (val.montoPago === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["montoPago"],
          message: "El monto de pago es obligatorio al aprobar la solicitud",
        })
      }
    }
  })

const SOLICITUDES = [
  { value: "1", label: "Pendiente" },
  { value: "2", label: "Aprobada" },
  { value: "3", label: "Rechazada" },
]

interface PasoMatriculaProps {
  alumno: PasoAlumnoData
  apoderado: PasoApoderadoData
  onSubmit: (values: PasoMatriculaValues) => void
  onBack: () => void
  isSubmitting: boolean
}

export function PasoMatricula({
  alumno,
  apoderado,
  onSubmit,
  onBack,
  isSubmitting,
}: PasoMatriculaProps) {
  const { data: anios = [] } = useAniosEscolares()
  const [seccionInfo, setSeccionInfo] = useState<SeccionInfo | null>(null)

  const aniosActivos = anios.filter((a) => a.estado === 1)
  const idsAniosActivos = new Set(aniosActivos.map((a) => a.idAnio))

  const form = useForm<PasoMatriculaValues>({
    resolver: zodResolver(matriculaStepSchema) as any,
    defaultValues: {
      idGradoSeccion: 0,
      solicitudMatricula: 1,
      fechaPago: "",
      montoPago: undefined,
      observaciones: "",
    },
  })

  const solicitud = form.watch("solicitudMatricula")

  const alumnoNombre = alumno.existe
    ? `${alumno.alumno?.nombre} ${alumno.alumno?.apellidoPat} ${alumno.alumno?.apellidoMat}`
    : `${alumno.nombre} ${alumno.apellidoPat} ${alumno.apellidoMat}`

  const apoderadoNombre = apoderado.principal.existe
    ? `${apoderado.principal.apoderado?.nombre} ${apoderado.principal.apoderado?.apellidoPat} ${apoderado.principal.apoderado?.apellidoMat}`
    : `${apoderado.principal.nombre} ${apoderado.principal.apellidoPat} ${apoderado.principal.apellidoMat}`

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Paso 3 — Matrícula</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona el grado, sección y datos de la matrícula.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">Grado - Sección</p>
        <GradoSeccionCascada
          key="matricula-wizard"
          value={form.getValues("idGradoSeccion") || null}
          onSeccionInfo={setSeccionInfo}
          onChange={(v) =>
            form.setValue("idGradoSeccion", v ?? 0, { shouldValidate: true })
          }
          allowedAnios={idsAniosActivos}
        />
        <FieldError errors={[form.formState.errors.idGradoSeccion]} />
      </div>

      {seccionInfo && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Turno:</span>
          <Badge variant="secondary">{seccionInfo.turno}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="solicitudMatricula"
          render={({ field }) => (
            <Field>
              <FieldLabel>Solicitud</FieldLabel>
              <FieldContent>
                <Select
                  value={String(field.value ?? 1)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {SOLICITUDES.find(
                        (s) => s.value === String(field.value ?? 1)
                      )?.label ?? "Selecciona"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SOLICITUDES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.solicitudMatricula]} />
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="fechaPago"
          render={({ field }) => (
            <Field>
              <FieldLabel>Fecha de pago</FieldLabel>
              <FieldContent>
                <Input type="date" {...field} />
                <FieldError errors={[form.formState.errors.fechaPago]} />
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="montoPago"
          render={({ field }) => (
            <Field>
              <FieldLabel>Monto de pago (S/)</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
                <FieldError errors={[form.formState.errors.montoPago]} />
              </FieldContent>
            </Field>
          )}
        />
      </div>

      {solicitud === 2 && (
        <p className="text-xs text-muted-foreground">
          La solicitud está aprobada: indica fecha y monto de pago.
        </p>
      )}

      <Controller
        control={form.control}
        name="observaciones"
        render={({ field }) => (
          <Field>
            <FieldLabel>Observaciones (opcional)</FieldLabel>
            <FieldContent>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Notas generales de la matrícula"
                {...field}
              />
              <FieldError errors={[form.formState.errors.observaciones]} />
            </FieldContent>
          </Field>
        )}
      />

      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-semibold">Resumen</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Alumno:</span>{" "}
            <span className="font-medium">{alumnoNombre}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Apoderado:</span>{" "}
            <span className="font-medium">{apoderadoNombre}</span>
          </div>
          {seccionInfo && (
            <>
              <div>
                <span className="text-muted-foreground">Sección:</span>{" "}
                <span className="font-medium">{seccionInfo.nombreSeccion}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Turno:</span>{" "}
                <span className="font-medium">{seccionInfo.turno}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          type="button"
          onClick={form.handleSubmit((values) => onSubmit(values as PasoMatriculaValues))}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="animate-spin" />}
          Crear matrícula
        </Button>
      </div>
    </div>
  )
}
