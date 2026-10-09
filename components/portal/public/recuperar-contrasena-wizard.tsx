"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { CheckCircle2, Loader2, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampoTextoAcceso, botonAcceso } from "@/components/shared/campo-texto-acceso"
import { LayoutAcceso } from "@/components/shared/layout-acceso"
import { EntradaCodigo } from "@/components/portal/public/entrada-codigo"
import { authApi } from "@/lib/api/auth"
import { contrasenaSegura } from "@/lib/schemas/comun"
import { cn } from "@/lib/utils"

const SEGUNDOS_REINTENTO = 45

const schemaCorreo = z.object({
  gmail: z.string().min(1, "El email es obligatorio").email("Correo inválido"),
})

const schemaContrasena = z
  .object({
    nuevaContrasena: contrasenaSegura,
    confirmar: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((data) => data.nuevaContrasena === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })

type Paso = "correo" | "codigo" | "nueva" | "exito"

function ocultarCorreo(gmail: string): string {
  const arroba = gmail.indexOf("@")
  if (arroba <= 1) return gmail
  return `${gmail[0]}**${gmail.slice(arroba)}`
}

function formatearContador(segundos: number): string {
  const mm = String(Math.floor(segundos / 60)).padStart(2, "0")
  const ss = String(segundos % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

function mensajeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function RecuperarContrasenaWizard() {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>("correo")
  const [gmail, setGmail] = useState("")
  const [codigo, setCodigo] = useState("")
  const [segundos, setSegundos] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [mostrarNueva, setMostrarNueva] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)

  const formCorreo = useForm({
    resolver: zodResolver(schemaCorreo),
    defaultValues: { gmail: "" },
  })
  const formContrasena = useForm({
    resolver: zodResolver(schemaContrasena),
    defaultValues: { nuevaContrasena: "", confirmar: "" },
  })

  // Contador de reenvío (frontend, no la vigencia del código): solo descuenta
  // mientras el usuario está en el paso del código.
  useEffect(() => {
    if (paso !== "codigo" || segundos <= 0) return
    const id = window.setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [paso, segundos])

  async function enviarCorreo(values: { gmail: string }) {
    setEnviando(true)
    try {
      await authApi.forgotPassword(values.gmail)
      setGmail(values.gmail)
      setCodigo("")
      setSegundos(SEGUNDOS_REINTENTO)
      formContrasena.reset()
      setPaso("codigo")
      toast.success("Se envió un código a tu correo")
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo enviar el correo"))
    } finally {
      setEnviando(false)
    }
  }

  async function verificarCodigo() {
    if (codigo.length !== 6 || verificando) return
    setVerificando(true)
    try {
      await authApi.verifyResetCode(gmail, codigo)
      setPaso("nueva")
    } catch (error) {
      const mensaje = mensajeError(error, "El código no es válido")
      toast.error(mensaje)
      if (mensaje.toLowerCase().includes("expirado")) {
        setSegundos(0)
      }
    } finally {
      setVerificando(false)
    }
  }

  async function reenviarCodigo() {
    if (segundos > 0 || reenviando) return
    setReenviando(true)
    try {
      await authApi.forgotPassword(gmail)
      setSegundos(SEGUNDOS_REINTENTO)
      toast.success("Se envió un nuevo código a tu correo")
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo reenviar el código"))
    } finally {
      setReenviando(false)
    }
  }

  async function enviarContrasena(values: { nuevaContrasena: string }) {
    setEnviando(true)
    try {
      await authApi.resetPassword(gmail, codigo, values.nuevaContrasena)
      setPaso("exito")
      toast.success("Contraseña actualizada correctamente")
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo restablecer la contraseña"))
    } finally {
      setEnviando(false)
    }
  }

  const titulo = (() => {
    if (paso === "codigo")
      return (
        <h1 className="text-display font-bold text-foreground">Verifica tu correo</h1>
      )
    if (paso === "nueva")
      return (
        <h1 className="text-display font-bold text-foreground">Crea una nueva contraseña</h1>
      )
    return (
      <h1 className="text-display font-bold text-foreground">Recuperar contraseña</h1>
    )
  })()

  const descripcion =
    paso === "codigo" ? (
      <p className="text-descripcion font-semibold text-gris-descripcion">
        Enviamos un código de 6 dígitos a: {ocultarCorreo(gmail)}
      </p>
    ) : paso === "nueva" ? (
      <p className="text-descripcion font-semibold text-gris-descripcion">
        Tu identidad fue verificada. Ahora establece una nueva contraseña.
      </p>
    ) : (
      <p className="text-descripcion font-semibold text-gris-descripcion">
        Ingresa tu correo electrónico y te enviaremos las instrucciones para
        restablecer tu contraseña.
      </p>
    )

  const pie = (
    <div className="text-center text-body">
      <Link href="/login" className="font-semibold text-brand-info hover:underline">
        Volver al login
      </Link>
    </div>
  )

  let contenido: ReactNode

  if (paso === "codigo") {
    contenido = (
      <div className="space-y-4">
        <EntradaCodigo valor={codigo} onCambio={(v) => setCodigo(v)} />
        <Button
          type="button"
          size="lg"
          className={cn(botonAcceso)}
          disabled={codigo.length !== 6 || verificando}
          onClick={verificarCodigo}
        >
          {verificando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>Verificar</>
          )}
        </Button>
        <p className="text-center text-mini text-muted-foreground">
          ¿No recibiste el código?{" "}
          {segundos > 0 ? (
            <span className="font-semibold text-foreground">
              Reenviar código ({formatearContador(segundos)})
            </span>
          ) : (
            <button
              type="button"
              onClick={reenviarCodigo}
              disabled={reenviando}
              className="font-semibold text-brand-info hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reenviando ? "Reenviando..." : "Reenviar código"}
            </button>
          )}
        </p>
      </div>
    )
  } else if (paso === "nueva") {
    contenido = (
      <form
        onSubmit={formContrasena.handleSubmit(enviarContrasena)}
        className="space-y-4"
        noValidate
      >
        <Controller
          control={formContrasena.control}
          name="nuevaContrasena"
          render={({ field }) => (
            <CampoTextoAcceso
              etiqueta="Nueva contraseña"
              icono={Lock}
              error={formContrasena.formState.errors.nuevaContrasena}
              type={mostrarNueva ? "text" : "password"}
              placeholder="Mín 8: mayúscula, número y símbolo"
              autoComplete="new-password"
              alternable
              alternando={mostrarNueva}
              onAlternar={() => setMostrarNueva((v) => !v)}
              {...field}
            />
          )}
        />
        <Controller
          control={formContrasena.control}
          name="confirmar"
          render={({ field }) => (
            <CampoTextoAcceso
              etiqueta="Confirmar contraseña"
              icono={Lock}
              error={formContrasena.formState.errors.confirmar}
              type={mostrarConfirmar ? "text" : "password"}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              alternable
              alternando={mostrarConfirmar}
              onAlternar={() => setMostrarConfirmar((v) => !v)}
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
              Restableciendo...
            </>
          ) : (
            <>Restablecer contraseña</>
          )}
        </Button>
      </form>
    )
  } else if (paso === "exito") {
    contenido = (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-exito" />
        <h2 className="text-encabezado font-semibold">Contraseña actualizada</h2>
        <p className="text-pequeno text-muted-foreground">
          Tu contraseña se restableció correctamente. Ya puedes iniciar sesión
          con tu nueva contraseña.
        </p>
        <Button
          type="button"
          size="lg"
          onClick={() => router.push("/login")}
          className={cn(botonAcceso, "mt-4")}
        >
          Ir al login
        </Button>
      </div>
    )
  } else {
    contenido = (
      <form
        onSubmit={formCorreo.handleSubmit(enviarCorreo)}
        className="space-y-4"
        noValidate
      >
        <Controller
          control={formCorreo.control}
          name="gmail"
          render={({ field }) => (
            <CampoTextoAcceso
              etiqueta="Correo electrónico"
              icono={Mail}
              error={formCorreo.formState.errors.gmail}
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

  return (
    <LayoutAcceso
      titulo={paso === "exito" ? null : titulo}
      descripcion={paso === "exito" ? null : descripcion}
      pie={paso === "exito" ? undefined : pie}
    >
      {contenido}
    </LayoutAcceso>
  )
}