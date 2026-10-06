"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, CheckCircle2, Lock, Mail, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampoTextoAcceso, botonAcceso } from "@/components/shared/campo-texto-acceso"
import { authApi } from "@/lib/api/auth"
import { contrasenaSegura } from "@/lib/schemas/comun"
import { cn } from "@/lib/utils"

const schema = z
  .object({
    gmail: z.string().min(1, "El email es requerido").email("Formato de email no vÃ¡lido"),
    codigo: z
      .string()
      .min(6, "El cÃ³digo debe tener 6 dÃ­gitos")
      .max(6, "El cÃ³digo debe tener 6 dÃ­gitos")
      .regex(/^\d+$/, "El cÃ³digo debe ser numÃ©rico"),
    nuevaContrasena: contrasenaSegura,
    confirmar: z.string().min(1, "Confirma la contraseÃ±a"),
  })
  .refine((data) => data.nuevaContrasena === data.confirmar, {
    message: "Las contraseÃ±as no coinciden",
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
      toast.success("ContraseÃ±a actualizada correctamente")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseÃ±a"
      toast.error(message)
    } finally {
      setEnviando(false)
    }
  }

  if (exitoso) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-exito" />
        <h2 className="text-encabezado font-semibold">ContraseÃ±a actualizada</h2>
        <p className="text-pequeno text-muted-foreground">
          Ya puedes iniciar sesiÃ³n con tu nueva contraseÃ±a.
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
      <CampoTextoAcceso
        etiqueta="Email"
        icono={Mail}
        error={form.formState.errors.gmail}
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        {...form.register("gmail")}
      />

      <CampoTextoAcceso
        etiqueta="CÃ³digo de verificaciÃ³n"
        icono={KeyRound}
        error={form.formState.errors.codigo}
        auxiliar="Ingresa el cÃ³digo de 6 dÃ­gitos enviado a tu correo"
        placeholder="000000"
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
        className="pr-3 text-center font-mono tracking-[0.5em]"
        {...form.register("codigo")}
      />

      <CampoTextoAcceso
        etiqueta="Nueva contraseÃ±a"
        icono={Lock}
        error={form.formState.errors.nuevaContrasena}
        type={mostrarContrasena ? "text" : "password"}
        placeholder="MÃ­n 8: mayÃºscula, nÃºmero y sÃ­mbolo"
        autoComplete="new-password"
        alternable
        alternando={mostrarContrasena}
        onAlternar={() => setMostrarContrasena((v) => !v)}
        {...form.register("nuevaContrasena")}
      />

      <CampoTextoAcceso
        etiqueta="Confirmar contraseÃ±a"
        error={form.formState.errors.confirmar}
        type={mostrarContrasena ? "text" : "password"}
        placeholder="Repite la contraseÃ±a"
        autoComplete="new-password"
        {...form.register("confirmar")}
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
            Restableciendo...
          </>
        ) : (
          <>Restablecer contraseÃ±a</>
        )}
      </Button>
    </form>
  )
}
