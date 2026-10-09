"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CampoContrasena } from "@/components/shared/campo-contrasena"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { authApi } from "@/lib/api/auth"
import {
  cambiarContrasenaSchema,
  type CambiarContrasenaValues,
} from "@/lib/schemas/cuenta"
import { MENSAJE_CONTRASENA_SEGURA } from "@/lib/schemas/comun"

interface CambiarContrasenaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal de cambio voluntario de contraseña. Reutiliza la misma lógica que el
 * antiguo formulario embebido en Seguridad: el backend identifica al usuario
 * por el token de sesión (POST /auth/change-password); contraseña actual
 * incorrecta responde 400 y NO cierra sesión.
 */
export function CambiarContrasenaDialog({
  open,
  onOpenChange,
}: CambiarContrasenaDialogProps) {
  const [enviando, setEnviando] = useState(false)

  const form = useForm<CambiarContrasenaValues>({
    resolver: zodResolver(cambiarContrasenaSchema),
    defaultValues: { contrasenaActual: "", nuevaContrasena: "", confirmar: "" },
  })

  function handleOpenChange(v: boolean) {
    if (!v) form.reset()
    onOpenChange(v)
  }

  async function onSubmit(values: CambiarContrasenaValues) {
    if (enviando) return
    setEnviando(true)
    try {
      await authApi.cambiarContrasena({
        contrasenaActual: values.contrasenaActual,
        nuevaContrasena: values.nuevaContrasena,
      })
      form.reset()
      toast.success("Contraseña actualizada correctamente")
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo cambiar la contraseña"
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y establece una nueva.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            name="contrasenaActual"
            control={form.control}
            render={({ field, fieldState }) => (
              <CampoContrasena
                {...field}
                error={fieldState.error}
                label="Contraseña actual"
                placeholder="••••••••"
              />
            )}
          />
          <Controller
            name="nuevaContrasena"
            control={form.control}
            render={({ field, fieldState }) => (
              <CampoContrasena
                {...field}
                error={fieldState.error}
                label="Nueva contraseña"
                descripcion={MENSAJE_CONTRASENA_SEGURA}
              />
            )}
          />
          <Controller
            name="confirmar"
            control={form.control}
            render={({ field, fieldState }) => (
              <CampoContrasena
                {...field}
                error={fieldState.error}
                label="Confirmar nueva contraseña"
              />
            )}
          />
          <DialogFooter>
            <DialogTrigger render={<Button variant="outline" />}>
              Cancelar
            </DialogTrigger>
            <BotonGuardar etiqueta="Cambiar contraseña" enviando={enviando} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}