"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Save, Camera, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { usePuedeLeer } from "@/hooks/use-permisos"
import {
  useColegio,
  useActualizarColegio,
  useCrearColegio,
  useSubirFotoColegio,
  useEliminarFotoColegio,
  useSubirPortadaColegio,
  useEliminarPortadaColegio,
} from "@/hooks/use-colegio"

const schema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  celular: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  codigoColegio: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ColegioPage() {
  const puedeColegios = usePuedeLeer("COLEGIOS")
  const { data: colegio, isLoading } = useColegio()
  const actualizar = useActualizarColegio()
  const crear = useCrearColegio()
  const subirFoto = useSubirFotoColegio()
  const eliminarFoto = useEliminarFotoColegio()
  const subirPortada = useSubirPortadaColegio()
  const eliminarPortada = useEliminarPortadaColegio()

  // Foto del colegio (urlFoto)
  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [previewFoto, setPreviewFoto] = useState<string | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)
  const [inputKeyFoto, setInputKeyFoto] = useState(0)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Portada del portal (urlPortal ⚠️ nombre heredado en BD)
  const [portadaNueva, setPortadaNueva] = useState<File | null>(null)
  const [previewPortada, setPreviewPortada] = useState<string | null>(null)
  const [quitarPortada, setQuitarPortada] = useState(false)
  const [inputKeyPortada, setInputKeyPortada] = useState(0)
  const inputPortadaRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      nombre: colegio?.nombre ?? "",
      celular: colegio?.celular ?? "",
      telefono: colegio?.telefono ?? "",
      direccion: colegio?.direccion ?? "",
      codigoColegio: colegio?.codigoColegio ?? "",
    },
  })

  function fotoActual(): string | null {
    if (quitarFoto) return null
    if (previewFoto) return previewFoto
    return colegio?.urlFoto ?? null
  }

  function portadaActual(): string | null {
    if (quitarPortada) return null
    if (previewPortada) return previewPortada
    return colegio?.urlPortal ?? null
  }

  function limpiarFoto() {
    if (previewFoto) URL.revokeObjectURL(previewFoto)
    setFotoNueva(null)
    setPreviewFoto(null)
    setQuitarFoto(false)
    setInputKeyFoto((k) => k + 1)
  }

  function limpiarPortada() {
    if (previewPortada) URL.revokeObjectURL(previewPortada)
    setPortadaNueva(null)
    setPreviewPortada(null)
    setQuitarPortada(false)
    setInputKeyPortada((k) => k + 1)
  }

  function handleArchivoFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewFoto) URL.revokeObjectURL(previewFoto)
    setFotoNueva(file)
    setPreviewFoto(URL.createObjectURL(file))
    setQuitarFoto(false)
  }

  function handleArchivoPortada(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewPortada) URL.revokeObjectURL(previewPortada)
    setPortadaNueva(file)
    setPreviewPortada(URL.createObjectURL(file))
    setQuitarPortada(false)
  }

  async function onSubmit(data: FormData) {
    // ⚠️ NO enviar urlFoto/urlPortal en el PUT: el back pisa los campos con
    // null si vienen explícitos. Se gestionan solo por upload/delete.
    const payload = {
      nombre: data.nombre,
      celular: data.celular || undefined,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
      codigoColegio: data.codigoColegio || undefined,
    }

    try {
      if (colegio?.idColegio) {
        const id = colegio.idColegio

        await actualizar.mutateAsync({ id, data: payload })

        if (fotoNueva) {
          await subirFoto.mutateAsync({ id, file: fotoNueva })
        } else if (quitarFoto && colegio.urlFoto) {
          await eliminarFoto.mutateAsync(id)
        }

        if (portadaNueva) {
          await subirPortada.mutateAsync({ id, file: portadaNueva })
        } else if (quitarPortada && colegio.urlPortal) {
          await eliminarPortada.mutateAsync(id)
        }

        toast.success("Colegio actualizado")
      } else {
        const creado = await crear.mutateAsync(payload)

        if (fotoNueva) {
          await subirFoto.mutateAsync({ id: creado.idColegio, file: fotoNueva })
        }
        if (portadaNueva) {
          await subirPortada.mutateAsync({ id: creado.idColegio, file: portadaNueva })
        }

        toast.success("Colegio creado")
      }
      limpiarFoto()
      limpiarPortada()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    }
  }

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">Cargando...</p>
  }

  if (!puedeColegios) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">No tienes permiso para acceder a esta sección.</p>
      </div>
    )
  }

  const ocupado =
    actualizar.isPending ||
    crear.isPending ||
    subirFoto.isPending ||
    eliminarFoto.isPending ||
    subirPortada.isPending ||
    eliminarPortada.isPending

  const fotoVisible = fotoActual()
  const portadaVisible = portadaActual()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Colegio</h1>
        <p className="text-sm text-muted-foreground">
          Información institucional que se muestra en el portal público.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-background">
        {/* Imágenes */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Foto del colegio */}
          <div className="flex items-start gap-4">
            {fotoVisible ? (
              <img
                src={fotoVisible}
                alt="Foto del colegio"
                className="h-24 w-24 rounded-xl object-cover border"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Foto del colegio</p>
              <p className="text-xs text-muted-foreground">
                Logo que aparece en el header y footer del portal.
              </p>
              <input
                key={inputKeyFoto}
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArchivoFoto}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputFotoRef.current?.click()}
                disabled={ocupado}
              >
                <Camera />
                {fotoNueva || fotoVisible ? "Cambiar foto" : "Subir foto"}
              </Button>
              {(fotoNueva || (colegio?.urlFoto && !quitarFoto)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    limpiarFoto()
                    setQuitarFoto(true)
                  }}
                  disabled={ocupado || !colegio?.idColegio}
                  className="text-destructive hover:text-destructive self-start"
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>

          {/* Portada del portal */}
          <div className="flex items-start gap-4">
            {portadaVisible ? (
              <img
                src={portadaVisible}
                alt="Portada del portal"
                className="h-24 w-40 rounded-xl object-cover border"
              />
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Portada del portal</p>
              <p className="text-xs text-muted-foreground">
                Imagen destacada para el hero de la landing.
              </p>
              <input
                key={inputKeyPortada}
                ref={inputPortadaRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArchivoPortada}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputPortadaRef.current?.click()}
                disabled={ocupado}
              >
                <Camera />
                {portadaNueva || portadaVisible ? "Cambiar portada" : "Subir portada"}
              </Button>
              {(portadaNueva || (colegio?.urlPortal && !quitarPortada)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    limpiarPortada()
                    setQuitarPortada(true)
                  }}
                  disabled={ocupado || !colegio?.idColegio}
                  className="text-destructive hover:text-destructive self-start"
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre del colegio *</label>
              <Input {...form.register("nombre")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Código</label>
              <Input {...form.register("codigoColegio")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Teléfono</label>
              <Input {...form.register("telefono")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Celular</label>
              <Input {...form.register("celular")} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Dirección</label>
            <Input {...form.register("direccion")} />
          </div>

          <Button type="submit" disabled={ocupado}>
            <Save className="mr-2 h-4 w-4" />
            {ocupado ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  )
}
