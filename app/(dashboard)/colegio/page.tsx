"use client"

import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Save, Camera, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { usePuedeLeer } from "@/hooks/use-permisos"
import {
  useColegio,
  useActualizarColegio,
  useCrearColegio,
  useSubirFotoColegio,
  useSubirPortadaColegio,
  useEliminarPortadaColegio,
} from "@/hooks/use-colegio"

const schema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  codigoColegio: z.string().trim().max(20, "Máximo 20 caracteres"),
  telefono: z.string().regex(/^\d{6,15}$/, "El teléfono debe tener entre 6 y 15 dígitos"),
  celular: z.string().regex(/^\d{9}$/, "El celular debe tener 9 dígitos"),
  direccion: z.string().trim().min(1, "La dirección es obligatoria").max(150, "Máximo 150 caracteres"),
})

type FormData = z.infer<typeof schema>

export default function ColegioPage() {
  const puedeColegios = usePuedeLeer("COLEGIOS")
  const { data: colegio, isLoading } = useColegio()
  const actualizar = useActualizarColegio()
  const crear = useCrearColegio()
  const subirFoto = useSubirFotoColegio()
  const subirPortada = useSubirPortadaColegio()
  const eliminarPortada = useEliminarPortadaColegio()

  // Foto del colegio (urlFoto)
  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [previewFoto, setPreviewFoto] = useState<string | null>(null)
  const [faltaFoto, setFaltaFoto] = useState(false)
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
    setFaltaFoto(false)
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
    if (!fotoActual()) {
      setFaltaFoto(true)
      return
    }

    try {
      if (colegio?.idColegio) {
        const id = colegio.idColegio

        await actualizar.mutateAsync({ id, data })

        if (fotoNueva) {
          await subirFoto.mutateAsync({ id, file: fotoNueva })
        }

        if (portadaNueva) {
          await subirPortada.mutateAsync({ id, file: portadaNueva })
        } else if (quitarPortada && colegio.urlPortal) {
          await eliminarPortada.mutateAsync(id)
        }

        toast.success("Colegio actualizado")
      } else {
        // La validación de arriba garantiza la foto en un colegio nuevo.
        await crear.mutateAsync({ data, foto: fotoNueva as File, portada: portadaNueva })
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
    subirPortada.isPending ||
    eliminarPortada.isPending

  // form.formState.isDirty compara con lo guardado; las imágenes van fuera del formulario.
  const hayCambios =
    form.formState.isDirty ||
    !!fotoNueva ||
    !!portadaNueva ||
    (quitarPortada && !!colegio?.urlPortal)

  const fotoVisible = fotoActual()
  const portadaVisible = portadaActual()

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Colegio</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Información institucional que se muestra en el portal público.</p>
      </div>

      <div className="rounded-[20px] border-[0.80px] border-[#D9DBE9] bg-white p-6 shadow-sm dark:bg-background">
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
              <p className="text-sm font-medium">Foto del colegio *</p>
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
              {faltaFoto && !fotoVisible && (
                <p className="text-xs text-destructive">La foto del colegio es obligatoria</p>
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
              <p className="text-sm font-medium">Portada del portal (opcional)</p>
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
                  disabled={ocupado}
                  className="text-destructive hover:text-destructive self-start"
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, () => setFaltaFoto(!fotoActual()))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre del colegio *</label>
              <Input maxLength={120} aria-invalid={!!form.formState.errors.nombre} {...form.register("nombre")} />
              <FieldError errors={[form.formState.errors.nombre]} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Código (opcional)</label>
              <Input maxLength={20} aria-invalid={!!form.formState.errors.codigoColegio} {...form.register("codigoColegio")} />
              <FieldError errors={[form.formState.errors.codigoColegio]} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Teléfono *</label>
              <Controller
                name="telefono"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Input
                    maxLength={15}
                    inputMode="numeric"
                    aria-invalid={fieldState.invalid}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.telefono]} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Celular *</label>
              <Controller
                name="celular"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Input
                    maxLength={9}
                    inputMode="numeric"
                    aria-invalid={fieldState.invalid}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.celular]} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Dirección *</label>
            <Input maxLength={150} aria-invalid={!!form.formState.errors.direccion} {...form.register("direccion")} />
            <FieldError errors={[form.formState.errors.direccion]} />
          </div>

          <Button type="submit" disabled={ocupado || !hayCambios}>
            <Save className="mr-2 h-4 w-4" />
            {ocupado ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </div>
    </div>
  )
}
