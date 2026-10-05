"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import {
  useConfirmarAsistencia,
  useJustificaciones,
  usePrevisualizarAsistencia,
} from "@/hooks/use-asistencia"
import type { AsistenciaResponse } from "@/lib/api/asistencia"
import {
  asistenciaCodigoSchema,
  type AsistenciaCodigoValues,
} from "@/lib/schemas/asistencia"
import { PrevisualizacionAlumno } from "./previsualizacion-alumno"

interface RegistrarCodigoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrarCodigoModal({
  open,
  onOpenChange,
}: RegistrarCodigoModalProps) {
  const [previsualizacion, setPrevisualizacion] =
    useState<AsistenciaResponse | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [idJustificacion, setIdJustificacion] = useState<number | null>(null)

  const previsualizar = usePrevisualizarAsistencia()
  const confirmar = useConfirmarAsistencia()
  const { data: justificaciones } = useJustificaciones()

  const form = useForm<AsistenciaCodigoValues>({
    resolver: zodResolver(asistenciaCodigoSchema),
    defaultValues: { codigo: "" },
  })
  const codigo = useWatch({ control: form.control, name: "codigo" }) ?? ""

  function resetear() {
    setPrevisualizacion(null)
    setErrorBusqueda(null)
    setIdJustificacion(null)
  }

  async function handleBuscar(values: AsistenciaCodigoValues) {
    setErrorBusqueda(null)
    setPrevisualizacion(null)
    setIdJustificacion(null)

    try {
      const data = await previsualizar.mutateAsync({
        codigo: values.codigo.toUpperCase(),
      })
      setPrevisualizacion(data)
    } catch (error) {
      setErrorBusqueda(
        error instanceof Error ? error.message : "No se pudo procesar el código"
      )
    }
  }

  function handleCodigoChange(value: string) {
    form.setValue("codigo", value.toUpperCase())
    if (previsualizacion || errorBusqueda) resetear()
  }

  async function handleRegistrar() {
    if (!previsualizacion) return
    if (previsualizacion.estado === "Justificada" && !idJustificacion) return

    try {
      const resultado = await confirmar.mutateAsync({
        codigo: previsualizacion.codigo,
        idJustificacion: idJustificacion ?? undefined,
      })
      toast.success(`Registrado como ${resultado.estado}: ${resultado.alumno}`)
      form.reset({ codigo: "" })
      resetear()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar la asistencia"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar asistencia por código</DialogTitle>
          <DialogDescription>
            Escribe el código del alumno para registrar su asistencia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input + botón buscar */}
          <form
            onSubmit={form.handleSubmit(handleBuscar)}
            noValidate
            className="flex gap-2"
          >
            <Input
              placeholder="Código del alumno"
              {...form.register("codigo")}
              onChange={(e) => handleCodigoChange(e.target.value)}
              className="font-mono"
              autoFocus
              disabled={previsualizar.isPending}
            />
            <Button
              type="submit"
              disabled={!codigo.trim() || previsualizar.isPending}
              variant="outline"
            >
              {previsualizar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
          </form>

          {errorBusqueda && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">No se puede registrar la asistencia</p>
                <p className="text-destructive/80">{errorBusqueda}</p>
              </div>
            </div>
          )}

          {previsualizacion && (
            <PrevisualizacionAlumno
              previsualizacion={previsualizacion}
              justificaciones={justificaciones}
              idJustificacion={idJustificacion}
              onIdJustificacionChange={setIdJustificacion}
              onRegistrar={handleRegistrar}
              registrando={confirmar.isPending}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              form.reset({ codigo: "" })
              resetear()
              onOpenChange(false)
            }}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
