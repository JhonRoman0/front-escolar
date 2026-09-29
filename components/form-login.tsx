"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"

import { ApiError } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
          <Field>
            <FieldLabel className="text-[20px] font-bold">Código institucional</FieldLabel>
            <FieldContent>
              <Input
                placeholder="Usuario"
                className="h-[51px] rounded-2xl border-[0.5px] border-[#A9A9AA] text-[20px] font-semibold text-foreground placeholder:text-[#A9A9AA] focus-visible:ring-[#3A62D4]"
                autoComplete="username"
                {...field}
              />
              <FieldError errors={[form.formState.errors.codigo]} />
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="contraseña"
        render={({ field }) => (
          <Field>
            <FieldLabel className="text-[20px] font-bold">Contraseña</FieldLabel>
            <FieldContent>
              <div className="relative">
                <Input
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-[51px] rounded-2xl border-[0.5px] border-[#A9A9AA] pr-10 text-[20px] font-semibold text-foreground placeholder:text-[#A9A9AA] focus-visible:ring-[#3A62D4]"
                  {...field}
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarContrasena ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldError errors={[form.formState.errors.contraseña]} />
            </FieldContent>
          </Field>
        )}
      />

      <Button
        type="submit"
        size="lg"
        className="h-[51px] w-full rounded-2xl bg-[#3A62D4] text-[25px] font-semibold text-white hover:bg-[#2d4fb8]"
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