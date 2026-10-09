"use client"

import { useEffect, useRef } from "react"
import { Camera, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface BloqueFotoProps {
  preview: string | null
  alt: string
  iniciales: string
  fallback: string
  hayFotoNueva: boolean
  mostrarQuitar: boolean
  quitarDisabled?: boolean
  notaSinFoto?: string | null
  onChangeArchivo: (file: File) => void
  onQuitar: () => void
}

export function BloqueFoto({
  preview,
  alt,
  iniciales,
  fallback,
  hayFotoNueva,
  mostrarQuitar,
  quitarDisabled = false,
  notaSinFoto,
  onChangeArchivo,
  onQuitar,
}: BloqueFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Si ya no hay foto nueva pendiente (p. ej. tras "Quitar"), el input de
  // archivo conserva la selección anterior; se resetea para que volver a
  // elegir el mismo archivo dispare onChange.
  useEffect(() => {
    if (!hayFotoNueva && inputRef.current) inputRef.current.value = ""
  }, [hayFotoNueva])

  function handleArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    onChangeArchivo(file)
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 self-start sm:w-40">
      <Avatar className="size-24 rounded-full">
        {preview ? (
          <AvatarImage src={preview} alt={alt} />
        ) : (
          <AvatarFallback className="rounded-full text-lg">
            {iniciales || fallback}
          </AvatarFallback>
        )}
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleArchivo}
      />
      <div className="flex flex-col items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Camera data-icon="inline-start" />
          {hayFotoNueva || preview ? "Cambiar foto" : "Subir foto"}
        </Button>
        {mostrarQuitar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onQuitar}
            disabled={quitarDisabled}
          >
            <Trash2 className="text-destructive" data-icon="inline-start" />
            Quitar
          </Button>
        )}
        {notaSinFoto && (
          <span className="text-xs text-muted-foreground">{notaSinFoto}</span>
        )}
      </div>
    </div>
  )
}