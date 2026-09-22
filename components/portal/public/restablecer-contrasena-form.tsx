"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Eye, EyeOff, CheckCircle2, Lock, Mail, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api/auth"

const schema = z
  .object({
    gmail: z.string().min(1, "El email es requerido").email("Formato de email no válido"),
    codigo: z
      .string()
      .min(6, "El código debe tener 6 dígitos")
      .max(6, "El código debe tener 6 dígitos")
      .regex(/^\d+$/, "El código debe ser numérico"),
    nuevaContrasena: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmar: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((data) => data.nuevaContrasena === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })

type FormValues = z.infer<typeof schema>

export function RestablecerContrasenaForm() {
  const router = useRouter()

  const [enviando, setEnviando] = useState(false)
  const [exitoso, setExitoso] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gmail: "",
      codigo: "",
      nuevaContrasena: "",
      confirmar: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setEnviando(true)
    try {
      await authApi.resetPassword(values.gmail, values.codigo, values.nuevaContrasena)
      setExitoso(true)
      toast.success("Contraseña actualizada correctamente")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseña"
      toast.error(message)
    } finally {
      setEnviando(false)
    }
  }

  if (exitoso) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-semibold">Contraseña actualizada</h2>
        <p className="text-sm text-muted-foreground">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-4">
          Ir al login
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
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldContent>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="tu@email.com"
              className="pl-10"
              {...form.register("gmail")}
            />
          </div>
          <FieldError errors={[form.formState.errors.gmail]} />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Código de verificación</FieldLabel>
        <FieldContent>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="000000"
              maxLength={6}
              className="pl-10 tracking-[0.5em] text-center font-mono text-lg"
              {...form.register("codigo")}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ingresa el código de 6 dígitos enviado a tu correo
          </p>
          <FieldError errors={[form.formState.errors.codigo]} />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Nueva contraseña</FieldLabel>
        <FieldContent>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={mostrarContrasena ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              className="pl-10 pr-10"
              {...form.register("nuevaContrasena")}
            />
            <button
              type="button"
              onClick={() => setMostrarContrasena((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {mostrarContrasena ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <FieldError errors={[form.formState.errors.nuevaContrasena]} />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Confirmar contraseña</FieldLabel>
        <FieldContent>
          <Input
            type="password"
            placeholder="Repite la contraseña"
            {...form.register("confirmar")}
          />
          <FieldError errors={[form.formState.errors.confirmar]} />
        </FieldContent>
      </Field>

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Restablecer contraseña
      </Button>
    </form>
  )
}
