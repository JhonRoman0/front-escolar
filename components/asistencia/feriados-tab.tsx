"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
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
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  AccionesFila,
  CampoAcceso,
  FilasCargando,
  HeaderTabla,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { useCrudFeriados, useDiasFeriados } from "@/hooks/use-asistencia"
import { useAniosEscolares } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import type { DiaFeriadoResponse } from "@/lib/api/dia-feriado"
import {
  diaFeriadoSchema,
  type DiaFeriadoValues,
} from "@/lib/schemas/asistencia"
import { fechaHoyISO, formatearFecha } from "@/lib/fechas"

export function FeriadosTab() {
  const { data, isLoading, isError, refetch } = useDiasFeriados()
  const crud = useCrudFeriados()
  const puedeCrear = usePuede("ASISTENCIAS", "CREAR")
  const puedeActualizar = usePuede("ASISTENCIAS", "ACTUALIZAR")
  const puedeEliminar = usePuede("ASISTENCIAS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<DiaFeriadoResponse | null>(null)

  // Los próximos feriados primero.
  const ordenados = [...(data ?? [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  )

  async function handleEliminar(f: DiaFeriadoResponse) {
    try {
      await crud.eliminar.mutateAsync(f.idDiaFeriado)
      toast.success(
        `Feriado del ${formatearFecha(f.fecha)} eliminado`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <HeaderTabla
          titulo="Días feriados"
          descripcion="Fechas sin clases; el back no registra asistencia en esos días."
          puedeCrear={puedeCrear}
          onNuevo={() => {
            setEditando(null)
            setDialogOpen(true)
          }}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Año escolar</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={5} />
            ) : isError ? (
              <MensajeSinDatos
                columnas={5}
                mensaje="No se pudo cargar. Recarga la pantalla."
              />
            ) : !ordenados.length ? (
              <MensajeSinDatos columnas={5} mensaje="Aún no hay días feriados." />
            ) : (
              ordenados.map((f) => (
                <TableRow key={f.idDiaFeriado}>
                  <TableCell className="font-medium">
                    {formatearFecha(f.fecha)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.motivo}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.anio ?? "Todos los años"}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge accesoId={f.accesoId} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AccionesFila
                      puedeActualizar={puedeActualizar}
                      puedeEliminar={puedeEliminar}
                      onEditar={() => {
                        setEditando(f)
                        setDialogOpen(true)
                      }}
                      onEliminar={() => handleEliminar(f)}
                      tituloEliminar="Eliminar feriado"
                      descripcionEliminar={`Se marcará el feriado del ${formatearFecha(f.fecha)} como eliminado.`}
                      ariaEditar={`Editar feriado del ${formatearFecha(f.fecha)}`}
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
        <FeriadoDialog
          key={editando?.idDiaFeriado ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          feriado={editando}
          existentes={data ?? []}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />
      </CardContent>
    </Card>
  )
}

function FeriadoDialog({
  open,
  onOpenChange,
  feriado,
  existentes,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  feriado?: DiaFeriadoResponse | null
  existentes: DiaFeriadoResponse[]
  crear: ReturnType<typeof useCrudFeriados>["crear"]
  actualizar: ReturnType<typeof useCrudFeriados>["actualizar"]
}) {
  const esEdicion = !!feriado
  const { data: anios = [] } = useAniosEscolares()
  const form = useForm<DiaFeriadoValues>({
    resolver: zodResolver(diaFeriadoSchema),
    defaultValues: {
      fecha: feriado?.fecha ?? fechaHoyISO(),
      motivo: feriado?.motivo ?? "",
      idAnioEscolar: feriado?.idAnioEscolar ?? null,
      accesoId: feriado?.accesoId ?? 1,
    },
  })

  // El back NO rechaza duplicados: advertimos pero no bloqueamos.
  const fechaActual = useWatch({ control: form.control, name: "fecha" }) ?? ""
  const anioActual =
    useWatch({ control: form.control, name: "idAnioEscolar" }) ?? null
  const duplicado = useMemo(
    () =>
      !!fechaActual &&
      existentes.some(
        (f) =>
          f.idDiaFeriado !== feriado?.idDiaFeriado &&
          f.fecha === fechaActual &&
          (f.idAnioEscolar ?? null) === (anioActual ?? null)
      ),
    [existentes, fechaActual, anioActual, feriado]
  )

  async function onSubmit(values: DiaFeriadoValues) {
    try {
      if (esEdicion && feriado) {
        await actualizar.mutateAsync({ id: feriado.idDiaFeriado, data: values })
        toast.success("Feriado actualizado")
      } else {
        await crear.mutateAsync(values)
        toast.success("Feriado creado")
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
            {esEdicion ? "Editar feriado" : "Nuevo día feriado"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[form.formState.errors.fecha]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idAnioEscolar"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Año escolar</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) =>
                        field.onChange(v === "" ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-full text-foreground">
                        <SelectValue placeholder="Todos los años">
                          {anios.find((a) => a.idAnio === field.value)?.anio ??
                            "Todos los años"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los años</SelectItem>
                        {anios
                          .filter((a) => a.accesoId === 1)
                          .map((a) => (
                            <SelectItem key={a.idAnio} value={a.idAnio.toString()}>
                              {a.anio}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Vacío aplica a todo el colegio; elige un año solo si el
                      feriado pertenece a ese año escolar.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="motivo"
            render={({ field }) => (
              <Field>
                <FieldLabel>Motivo</FieldLabel>
                <FieldContent>
                  <Input placeholder="Día de la bandera" {...field} />
                  <FieldError errors={[form.formState.errors.motivo]} />
                </FieldContent>
              </Field>
            )}
          />
          {duplicado && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Ya existe un feriado para esa fecha y año escolar. Puedes
              guardarlo igual, pero quedarán dos registros idénticos.
            </p>
          )}
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
              {esEdicion ? "Guardar cambios" : "Crear feriado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
