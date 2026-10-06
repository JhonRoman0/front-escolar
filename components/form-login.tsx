"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowRight, Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { CampoAcceso, botonAcceso } from "@/components/shared/campo-acceso"
import { useAuth } from "@/components/auth-provider"

const formSchema = z.object({
  codigo: z
    .string()
    .min(4, { message: "El código debe tener al menos 4 caracteres." }),
  contraseña: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
})

type LoginValues = z.infer<typeof formSchema>

const MAX_INTENTOS_FALLIDOS = 5

export function LoginForm() {
  const { login } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [fallos, setFallos] = useState(0)

  const form = useForm<LoginValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      contraseña: "",
    },
  })

  async function onSubmit(values: LoginValues) {
    setEnviando(true)
    try {
      await login(values)
      setFallos(0)
      toast.success("¡Bienvenido!")
    } catch (error) {
      if (error instanceof ApiError && error.status === 423) {
        toast.error(
          "Tu cuenta está bloqueada. Contacta al administrador."
        )
      } else if (error instanceof ApiError && error.status === 401) {
        const nuevosFallos = fallos + 1
        setFallos(nuevosFallos)
        const restantes = MAX_INTENTOS_FALLIDOS - nuevosFallos
        if (restantes > 0) {
          toast.error(
            `Credenciales incorrectas. Te queda${restantes === 1 ? "" : "n"} ${restantes} ` +
              `intento${restantes === 1 ? "" : "s"} antes del bloqueo.`
          )
        } else {
          toast.error(
            "Credenciales incorrectas. Tu cuenta quedó bloqueada. Contacta al administrador."
          )
        }
      } else {
        let message = "Código o contraseña incorrectos"
        if (error instanceof Error) message = error.message
        toast.error(message)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4" noValidate>
      <Controller
        control={form.control}
        name="codigo"
        render={({ field }) => (
          <CampoAcceso
            etiqueta="Código institucional"
            error={form.formState.errors.codigo}
            placeholder="Usuario"
            autoComplete="username"
            {...field}
          />
        )}
      />

      <Controller
        control={form.control}
        name="contraseña"
        render={({ field }) => (
          <CampoAcceso
            etiqueta="Contraseña"
            error={form.formState.errors.contraseña}
            type={mostrarContrasena ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            alternable
            alternando={mostrarContrasena}
            onAlternar={() => setMostrarContrasena((v) => !v)}
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
            Ingresando...
          </>
        ) : (
          <>
            Ingresar
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}