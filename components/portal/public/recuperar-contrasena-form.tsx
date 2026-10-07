"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Mail, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampoTextoAcceso, botonAcceso } from "@/components/shared/campo-texto-acceso"
import { authApi } from "@/lib/api/auth"
import { cn } from "@/lib/utils"

const schema = z.object({
  gmail: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Correo inválido"),
})

type FormValues = z.infer<typeof schema>

export function RecuperarContrasenaForm() {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gmail: "" },
  })

  async function onSubmit(values: FormValues) {
    setEnviando(true)
    try {
      await authApi.forgotPassword(values.gmail)
      setEnviado(true)
      toast.success("Se envió un código a tu correo")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo enviar el correo"
      toast.error(message)
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-exito" />
        <h2 className="text-encabezado font-semibold">Código enviado</h2>
        <p className="text-pequeno text-muted-foreground">
          Revisa tu bandeja de entrada. Se envió un código de 6 dígitos para
          restablecer tu contraseña.
        </p>
        <Button onClick={() => router.push("/restablecer-contrasena")} className="mt-4">
          Ingresar código
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <Controller
        control={form.control}
        name="gmail"
        render={({ field }) => (
          <CampoTextoAcceso
            etiqueta="Correo electrónico"
            icono={Mail}
            error={form.formState.errors.gmail}
            type="email"
            placeholder="usuario@correo.com"
            autoComplete="email"
            {...field}
          />
        )}
      />

      <Button
        type="submit"
        size="lg"
        className={cn(botonAcceso)}
        disabled={enviando}
      >
        {enviando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>Enviar código</>
        )}
      </Button>
    </form>
  )
}
