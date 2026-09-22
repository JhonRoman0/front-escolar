"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Trash2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  useAdminGalerias,
  useCrearGaleria,
  useActualizarGaleria,
  useEliminarGaleria,
  useSubirFotosGaleria,
  useEliminarFotoGaleria,
  type GaleriaResponse,
} from "@/hooks/use-portal"
import { formatearFecha } from "@/lib/fechas"

const schema = z.object({
  titulo: z.string().min(2, "Título requerido"),
  descripcion: z.string().optional(),
  fecha: z.string().min(1, "Fecha requerida"),
})

type FormData = z.infer<typeof schema>

interface FotoExistente {
  idDetalle: number
  imagenUrl: string
}

export default function GaleriasTab() {
  const { data: galerias = [], isLoading } = useAdminGalerias()
  const crear = useCrearGaleria()
  const actualizar = useActualizarGaleria()
  const eliminar = useEliminarGaleria()
  const subirFotos = useSubirFotosGaleria()
  const eliminarFoto = useEliminarFotoGaleria()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<GaleriaResponse | null>(null)
  const [eliminando, setEliminando] = useState<GaleriaResponse | null>(null)

  // Fotos existentes visibles (sin las marcadas para borrar)
  const [existentes, setExistentes] = useState<FotoExistente[]>([])
  // Ids marcados para borrar al guardar
  const [idsParaBorrar, setIdsParaBorrar] = useState<number[]>([])
  // Archivos nuevos seleccionados (con preview local)
  const [fotosNuevas, setFotosNuevas] = useState<{ file: File; preview: string }[]>([])
  const [inputKey, setInputKey] = useState(0)
  const inputFotosRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: "", descripcion: "", fecha: "" },
  })

  function limpiarEstadoFotos() {
    fotosNuevas.forEach((f) => URL.revokeObjectURL(f.preview))
    setExistentes([])
    setIdsParaBorrar([])
    setFotosNuevas([])
    // Remonta el input para limpiar la selección sin tocar ref.current en render
    setInputKey((k) => k + 1)
  }

  function abrirCrear() {
    setEditando(null)
    limpiarEstadoFotos()
    form.reset({ titulo: "", descripcion: "", fecha: "" })
    setDialogOpen(true)
  }

  function abrirEditar(gal: GaleriaResponse) {
    setEditando(gal)
    limpiarEstadoFotos()
    form.reset({
      titulo: gal.titulo,
      descripcion: gal.descripcion ?? "",
      fecha: gal.fecha,
    })
    setExistentes(
      [...gal.detalles]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((d) => ({ idDetalle: d.idDetalle, imagenUrl: d.imagenUrl }))
    )
    setDialogOpen(true)
  }

  function cerrarDialog() {
    limpiarEstadoFotos()
    setDialogOpen(false)
  }

  function handleAgregarFotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    const nuevas = files.map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setFotosNuevas((prev) => [...prev, ...nuevas])
    setInputKey((k) => k + 1)
  }

  function quitarFotoNueva(index: number) {
    setFotosNuevas((prev) => {
      const copia = [...prev]
      const [quitada] = copia.splice(index, 1)
      if (quitada) URL.revokeObjectURL(quitada.preview)
      return copia
    })
  }

  function marcarBorrarExistente(idDetalle: number) {
    setIdsParaBorrar((prev) => [...prev, idDetalle])
  }

  async function onSubmit(data: FormData) {
    const payloadBase = {
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      fecha: data.fecha,
    }

    try {
      if (editando) {
        // 1. Borrar individualmente las fotos eliminadas (limpia Cloudinary)
        for (const idDetalle of idsParaBorrar) {
          await eliminarFoto.mutateAsync(idDetalle)
        }

        // 2. Actualizar datos conservando las fotos restantes
        await actualizar.mutateAsync({
          id: editando.idGaleria,
          data: {
            ...payloadBase,
            detalles: existentes
              .filter((d) => !idsParaBorrar.includes(d.idDetalle))
              .map((d, i) => ({ imagenUrl: d.imagenUrl, orden: i + 1 })),
          },
        })

        // 3. Subir fotos nuevas (el orden continúa del último)
        if (fotosNuevas.length > 0) {
          await subirFotos.mutateAsync({
            id: editando.idGaleria,
            files: fotosNuevas.map((f) => f.file),
          })
        }
        toast.success("Galería actualizada")
      } else {
        const creada = await crear.mutateAsync(payloadBase)

        if (fotosNuevas.length > 0) {
          await subirFotos.mutateAsync({
            id: creada.idGaleria,
            files: fotosNuevas.map((f) => f.file),
          })
        }
        toast.success("Galería creada")
      }
      cerrarDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.idGaleria, {
      onSuccess: () => {
        toast.success("Galería eliminada")
        setEliminando(null)
      },
      onError: () => toast.error("Error al eliminar"),
    })
  }

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Cargando...</p>

  const ocupado =
    crear.isPending ||
    actualizar.isPending ||
    subirFotos.isPending ||
    eliminarFoto.isPending ||
    eliminar.isPending
  const existentesVisibles = existentes.filter((d) => !idsParaBorrar.includes(d.idDetalle))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{galerias.length} galería(s)</p>
        <Button onClick={abrirCrear} size="sm"><Plus className="mr-2 h-4 w-4" /> Nueva galería</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Fotos</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {galerias.map((gal) => (
              <TableRow key={gal.idGaleria}>
                <TableCell>
                  {gal.detalles.length > 0 ? (
                    <img
                      src={[...gal.detalles].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0].imagenUrl}
                      alt=""
                      className="h-10 w-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-16 rounded-md bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{gal.titulo}</TableCell>
                <TableCell>{gal.detalles.length} foto(s)</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatearFecha(new Date(gal.fecha))}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(gal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setEliminando(gal)}>
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
            <DialogTitle>{editando ? "Editar galería" : "Nueva galería"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input {...form.register("titulo")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <Textarea rows={2} {...form.register("descripcion")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha *</label>
              <Input type="date" {...form.register("fecha")} />
            </div>

            {/* Fotos */}
            <div className="space-y-3">
              <input
                key={inputKey}
                ref={inputFotosRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAgregarFotos}
              />

              {editando && existentesVisibles.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Fotos actuales ({existentesVisibles.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {existentesVisibles.map((det) => (
                      <div key={det.idDetalle} className="group relative aspect-square overflow-hidden rounded-lg border">
                        <img
                          src={det.imagenUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => marcarBorrarExistente(det.idDetalle)}
                          disabled={ocupado}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fotosNuevas.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Fotos nuevas ({fotosNuevas.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {fotosNuevas.map((foto, idx) => (
                      <div key={foto.preview} className="relative aspect-square overflow-hidden rounded-lg border ring-2 ring-emerald-500/50">
                        <img
                          src={foto.preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => quitarFotoNueva(idx)}
                          disabled={ocupado}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputFotosRef.current?.click()}
                disabled={ocupado}
              >
                <Plus className="mr-1 h-3 w-3" /> Agregar fotos
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrarDialog}>Cancelar</Button>
              <Button type="submit" disabled={ocupado}>
                {ocupado ? "Guardando..." : editando ? "Guardar cambios" : "Crear galería"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eliminando} onOpenChange={() => setEliminando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar galería</DialogTitle></DialogHeader>
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
