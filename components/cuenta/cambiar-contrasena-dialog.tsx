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
  onOpenChange?: (open: boolean) => void
  /** Primer ingreso: el modal no se puede cerrar hasta cambiar la contraseña. */
  obligatorio?: boolean
  onCambiada?: () => void
  onCerrarSesion?: () => void
}

/**
 * Modal de cambio de contraseña. El backend identifica al usuario por el
 * token de sesión (POST /auth/change-password); contraseña actual incorrecta
 * responde 400 y NO cierra sesión. En modo obligatorio se usa para reemplazar
 * la contraseña temporal enviada por correo.
 */
export function CambiarContrasenaDialog({
  open,
  onOpenChange,
  obligatorio = false,
  onCambiada,
  onCerrarSesion,
}: CambiarContrasenaDialogProps) {
  const [enviando, setEnviando] = useState(false)

  const form = useForm<CambiarContrasenaValues>({
    resolver: zodResolver(cambiarContrasenaSchema),
    defaultValues: { contrasenaActual: "", nuevaContrasena: "", confirmar: "" },
  })

  function handleOpenChange(v: boolean) {
    if (!v) form.reset()
    onOpenChange?.(v)
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
      toast.success(
        obligatorio
          ? "Contraseña actualizada correctamente."
          : "Contraseña actualizada correctamente. Por seguridad, te recomendamos cerrar sesión y volver a ingresar."
      )
      onCambiada?.()
      onOpenChange?.(false)
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
    // Sin onOpenChange en modo obligatorio: Escape y clic fuera no lo cierran.
    <Dialog open={open} onOpenChange={obligatorio ? undefined : handleOpenChange}>
      <DialogContent showCloseButton={!obligatorio} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {obligatorio ? "Cambia tu contraseña" : "Cambiar contraseña"}
          </DialogTitle>
          <DialogDescription>
            {obligatorio
              ? "Por seguridad, debes reemplazar la contraseña temporal que recibiste por correo antes de continuar."
              : "Ingresa tu contraseña actual y establece una nueva."}
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
                label={obligatorio ? "Contraseña temporal" : "Contraseña actual"}
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
            {obligatorio ? (
              <Button type="button" variant="outline" onClick={onCerrarSesion}>
                Cerrar sesión
              </Button>
            ) : (
              <DialogTrigger render={<Button variant="outline" />}>
                Cancelar
              </DialogTrigger>
            )}
            <BotonGuardar etiqueta="Cambiar contraseña" enviando={enviando} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
