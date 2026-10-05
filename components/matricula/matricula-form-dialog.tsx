"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { GradoSeccionCascada } from "@/components/shared/grado-seccion-cascada"
import { useAniosEscolares, useGrados } from "@/hooks/use-academico"
import {
  useAlumnoPorDocumento,
  useAlumnos,
  useCrudAlumnos,
  useSubirFotoAlumno,
  useSubirFotoApoderado,
} from "@/hooks/use-estudiantes"
import { useCrudMatriculas, useMatricula } from "@/hooks/use-matricula"
import type { AlumnoResponse, ApoderadoResponse, AlumnoRequest, ApoderadoRequest } from "@/lib/api/estudiantes"
import type {
  MatriculaRequest,
  MatriculaResponse,
} from "@/lib/api/matricula"
import {
  matriculaDefault,
  matriculaSchema,
  type MatriculaValues,
} from "@/lib/schemas/matricula"

import { PasoAlumno, type PasoAlumnoData } from "./paso-alumno"
import { PasoApoderado, type PasoApoderadoData } from "./paso-apoderado"
import { PasoMatricula, type PasoMatriculaValues } from "./paso-matricula"
import { Stepper } from "@/components/shared/stepper"

const SOLICITUDES = [
  { value: "1", label: "Pendiente" },
  { value: "2", label: "Aprobada" },
  { value: "3", label: "Rechazada" },
]

interface MatriculaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matricula?: MatriculaResponse | null
}

