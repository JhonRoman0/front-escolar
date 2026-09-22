"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

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

import {
  AccionesFila,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useCrudRecreos,
  useGradosPorNivel,
  useNiveles,
  useRecreos,
} from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import { horaCorta } from "@/lib/api/academico"
import type { RecreoResponse, RecreoRequest } from "@/lib/api/academico"

const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
]

const recreoSchema = z
  .object({
    idNivel: z.number().int().min(1, "Selecciona un nivel"),
    idGradoSeccion: z.number().int().optional(),
    diaSemana: z.number().int().min(1).max(7, "Selecciona un día"),
    horaInicio: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora requerida (HH:mm)"),
    horaFin: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora requerida (HH:mm)"),
  })
  .refine((data) => data.horaFin > data.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["horaFin"],
  })

type RecreoFormValues = z.infer<typeof recreoSchema>

export default function RecreosTab() {
  const { data: recreos = [], isLoading, isError, refetch } = useRecreos()
  const crud = useCrudRecreos()
  const puedeCrear = usePuede("RECREOS", "CREAR")
  const puedeActualizar = usePuede("RECREOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("RECREOS", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<RecreoResponse | null>(null)

  async function handleEliminar(recreo: RecreoResponse) {
    try {
      await crud.eliminar.mutateAsync(recreo.idRecreo)
      toast.success("Recreo eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recreos</h2>
            <p className="text-sm text-muted-foreground">
              Define los horarios de recreo por nivel y día de la semana.
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
              Nuevo recreo
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nivel</TableHead>
              <TableHead>Grado-Sección</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <FilasCargando columnas={6} />
            ) : isError ? (
              <MensajeSinDatos columnas={6} mensaje="No se pudo cargar. Recarga la pantalla." />
            ) : !recreos.length ? (
              <MensajeSinDatos columnas={6} mensaje="Aún no hay recreos configurados." />
            ) : (
              recreos.map((r) => (
                <TableRow key={r.idRecreo}>
                  <TableCell className="font-medium">{r.nivel}</TableCell>
                  <TableCell>{r.gradoSeccion || "Todo el nivel"}</TableCell>
                  <TableCell>
                    {DIAS_SEMANA.find((d) => d.value === r.diaSemana)?.label ?? r.diaSemana}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(r.horaInicio)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {horaCorta(r.horaFin)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AccionesFila
                      puedeActualizar={puedeActualizar}
                      puedeEliminar={puedeEliminar}
                      onEditar={() => {
                        setEditando(r)
                        setDialogOpen(true)
                      }}
                      onEliminar={() => handleEliminar(r)}
                      tituloEliminar="Eliminar recreo"
                      descripcionEliminar="Se eliminará este recreo."
                      ariaEditar="Editar recreo"
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

        <RecreoFormDialog
          key={editando?.idRecreo ?? "nuevo"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          recreo={editando}
          crud={crud}
        />
      </CardContent>
    </Card>
  )
}

function RecreoFormDialog({
  open,
  onOpenChange,
  recreo,
  crud,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recreo?: RecreoResponse | null
  crud: ReturnType<typeof useCrudRecreos>
}) {
  const esEdicion = !!recreo
  const { data: niveles = [] } = useNiveles()
  const [idNivelSel, setIdNivelSel] = useState<number | null>(
    recreo?.idNivel ?? null
  )
  const { data: grados = [] } = useGradosPorNivel(idNivelSel)

  const form = useForm<RecreoFormValues>({
    resolver: zodResolver(recreoSchema),
    defaultValues: {
      idNivel: recreo?.idNivel ?? 0,
      idGradoSeccion: recreo?.idGradoSeccion ?? undefined,
      diaSemana: recreo?.diaSemana ?? 1,
      horaInicio: recreo ? horaCorta(recreo.horaInicio) : "",
      horaFin: recreo ? horaCorta(recreo.horaFin) : "",
    },
  })

  function handleNivelChange(value: number) {
    setIdNivelSel(value)
    form.setValue("idNivel", value, { shouldValidate: true })
    form.setValue("idGradoSeccion", undefined)
  }

  const secciones = grados.flatMap((g) =>
    g.secciones.map((s) => ({
      id: s.idGradoSeccion,
      label: `${g.nombre} - ${s.nombre}`,
    }))
  )

  async function onSubmit(values: RecreoFormValues) {
    try {
      const data: RecreoRequest = {
        idNivel: values.idNivel,
        idGradoSeccion: values.idGradoSeccion ?? null,
        diaSemana: values.diaSemana,
        horaInicio: values.horaInicio + ":00",
        horaFin: values.horaFin + ":00",
      }
      if (esEdicion && recreo) {
        await crud.actualizar.mutateAsync({ id: recreo.idRecreo, data })
        toast.success("Recreo actualizado")
      } else {
        await crud.crear.mutateAsync(data)
        toast.success("Recreo creado")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar recreo" : "Nuevo recreo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="idNivel"
            render={({ field }) => (
              <Field>
                <FieldLabel>Nivel</FieldLabel>
                <FieldContent>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.value || ""}
                    onChange={(e) => handleNivelChange(Number(e.target.value))}
                  >
                    <option value="">Selecciona un nivel</option>
                    {niveles.map((n) => (
                      <option key={n.idNivel} value={n.idNivel}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={[form.formState.errors.idNivel]} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="idGradoSeccion"
            render={({ field }) => (
              <Field>
                <FieldLabel>Grado-Sección (opcional)</FieldLabel>
                <FieldContent>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                  >
                    <option value="">Todo el nivel</option>
                    {secciones.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="diaSemana"
            render={({ field }) => (
              <Field>
                <FieldLabel>Día de la semana</FieldLabel>
                <FieldContent>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={[form.formState.errors.diaSemana]} />
                </FieldContent>
              </Field>
            )}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="horaInicio"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Hora de inicio</FieldLabel>
                  <FieldContent>
                    <Input type="time" {...field} />
                    <FieldError errors={[form.formState.errors.horaInicio]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="horaFin"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Hora de fin</FieldLabel>
                  <FieldContent>
                    <Input type="time" {...field} />
                    <FieldError errors={[form.formState.errors.horaFin]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <Button type="submit" disabled={crud.crear.isPending || crud.actualizar.isPending}>
              {(crud.crear.isPending || crud.actualizar.isPending) && (
                <Loader2 className="animate-spin" />
              )}
              {esEdicion ? "Guardar cambios" : "Crear recreo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
