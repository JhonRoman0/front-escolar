"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, X } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

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

import { ConfirmarEliminar } from "@/components/seguridad/confirmar-eliminar"
import { EstadoBadge } from "@/components/seguridad/estado-badge"
import {
  CampoAcceso,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useCrudGrados,
  useGrados,
  useTurnos,
} from "@/hooks/use-academico"
import type { GradoRequest, GradoResponse } from "@/lib/api/academico"
import { gradoSchema, type GradoValues } from "@/lib/schemas/academico"
import { usePuede } from "@/hooks/use-permisos"

const NIVELES = [
  { idNivel: 1, nombre: "Inicial" },
  { idNivel: 2, nombre: "Primaria" },
  { idNivel: 3, nombre: "Secundaria" },
] as const

export default function GradosTab() {
  const { data, isLoading, isError, refetch } = useGrados()
  const crud = useCrudGrados()
  const puedeCrear = usePuede("GRADOS", "CREAR")
  const puedeActualizar = usePuede("GRADOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("GRADOS", "ELIMINAR")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<GradoResponse | null>(null)

  async function handleEliminar(grado: GradoResponse) {
    try {
      await crud.eliminar.mutateAsync(grado.idGrado)
      toast.success(`Grado "${grado.nombre}" eliminado`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Grados</h2>
            <p className="text-sm text-muted-foreground">
              Un grado agrupa secciones dentro de un turno y año escolar.
            </p>
          </div>
          {puedeCrear && (
            <Button
              onClick={() => {
                setEditando(null)
                setDialogOpen(true)
              }}
            >
              <Plus />
              Nuevo grado
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grado</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Secciones</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={7} />
            ) : isError ? (
              <MensajeSinDatos columnas={7} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !data?.length ? (
              <MensajeSinDatos columnas={7} mensaje="Aún no hay grados." />
            ) : (
              data.map((grado) => (
                <TableRow key={grado.idGrado}>
                  <TableCell className="font-medium">{grado.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{grado.nivel}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {grado.secciones.map((s) => (
                        <Badge key={s.idSeccion} variant="secondary">
                          {s.nombre}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{grado.turno}</TableCell>
                  <TableCell>{grado.anio}</TableCell>
                  <TableCell>
                    <EstadoBadge accesoId={grado.accesoId} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {puedeActualizar && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Editar ${grado.nombre}`}
                          onClick={() => {
                            setEditando(grado)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil />
                        </Button>
                      )}
                      {puedeEliminar && (
                        <ConfirmarEliminar
                          titulo="Eliminar grado"
                          descripcion={`Se marcará "${grado.nombre}" y sus secciones como eliminado.`}
                          onConfirm={() => handleEliminar(grado)}
                        />
                      )}
                    </div>
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

        <GradoFormDialog
          key={editando?.idGrado ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          grado={editando}
        />
      </CardContent>
    </Card>
  )
}

function GradoFormDialog({
  open,
  onOpenChange,
  grado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grado?: GradoResponse | null
}) {
  const crud = useCrudGrados()
  const { data: anios = [] } = useAniosEscolares()
  const { data: turnos = [] } = useTurnos()
  const esEdicion = !!grado

  const form = useForm<GradoValues>({
    resolver: zodResolver(gradoSchema),
    defaultValues: {
      nombre: grado?.nombre ?? "",
      idNivel: grado?.idNivel ?? 0,
      idAnio: grado?.idAnio ?? 0,
      idTurno: grado?.idTurno ?? 0,
      secciones: grado?.secciones.map((s) => s.nombre) ?? [],
      accesoId: grado?.accesoId ?? 1,
    },
  })

  const idNivelSeleccionado = form.watch("idNivel")

  function buildRequest(values: GradoValues): GradoRequest {
    const data: GradoRequest = {
      nombre: values.nombre,
      idNivel: values.idNivel,
      idAnio: values.idAnio,
      idTurno: values.idTurno,
      secciones: values.idNivel === 1
        ? []
        : values.secciones.map((s) => s.trim()).filter(Boolean),
    }
    if (esEdicion) data.accesoId = values.accesoId
    return data
  }

  async function onSubmit(values: GradoValues) {
    try {
      if (esEdicion && grado) {
        await crud.actualizar.mutateAsync({
          id: grado.idGrado,
          data: buildRequest(values),
        })
        toast.success("Grado actualizado")
      } else {
        await crud.crear.mutateAsync(buildRequest(values))
        toast.success("Grado creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  const enviando = crud.crear.isPending || crud.actualizar.isPending
  const idNivelVal = form.watch("idNivel")
  const idAnioVal = form.watch("idAnio")
  const idTurnoVal = form.watch("idTurno")
  const submitDisabled = enviando || !idNivelVal || !idAnioVal || !idTurnoVal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar grado" : "Nuevo grado"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nombre del grado</FieldLabel>
                <FieldContent>
                  <Input placeholder="Primero de Secundaria" {...field} />
                  <FieldError errors={[form.formState.errors.nombre]} />
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="idNivel"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nivel</FieldLabel>
                <FieldContent>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      const val = Number(v)
                      field.onChange(val)
                      if (val === 1) form.setValue("secciones", [])
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {NIVELES.find((n) => n.idNivel === field.value)?.nombre ??
                          "Selecciona"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {NIVELES.map((n) => (
                        <SelectItem key={n.idNivel} value={String(n.idNivel)}>
                          {n.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.idNivel]} />
                </FieldContent>
              </Field>
            )}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="idAnio"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Año escolar</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {anios.find((a) => a.idAnio === field.value)?.anio ??
                            "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {anios.map((a) => (
                          <SelectItem key={a.idAnio} value={String(a.idAnio)}>
                            {a.anio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idAnio]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="idTurno"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Turno</FieldLabel>
                  <FieldContent>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {turnos.find((t) => t.idTurno === field.value)?.nombre ??
                            "Selecciona"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {turnos.map((t) => (
                          <SelectItem key={t.idTurno} value={String(t.idTurno)}>
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[form.formState.errors.idTurno]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          {idNivelSeleccionado !== 1 && (
            <Field>
              <FieldLabel>Secciones</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="secciones"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {field.value.map((seccion, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            className="flex-1"
                            placeholder="A"
                            value={seccion}
                            onChange={(e) => {
                              const next = [...field.value]
                              next[index] = e.target.value
                              field.onChange(next)
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={field.value.length <= 1}
                            onClick={() =>
                              field.onChange(
                                field.value.filter((_, i) => i !== index)
                              )
                            }
                            aria-label={`Quitar sección ${index + 1}`}
                          >
                            <X />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange([...field.value, ""])}
                      >
                        <Plus />
                        Agregar sección
                      </Button>
                    </div>
                  )}
                />
                <FieldError errors={[form.formState.errors.secciones]} />
              </FieldContent>
            </Field>
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
            <Button type="submit" disabled={submitDisabled}>
              {enviando && <Loader2 className="animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear grado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}