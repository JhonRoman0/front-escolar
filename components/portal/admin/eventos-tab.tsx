"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Trash2, Plus, Camera, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  useAdminEventos,
  useCrearEvento,
  useActualizarEvento,
  useEliminarEvento,
  useSubirImagenEvento,
  useEliminarImagenEvento,
  type EventoResponse,
} from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

const schema = z
  .object({
    titulo: z.string().min(2, "Título requerido"),
    descripcion: z.string().optional(),
    lugar: z.string().optional(),
    fechaInicio: z.string().min(1, "Fecha requerida"),
    fechaFin: z.string().optional(),
    esPublico: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fechaFin && data.fechaFin < data.fechaInicio) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      })
    }
  })

type FormData = z.infer<typeof schema>

export default function EventosTab() {
  const { data: eventos = [], isLoading } = useAdminEventos()
  const crear = useCrearEvento()
  const actualizar = useActualizarEvento()
  const eliminar = useEliminarEvento()
  const subirImagen = useSubirImagenEvento()
  const eliminarImagen = useEliminarImagenEvento()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<EventoResponse | null>(null)
  const [eliminando, setEliminando] = useState<EventoResponse | null>(null)

  // Estado de la imagen: nueva a subir / marcada para quitar
  const [imagenNueva, setImagenNueva] = useState<File | null>(null)
  const [previewImagen, setPreviewImagen] = useState<string | null>(null)
  const [quitarImagen, setQuitarImagen] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const inputImagenRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      lugar: "",
      fechaInicio: "",
      fechaFin: "",
      esPublico: 1,
    },
  })

  function imagenActual(): string | null {
    if (quitarImagen) return null
    if (previewImagen) return previewImagen
    return editando?.imagenUrl ?? null
  }

  function limpiarEstadoImagen() {
    if (previewImagen) URL.revokeObjectURL(previewImagen)
    setImagenNueva(null)
    setPreviewImagen(null)
    setQuitarImagen(false)
    // Remonta el input para limpiar la selección sin tocar ref.current en render
    setInputKey((k) => k + 1)
  }

  function abrirCrear() {
    setEditando(null)
    limpiarEstadoImagen()
    form.reset({ titulo: "", descripcion: "", lugar: "", fechaInicio: "", fechaFin: "", esPublico: 1 })
    setDialogOpen(true)
  }

  function abrirEditar(ev: EventoResponse) {
    setEditando(ev)
    limpiarEstadoImagen()
    form.reset({
      titulo: ev.titulo,
      descripcion: ev.descripcion ?? "",
      lugar: ev.lugar ?? "",
      fechaInicio: ev.fechaInicio,
      fechaFin: ev.fechaFin ?? "",
      esPublico: ev.esPublico,
    })
    setDialogOpen(true)
  }

  function cerrarDialog() {
    limpiarEstadoImagen()
    setDialogOpen(false)
  }

  function handleArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewImagen) URL.revokeObjectURL(previewImagen)
    setImagenNueva(file)
    setPreviewImagen(URL.createObjectURL(file))
    setQuitarImagen(false)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      lugar: data.lugar || undefined,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin || undefined,
      esPublico: data.esPublico ?? 1,
    }

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.idEvento, data: payload })

        if (imagenNueva) {
          await subirImagen.mutateAsync({ id: editando.idEvento, file: imagenNueva })
        } else if (quitarImagen && editando.imagenUrl) {
          await eliminarImagen.mutateAsync(editando.idEvento)
        }
        toast.success("Evento actualizado")
      } else {
        const creado = await crear.mutateAsync(payload)

        if (imagenNueva) {
          await subirImagen.mutateAsync({ id: creado.idEvento, file: imagenNueva })
        }
        toast.success("Evento creado")
      }
      cerrarDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.idEvento, {
      onSuccess: () => {
        toast.success("Evento eliminado")
        setEliminando(null)
      },
      onError: () => toast.error("Error al eliminar"),
    })
  }

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Cargando...</p>

  const ocupado =
    crear.isPending || actualizar.isPending || subirImagen.isPending || eliminarImagen.isPending
  const imgVisible = imagenActual()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{eventos.length} evento(s)</p>
        <Button onClick={abrirCrear} size="sm"><Plus className="mr-2 h-4 w-4" /> Nuevo evento</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead>Fecha inicio</TableHead>
              <TableHead>Público</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.map((ev) => (
              <TableRow key={ev.idEvento}>
                <TableCell>
                  {ev.imagenUrl ? (
                    <img
                      src={ev.imagenUrl}
                      alt=""
                      className="h-10 w-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded-md bg-muted">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{ev.titulo}</TableCell>
                <TableCell>{ev.lugar ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatearFecha(new Date(ev.fechaInicio))}
                </TableCell>
                <TableCell>
                  <Badge variant={ev.esPublico === 1 ? "info" : "secondary"}>
                    {ev.esPublico === 1 ? "Público" : "Privado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(ev)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setEliminando(ev)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Imagen */}
            <div className="flex items-center gap-4">
              {imgVisible ? (
                <img
                  src={imgVisible}
                  alt="Imagen del evento"
                  className="h-20 w-32 rounded-lg object-cover border"
                />
              ) : (
                <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed bg-muted/50">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  key={inputKey}
                  ref={inputImagenRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleArchivo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputImagenRef.current?.click()}
                >
                  <Camera />
                  {imagenNueva || imgVisible ? "Cambiar imagen" : "Subir imagen"}
                </Button>
                {(imagenNueva || (editando?.imagenUrl && !quitarImagen)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (previewImagen) URL.revokeObjectURL(previewImagen)
                      setPreviewImagen(null)
                      setImagenNueva(null)
                      setQuitarImagen(!imagenNueva && !!editando?.imagenUrl)
                      setInputKey((k) => k + 1)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input {...form.register("titulo")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <Textarea rows={3} {...form.register("descripcion")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Lugar</label>
              <Input {...form.register("lugar")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha inicio *</label>
                <Input type="datetime-local" {...form.register("fechaInicio")} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha fin</label>
                <Input type="datetime-local" {...form.register("fechaFin")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarDialog}>Cancelar</Button>
              <Button type="submit" disabled={ocupado}>
                {ocupado ? "Guardando..." : editando ? "Guardar cambios" : "Crear evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eliminando} onOpenChange={() => setEliminando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar evento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar &quot;{eliminando?.titulo}&quot;? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminar.isPending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
