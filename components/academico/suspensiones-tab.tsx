"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, StopCircle } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import {
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useCrearSuspension,
  useDocentes,
  useEliminarSuspension,
  useFinalizarSuspension,
  useSuspensiones,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import type { SuspensionRequest } from "@/lib/api/academico"

const suspensionSchema = z.object({
  idDocente: z.number().int().min(1, "Selecciona un docente"),
  idSustituto: z.number().int().optional(),
  motivo: z.string().min(1, "El motivo es requerido").max(100),
  motivoDetalle: z.string().max(300).optional(),
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)"),
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)")
    .optional()
    .or(z.literal("")),
})

type SuspensionFormValues = z.infer<typeof suspensionSchema>

export default function SuspensionesTab() {
  const { data: suspensiones = [], isLoading, isError, refetch } = useSuspensiones()
  const { data: docentes = [] } = useDocentes()
  const crear = useCrearSuspension()
  const finalizar = useFinalizarSuspension()
  const eliminar = useEliminarSuspension()
  const puedeCrear = usePuede("SUSPENSIONES_DOCENTE", "CREAR")
  const puedeEliminar = usePuede("SUSPENSIONES_DOCENTE", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleFinalizar(id: number) {
    try {
      await finalizar.mutateAsync(id)
      toast.success("Suspensión finalizada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al finalizar")
    }
  }

  async function handleEliminar(id: number) {
    try {
      await eliminar.mutateAsync(id)
      toast.success("Suspensión eliminada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Suspensiones de Docente</h2>
            <p className="text-sm text-muted-foreground">
              Registra suspensiones y sustituciones temporales de docentes.
            </p>
          </div>
          {puedeCrear && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus />
              Nueva suspensión
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Docente</TableHead>
              <TableHead>Sustituto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !suspensiones.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay suspensiones registradas." />
            ) : (
              suspensiones.map((s) => {
                const activa = !s.fechaFin || new Date(s.fechaFin) >= new Date()
                return (
                  <TableRow key={s.idSuspension}>
                    <TableCell className="font-medium">{s.docente}</TableCell>
                    <TableCell>{s.sustituto || "—"}</TableCell>
                    <TableCell className="text-xs">{s.motivo}</TableCell>
                    <TableCell className="text-xs">{s.fechaInicio}</TableCell>
                    <TableCell className="text-xs">{s.fechaFin || "Indefinida"}</TableCell>
                    <TableCell>
                      <Badge variant={activa ? "warning" : "outline"}>
                        {activa ? "Activa" : "Finalizada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {activa && puedeCrear && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Finalizar suspensión"
                            onClick={() => handleFinalizar(s.idSuspension)}
                            disabled={finalizar.isPending}
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <ConfirmarEliminar
                            titulo="Eliminar suspensión"
                            descripcion="Se eliminará este registro de suspensión."
                            onConfirm={() => handleEliminar(s.idSuspension)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}

        <SuspensionFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          docentes={docentes.map((d) => ({
            id: d.idDocente,
            nombre: `${d.nombre} ${d.apellidoPat} ${d.apellidoMat}`,
          }))}
          crear={crear}
        />
      </CardContent>
    </Card>
  )
}

function SuspensionFormDialog({
  open,
  onOpenChange,
  docentes,
  crear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docentes: { id: number; nombre: string }[]
  crear: ReturnType<typeof useCrearSuspension>
}) {
  const form = useForm<SuspensionFormValues>({
    resolver: zodResolver(suspensionSchema),
    defaultValues: {
      idDocente: 0,
      idSustituto: undefined,
      motivo: "",
      motivoDetalle: "",
      fechaInicio: "",
      fechaFin: "",
    },
  })

  async function onSubmit(values: SuspensionFormValues) {
    try {
      const data: SuspensionRequest = {
        idDocente: values.idDocente,
        motivo: values.motivo,
        motivoDetalle: values.motivoDetalle || undefined,
        fechaInicio: values.fechaInicio,
        fechaFin: values.fechaFin || undefined,
      }
      if (values.idSustituto) data.idSustituto = values.idSustituto
      await crear.mutateAsync(data)
      toast.success("Suspensión registrada")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva suspensión</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="idDocente"
            render={({ field }) => (
              <Field>
                <FieldLabel>Docente a suspender</FieldLabel>
                <FieldContent>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    <option value="">Selecciona un docente</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={[form.formState.errors.idDocente]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="idSustituto"
            render={({ field }) => (
              <Field>
                <FieldLabel>Docente sustituto (opcional)</FieldLabel>
                <FieldContent>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                  >
                    <option value="">Sin sustituto</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="motivo"
            render={({ field }) => (
              <Field>
                <FieldLabel>Motivo</FieldLabel>
                <FieldContent>
                  <Input placeholder="Enfermedad, licencia, etc." {...field} />
                  <FieldError errors={[form.formState.errors.motivo]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="motivoDetalle"
            render={({ field }) => (
              <Field>
                <FieldLabel>Detalle (opcional)</FieldLabel>
                <FieldContent>
                  <Input placeholder="Descripción adicional" {...field} />
                </FieldContent>
              </Field>
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Controller
              control={form.control}
              name="fechaFin"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de fin (opcional)</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[form.formState.errors.fechaFin]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="animate-spin" />}
              Registrar suspensión
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
