"use client"

import { useState } from "react"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

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
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { CampoChip } from "@/components/shared/campo-chip"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { AccionesFila, CampoAcceso, FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { guardarConToast } from "@/hooks/guardar-con-toast"
import { useEliminarConToast } from "@/hooks/use-eliminar-toast"
import { useCrudMetodosPago, useMetodosPago } from "@/hooks/use-pagos"
import { usePuede } from "@/hooks/use-permisos"
import { useResetAlAbrir } from "@/hooks/use-reset-al-abrir"
import { ACCESO } from "@/lib/api/academico"
import type { MetodoPagoResponse } from "@/lib/api/pagos"

const metodoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(40, "Máximo 40 caracteres"),
  requiereCodigo: z.boolean(),
  requiereComprobante: z.boolean(),
  accesoId: z.number(),
})
type MetodoValues = z.infer<typeof metodoSchema>

function SiNo({ valor }: { valor: boolean }) {
  return valor ? <Badge variant="info">Sí</Badge> : <span className="text-muted-foreground">No</span>
}

export function MetodosPagoTab() {
  const { data, isLoading, isError, refetch } = useMetodosPago()
  const crud = useCrudMetodosPago()
  const puedeCrear = usePuede("PAGOS_MATRICULA", "CREAR")
  const puedeActualizar = usePuede("PAGOS_MATRICULA", "ACTUALIZAR")
  const puedeEliminar = usePuede("PAGOS_MATRICULA", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<MetodoPagoResponse | null>(null)
  const eliminarConToast = useEliminarConToast()

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Métodos de pago"
          descripcion="Cómo se puede pagar la matrícula. Indica si cada método pide código de transacción y foto del comprobante."
          acciones={
            <BotonNuevo
              texto="Nuevo método"
              puedeCrear={puedeCrear}
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            />
          }
        />
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader appearance="soft-gray">
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead className="text-center">Pide código</TableHead>
                <TableHead className="text-center">Pide comprobante</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={5} />
              ) : isError ? (
                <MensajeSinDatos columnas={5} mensaje="No se pudo cargar. Recarga la pantalla." />
              ) : !data?.length ? (
                <MensajeSinDatos columnas={5} mensaje="Aún no hay métodos de pago. Crea al menos uno para poder matricular." />
              ) : (
                data.map((metodo) => (
                  <TableRow key={metodo.idMetodoPago}>
                    <TableCell className="font-medium">{metodo.nombre}</TableCell>
                    <TableCell className="text-center"><SiNo valor={metodo.requiereCodigo} /></TableCell>
                    <TableCell className="text-center"><SiNo valor={metodo.requiereComprobante} /></TableCell>
                    <TableCell className="text-center">
                      <EstadoBadge accesoId={metodo.activo ? ACCESO.ACTIVO : ACCESO.INACTIVO} />
                    </TableCell>
                    <TableCell className="text-center">
                      <AccionesFila
                        className="justify-center"
                        puedeActualizar={puedeActualizar}
                        puedeEliminar={puedeEliminar}
                        onEditar={() => {
                          setEditando(metodo)
                          setDialogOpen(true)
                        }}
                        onEliminar={() =>
                          eliminarConToast(crud.eliminar.mutateAsync, {
                            id: metodo.idMetodoPago,
                            mensaje: `Método "${metodo.nombre}" eliminado`,
                          })
                        }
                        tituloEliminar="Eliminar método de pago"
                        descripcionEliminar={`¿Seguro que quieres eliminar "${metodo.nombre}"? Los pagos ya registrados lo conservan.`}
                        ariaEditar={`Editar ${metodo.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isError && <BotonReintentar refetch={refetch} />}
        <MetodoPagoDialog open={dialogOpen} onOpenChange={setDialogOpen} metodo={editando} crud={crud} />
      </CardContent>
    </Card>
  )
}

function MetodoPagoDialog({
  open,
  onOpenChange,
  metodo,
  crud,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  metodo: MetodoPagoResponse | null
  crud: ReturnType<typeof useCrudMetodosPago>
}) {
  const esEdicion = !!metodo
  const nombre = metodo?.nombre ?? ""
  const requiereCodigo = metodo?.requiereCodigo ?? true
  const requiereComprobante = metodo?.requiereComprobante ?? true
  const accesoId = metodo && !metodo.activo ? ACCESO.INACTIVO : ACCESO.ACTIVO
  const form = useForm<MetodoValues>({
    resolver: zodResolver(metodoSchema),
    defaultValues: { nombre, requiereCodigo, requiereComprobante, accesoId },
  })
  useResetAlAbrir(open, form, { nombre, requiereCodigo, requiereComprobante, accesoId }, [
    nombre,
    requiereCodigo,
    requiereComprobante,
    accesoId,
  ])

  async function onSubmit(values: MetodoValues) {
    const data = {
      nombre: values.nombre,
      requiereCodigo: values.requiereCodigo,
      requiereComprobante: values.requiereComprobante,
      activo: values.accesoId === ACCESO.ACTIVO,
    }
    await guardarConToast(async () => {
      if (metodo) await crud.actualizar.mutateAsync({ id: metodo.idMetodoPago, data })
      else await crud.crear.mutateAsync(data)
      toast.success(esEdicion ? "Método de pago actualizado" : "Método de pago creado")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {esEdicion ? "Editar método de pago" : "Nuevo método de pago"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Yape" autoFocus maxLength={40} {...field} />
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Field>
              <FieldLabel>Al registrar un pago con este método</FieldLabel>
              <FieldContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="requiereCodigo"
                    render={({ field }) => (
                      <CampoChip checked={field.value} onCheckedChange={field.onChange}>
                        Pide código de transacción
                      </CampoChip>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="requiereComprobante"
                    render={({ field }) => (
                      <CampoChip checked={field.value} onCheckedChange={field.onChange}>
                        Pide foto del comprobante
                      </CampoChip>
                    )}
                  />
                </div>
                <FieldDescription className="text-xs">
                  Por ejemplo, el efectivo no pide ni código ni comprobante.
                </FieldDescription>
              </FieldContent>
            </Field>
            {esEdicion && (
              <Controller
                control={form.control}
                name="accesoId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Estado</FieldLabel>
                    <FieldContent>
                      <CampoAcceso value={field.value} onChange={field.onChange} />
                      <FieldDescription className="text-xs">
                        Un método inactivo no aparece al matricular.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              />
            )}
          </FieldGroup>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>Cancelar</DialogTrigger>
            <BotonGuardar
              etiqueta={esEdicion ? "Guardar cambios" : "Crear método"}
              enviando={crud.crear.isPending || crud.actualizar.isPending}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
