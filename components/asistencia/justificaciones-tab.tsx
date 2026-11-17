"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import {
  AccionesFila,
  CampoAcceso,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import {
  useCrudJustificaciones,
  useJustificaciones,
} from "@/hooks/use-asistencia"
import { usePuede } from "@/hooks/use-permisos"
import type { JustificacionResponse } from "@/lib/api/justificacion"
import {
  justificacionSchema,
  type JustificacionValues,
} from "@/lib/schemas/asistencia"
import { formatearFecha } from "@/lib/fechas"

export function JustificacionesTab() {
  const { data, isLoading, isError, refetch } = useJustificaciones()
  const crud = useCrudJustificaciones()
  // Motivos y feriados: todo con "Gestionar motivos y feriados".
  const puedeConfigurar = usePuede("ASISTENCIAS", "CONFIGURAR")
  const puedeCrear = puedeConfigurar
  const puedeActualizar = puedeConfigurar
  const puedeEliminar = puedeConfigurar
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<JustificacionResponse | null>(null)

  // Los más recientes primero para revisar el catálogo con contexto.
  const ordenadas = [...(data ?? [])].sort((a, b) =>
    (b.fechaRegistro ?? "").localeCompare(a.fechaRegistro ?? "")
  )

  async function handleEliminar(j: JustificacionResponse) {
    try {
      await crud.eliminar.mutateAsync(j.idJustificacion)
      toast.success(`Motivo "${j.motivo}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderSeccion
          titulo="Motivos de justificación"
          descripcion="Motivos disponibles al justificar ingresos tardíos o inasistencias."
          acciones={
            <BotonNuevo
              texto="Nuevo motivo"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motivo</TableHead>
              <TableHead>Fecha de registro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={4} />
            ) : isError ? (
              <MensajeSinDatos
                columnas={4}
                mensaje="No se pudo cargar. Recarga la pantalla."
              />
            ) : !ordenadas.length ? (
              <MensajeSinDatos columnas={4} mensaje="Aún no hay motivos de justificación." />
            ) : (
              ordenadas.map((j) => (
                <TableRow key={j.idJustificacion}>
                  <TableCell className="font-medium">{j.motivo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatearFecha(j.fechaRegistro)}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge accesoId={j.accesoId} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AccionesFila
                      puedeActualizar={puedeActualizar}
                      puedeEliminar={puedeEliminar}
                      onEditar={() => {
                        setEditando(j)
                        setDialogOpen(true)
                      }}
                      onEliminar={() => handleEliminar(j)}
                      tituloEliminar="Eliminar motivo"
                      descripcionEliminar={`Se marcará "${j.motivo}" como eliminado.`}
                      ariaEditar={`Editar ${j.motivo}`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {isError && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        )}
        <JustificacionDialog
          key={editando?.idJustificacion ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          justificacion={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

function JustificacionDialog({
  open,
  onOpenChange,
  justificacion,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  justificacion?: JustificacionResponse | null
  crear: ReturnType<typeof useCrudJustificaciones>["crear"]
  actualizar: ReturnType<typeof useCrudJustificaciones>["actualizar"]
}) {
  const esEdicion = !!justificacion
  const form = useForm<JustificacionValues>({
    resolver: zodResolver(justificacionSchema),
    defaultValues: {
      motivo: justificacion?.motivo ?? "",
      accesoId: justificacion?.accesoId ?? 1,
    },
  })

  async function onSubmit(values: JustificacionValues) {
    try {
      if (esEdicion && justificacion) {
        await actualizar.mutateAsync({
          id: justificacion.idJustificacion,
          data: values,
        })
        toast.success("Motivo actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Motivo creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar motivo" : "Nuevo motivo de justificación"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Controller
            control={form.control}
            name="motivo"
            render={({ field }) => (
              <Field>
                <FieldLabel>Motivo</FieldLabel>
                <FieldContent>
                  <Input placeholder="Cita médica" {...field} />
                  <FieldError errors={[form.formState.errors.motivo]} />
                </FieldContent>
              </Field>
            )}
          />
          {esEdicion && (
            <Controller
              control={form.control}
              name="accesoId"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <FieldContent>
                    <CampoAcceso value={field.value} onChange={field.onChange} />
                  </FieldContent>
                </Field>
              )}
            />
          )}
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button
              type="submit"
              disabled={crear.isPending || actualizar.isPending}
            >
              {(crear.isPending || actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear motivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
