"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Trash2, Plus, ExternalLink, Camera, Image as ImageIcon } from "lucide-react"

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
  useAdminPublicaciones,
  useCrearPublicacion,
  useActualizarPublicacion,
  useEliminarPublicacion,
  useSubirImagenPublicacion,
  useEliminarImagenPublicacion,
  type PublicacionResponse,
} from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

const schema = z.object({
  titulo: z.string().min(2, "Título requerido"),
  slug: z.string().optional(),
  contenido: z.string().optional(),
  categoria: z.string().optional(),
  esDestacado: z.number().optional(),
  estado: z.number().optional(),
})

type FormData = z.infer<typeof schema>

export default function PublicacionesTab() {
  const { data: publicaciones = [], isLoading } = useAdminPublicaciones()
  const crear = useCrearPublicacion()
  const actualizar = useActualizarPublicacion()
  const eliminar = useEliminarPublicacion()
  const subirImagen = useSubirImagenPublicacion()
  const eliminarImagen = useEliminarImagenPublicacion()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<PublicacionResponse | null>(null)
  const [eliminando, setEliminando] = useState<PublicacionResponse | null>(null)

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
      slug: "",
      contenido: "",
      categoria: "",
      esDestacado: 0,
      estado: 1,
    },
  })

  /** Imagen visible en el form: preview nuevo > actual de Cloudinary > nada. */
  function imagenActual(): string | null {
    if (quitarImagen) return null
    if (previewImagen) return previewImagen
    return editando?.imagenPortadaUrl ?? null
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
    form.reset({ titulo: "", slug: "", contenido: "", categoria: "", esDestacado: 0, estado: 1 })
    setDialogOpen(true)
  }

  function abrirEditar(pub: PublicacionResponse) {
    setEditando(pub)
    limpiarEstadoImagen()
    form.reset({
      titulo: pub.titulo,
      slug: pub.slug ?? "",
      contenido: pub.contenido ?? "",
      categoria: pub.categoria ?? "",
      esDestacado: pub.esDestacado,
      estado: pub.estado,
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
      slug: data.slug || undefined,
      contenido: data.contenido || undefined,
      categoria: data.categoria || undefined,
      esDestacado: data.esDestacado ?? 0,
      estado: data.estado ?? 1,
    }

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.idPublicacion, data: payload })

        if (imagenNueva) {
          await subirImagen.mutateAsync({ id: editando.idPublicacion, file: imagenNueva })
        } else if (quitarImagen && editando.imagenPortadaUrl) {
          await eliminarImagen.mutateAsync(editando.idPublicacion)
        }
        toast.success("Publicación actualizada")
      } else {
        const creada = await crear.mutateAsync(payload)

        if (imagenNueva) {
          await subirImagen.mutateAsync({ id: creada.idPublicacion, file: imagenNueva })
        }
        toast.success("Publicación creada")
      }
      cerrarDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.idPublicacion, {
      onSuccess: () => {
        toast.success("Publicación eliminada")
        setEliminando(null)
      },
      onError: () => toast.error("Error al eliminar"),
    })
  }

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">Cargando...</p>
  }

  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    subirImagen.isPending ||
    eliminarImagen.isPending
  const imgVisible = imagenActual()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {publicaciones.length} publicación(es)
        </p>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Nueva publicación
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Portada</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publicaciones.map((pub) => (
              <TableRow key={pub.idPublicacion}>
                <TableCell>
                  {pub.imagenPortadaUrl ? (
                    <img
                      src={pub.imagenPortadaUrl}
                      alt=""
                      className="h-10 w-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded-md bg-muted">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{pub.titulo}</TableCell>
                <TableCell>{pub.categoria ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={pub.estado === 1 ? "success" : "secondary"}>
                    {pub.estado === 1 ? "Publicado" : "Borrador"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatearFecha(new Date(pub.fechaPublicacion))}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {pub.slug && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        render={<a href={`/portal/publicaciones/${pub.slug}`} target="_blank" />}
                        nativeButton={false}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => abrirEditar(pub)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setEliminando(pub)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar publicación" : "Nueva publicación"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Imagen de portada */}
            <div className="flex items-center gap-4">
              {imgVisible ? (
                <img
                  src={imgVisible}
                  alt="Portada"
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
                  {imagenNueva || imgVisible ? "Cambiar imagen" : "Subir portada"}
                </Button>
                {(imagenNueva || (editando?.imagenPortadaUrl && !quitarImagen)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (previewImagen) URL.revokeObjectURL(previewImagen)
                      setPreviewImagen(null)
                      setImagenNueva(null)
                      setQuitarImagen(!imagenNueva && !!editando?.imagenPortadaUrl)
                      setInputKey((k) => k + 1)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Quitar
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {editando
                    ? "Se sube al guardar. Reemplaza la anterior."
                    : "Se sube tras crear la publicación."}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input {...form.register("titulo")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <Input {...form.register("slug")} placeholder="auto-generado" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Categoría</label>
                <Input {...form.register("categoria")} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contenido</label>
              <Textarea rows={5} {...form.register("contenido")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={ocupado}>
                {ocupado
                  ? "Guardando..."
                  : editando
                    ? "Guardar cambios"
                    : "Crear publicación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={!!eliminando} onOpenChange={() => setEliminando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar publicación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar &quot;{eliminando?.titulo}&quot;? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={eliminar.isPending}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