export function MatriculaFormDialog({
  open,
  onOpenChange,
  matricula,
}: MatriculaFormDialogProps) {
  const crud = useCrudMatriculas()
  const crudAlumnos = useCrudAlumnos()
  const subirFotoAlumno = useSubirFotoAlumno()
  const subirFotoApoderado = useSubirFotoApoderado()
  const buscarAlumno = useAlumnoPorDocumento()
  const esEdicion = !!matricula
  const { data: grados = [] } = useGrados()
  const { data: anios = [] } = useAniosEscolares()
  const { data: alumnosData } = useAlumnos(0, 500)
  const { data: matriculaFresca } = useMatricula(
    esEdicion ? matricula?.idMatricula : undefined
  )

  const base = matriculaFresca ?? matricula

  const [busqueda, setBusqueda] = useState("")
  const [alumnoSel, setAlumnoSel] = useState<AlumnoResponse | null>(null)

  const aniosActivos = anios.filter((a) => a.estado === 1)
  const idsAniosActivos = new Set(aniosActivos.map((a) => a.idAnio))

  const form = useForm<MatriculaValues>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: matricula
      ? {
          idAlumno: matricula.idAlumno,
          idGradoSeccion: matricula.idGradoSeccion,
          solicitudMatricula: matricula.solicitudMatricula,
          fechaPago: matricula.fechaPago ?? "",
          montoPago: matricula.montoPago ?? undefined,
          observaciones: matricula.observaciones ?? "",
          motivo: "",
          accesoId: matricula.accesoId ?? 1,
        }
      : matriculaDefault,
  })

  useEffect(() => {
    if (open && esEdicion) {
      form.reset({
        idAlumno: base?.idAlumno ?? 0,
        idGradoSeccion: base?.idGradoSeccion ?? 0,
        solicitudMatricula: base?.solicitudMatricula ?? 1,
        fechaPago: base?.fechaPago ?? "",
        montoPago: base?.montoPago ?? undefined,
        observaciones: base?.observaciones ?? "",
        motivo: "",
        accesoId: base?.accesoId ?? 1,
      })
    }
  }, [open, base, esEdicion, form])

  const solicitud = useWatch({ control: form.control, name: "solicitudMatricula" })
  const idGradoSeccion = useWatch({ control: form.control, name: "idGradoSeccion" })

  const gradoActual = grados.find((g) =>
    g.secciones.some((s) => s.idGradoSeccion === idGradoSeccion) ||
    (g.idGradoSeccionDefault != null && g.idGradoSeccionDefault === idGradoSeccion)
  )

  function seleccionarAlumno(alumno: AlumnoResponse) {
    setAlumnoSel(alumno)
    form.setValue("idAlumno", alumno.idAlumno, { shouldValidate: true })
  }

  async function buscarPorDocumento() {
    const documento = busqueda.trim()
    if (!documento) return
    try {
      const alumno = await buscarAlumno.mutateAsync(documento)
      seleccionarAlumno(alumno)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("no encontrado")) {
        toast.error("No encontramos un alumno con ese DNI.")
      } else {
        toast.error(message || "No se pudo buscar el alumno")
      }
    }
  }

  function buildRequest(values: MatriculaValues): MatriculaRequest {
    const data: MatriculaRequest = {
      idAlumno: values.idAlumno,
      idGradoSeccion: values.idGradoSeccion,
      solicitudMatricula: values.solicitudMatricula,
      fechaPago: values.fechaPago || null,
      montoPago: values.montoPago ?? null,
      observaciones: values.observaciones || null,
    }
    if (esEdicion) data.accesoId = values.accesoId ?? 1
    return data
  }

  async function onSubmit(values: MatriculaValues) {
    try {
      if (esEdicion && matricula) {
        const idActual = base?.idGradoSeccion ?? matricula.idGradoSeccion
        if (values.idGradoSeccion !== idActual) {
          await crud.cambioSeccion.mutateAsync({
            id: matricula.idMatricula,
            idGradoSeccion: values.idGradoSeccion,
            motivo: values.motivo?.trim() || undefined,
          })
        }
        await crud.actualizar.mutateAsync({
          id: matricula.idMatricula,
          data: buildRequest(values),
        })
        toast.success("Matrícula actualizada")
      } else {
        await crud.crear.mutateAsync(buildRequest(values))
        toast.success("Matrícula creada")
      }
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar"
      toast.error(message)
    }
  }

  const enviando =
    crud.crear.isPending || crud.actualizar.isPending || crud.cambioSeccion.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar matrícula" : "Nueva matrícula"}
          </DialogTitle>
        </DialogHeader>

        {esEdicion ? (
          <EditForm
            form={form}
            matricula={matricula!}
            base={base ?? undefined}
            grados={grados}
            idsAniosActivos={idsAniosActivos}
            gradoActual={gradoActual}
            solicitud={solicitud}
            idGradoSeccion={idGradoSeccion}
            onSubmit={form.handleSubmit(onSubmit)}
            enviando={enviando}
          />
        ) : (
          <WizardCreacion
            open={open}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  form,
  matricula,
  base,
  grados,
  idsAniosActivos,
  gradoActual,
  solicitud,
  idGradoSeccion,
  onSubmit,
  enviando,
}: {
  form: ReturnType<typeof useForm<MatriculaValues>>
  matricula: MatriculaResponse
  base: MatriculaResponse | undefined
  grados: any[]
  idsAniosActivos: Set<number>
  gradoActual: any
  solicitud: number
  idGradoSeccion: number
  onSubmit: () => void
  enviando: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">{matricula.alumno}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {matricula.codigoAlumno}
        </p>
      </div>

      <Field>
        <FieldLabel>Grado - Sección</FieldLabel>
        <FieldContent>
          <GradoSeccionCascada
            key={matricula.idMatricula}
            value={idGradoSeccion || null}
            onChange={(v) =>
              form.setValue("idGradoSeccion", v ?? 0, { shouldValidate: true })
            }
            defaultIdNivel={gradoActual?.idNivel ?? null}
            defaultIdGrado={gradoActual?.idGrado ?? null}
            allowedAnios={idsAniosActivos}
          />
          <FieldError errors={[form.formState.errors.idGradoSeccion]} />
        </FieldContent>
      </Field>

      {idGradoSeccion !== (base?.idGradoSeccion ?? matricula.idGradoSeccion) && (
        <Controller
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <Field>
              <FieldLabel>Motivo del cambio (opcional)</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Ej. Cambio por rendimiento académico"
                  {...field}
                />
                <FieldError errors={[form.formState.errors.motivo]} />
              </FieldContent>
            </Field>
          )}
        />
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
                <FieldError
                  errors={[form.formState.errors.solicitudMatricula]}
                />
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

      <DialogFooter>
        <DialogTrigger render={<Button variant="outline" />}>
          Cancelar
        </DialogTrigger>
        <Button type="submit" disabled={enviando}>
          {enviando && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  )
}

function WizardCreacion({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const crud = useCrudMatriculas()
  const crudAlumnos = useCrudAlumnos()

  const [paso, setPaso] = useState(1)
  const [alumnoData, setAlumnoData] = useState<PasoAlumnoData | null>(null)
  const [apoderadoData, setApoderadoData] = useState<PasoApoderadoData | null>(null)
  const [creadoIdAlumno, setCreadoIdAlumno] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPaso(1)
      setAlumnoData(null)
      setApoderadoData(null)
      setCreadoIdAlumno(null)
      setIsSubmitting(false)
    }
  }, [open])

  async function handleCrearAlumno(apoderado: PasoApoderadoData): Promise<number | null> {
    if (alumnoData?.existe && alumnoData.alumno) {
      return alumnoData.alumno.idAlumno
    }

    if (!alumnoData) return null

    const apoderadosPayload: ApoderadoRequest[] = []

    if (apoderado.principal.existe && apoderado.principal.apoderado) {
      const ap = apoderado.principal.apoderado
      apoderadosPayload.push({
        documentoIdentidad: ap.documentoIdentidad ?? null,
        celular: ap.celular ?? null,
        direccion: ap.direccion ?? null,
        parentesco: ap.parentesco ?? null,
      })
    } else {
      apoderadosPayload.push({
        nombre: apoderado.principal.nombre ?? null,
        apellidoPat: apoderado.principal.apellidoPat ?? null,
        apellidoMat: apoderado.principal.apellidoMat ?? null,
        gmail: apoderado.principal.gmail ?? null,
        contraseña: apoderado.principal.contraseña ?? undefined,
        fechaNaci: apoderado.principal.fechaNaci ?? null,
        documentoIdentidad: apoderado.principal.documentoIdentidad ?? null,
        celular: apoderado.principal.celular ?? null,
        direccion: apoderado.principal.direccion ?? null,
        parentesco: apoderado.principal.parentesco ?? null,
      })
    }

    if (apoderado.secundario) {
      if (apoderado.secundario.existe && apoderado.secundario.apoderado) {
        const ap = apoderado.secundario.apoderado
        apoderadosPayload.push({
          documentoIdentidad: ap.documentoIdentidad ?? null,
          celular: ap.celular ?? null,
          direccion: ap.direccion ?? null,
          parentesco: ap.parentesco ?? null,
        })
      } else {
        apoderadosPayload.push({
          nombre: apoderado.secundario.nombre ?? null,
          apellidoPat: apoderado.secundario.apellidoPat ?? null,
          apellidoMat: apoderado.secundario.apellidoMat ?? null,
          gmail: apoderado.secundario.gmail ?? null,
          contraseña: apoderado.secundario.contraseña ?? undefined,
          fechaNaci: apoderado.secundario.fechaNaci ?? null,
          documentoIdentidad: apoderado.secundario.documentoIdentidad ?? null,
          celular: apoderado.secundario.celular ?? null,
          direccion: apoderado.secundario.direccion ?? null,
          parentesco: apoderado.secundario.parentesco ?? null,
        })
      }
    }

    const alumnoRequest: AlumnoRequest = {
      nombre: alumnoData.nombre!,
      apellidoPat: alumnoData.apellidoPat!,
      apellidoMat: alumnoData.apellidoMat!,
      fechaNacimiento: alumnoData.fechaNacimiento!,
      direccion: alumnoData.direccion ?? null,
      documentoIdentidad: alumnoData.documentoIdentidad ?? null,
      apoderados: apoderadosPayload,
    }

    const creado = await crudAlumnos.crear.mutateAsync(alumnoRequest)
    return creado.idAlumno
  }

  async function handleFinalSubmit(matriculaValues: PasoMatriculaValues) {
    setIsSubmitting(true)
    const toastId = toast.loading("Creando matrícula...")
    try {
      let idAlumno = creadoIdAlumno

      if (!idAlumno && apoderadoData) {
        idAlumno = await handleCrearAlumno(apoderadoData)
      }

      if (!idAlumno) {
        toast.error("No se pudo crear el alumno", { id: toastId })
        return
      }

      setCreadoIdAlumno(idAlumno)

      await crud.crear.mutateAsync({
        idAlumno,
        idGradoSeccion: matriculaValues.idGradoSeccion,
        solicitudMatricula: matriculaValues.solicitudMatricula,
        fechaPago: matriculaValues.fechaPago || null,
        montoPago: matriculaValues.montoPago ?? null,
        observaciones: matriculaValues.observaciones || null,
      })

      toast.success("Matrícula creada", { id: toastId })
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear la matrícula"
      toast.error(message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepLabels = ["Alumno", "Apoderado", "Matrícula"]

  return (
    <div className="space-y-4">
      <Stepper steps={stepLabels} paso={paso} />

      {paso === 1 && (
        <PasoAlumno
          value={alumnoData}
          onChange={setAlumnoData}
          onNext={() => setPaso(2)}
        />
      )}
      {paso === 2 && (
        <PasoApoderado
          value={apoderadoData}
          onChange={setApoderadoData}
          onBack={() => setPaso(1)}
          onNext={() => setPaso(3)}
        />
      )}
      {paso === 3 && alumnoData && apoderadoData && (
        <PasoMatricula
          alumno={alumnoData}
          apoderado={apoderadoData}
          onSubmit={handleFinalSubmit}
          onBack={() => setPaso(2)}
          isSubmitting={isSubmitting}
        />
      )}

      {paso < 3 && (
        <DialogFooter>
          <DialogTrigger render={<Button variant="outline" />}>
            Cancelar
          </DialogTrigger>
        </DialogFooter>
      )}
    </div>
  )
}

function apoderadoNombre(apoderado: ApoderadoResponse): string {
  return `${apoderado.nombre} ${apoderado.apellidoPat} ${apoderado.apellidoMat}`.trim()
}
