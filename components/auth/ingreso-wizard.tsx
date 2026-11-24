"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { LoginForm } from "@/components/form-login"
import { LayoutAcceso } from "@/components/shared/layout-acceso"
import { PasoCodigo, useCuentaRegresiva } from "@/components/auth/paso-codigo"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/components/auth-provider"
import { authApi, type DesafioDosFactor } from "@/lib/api/auth"
import { ApiError } from "@/lib/api"
import { codigoDeError, mensajeError, segundosDeEspera } from "@/lib/codigo-verificacion"

const DOS_FACTOR_VENCIDO = "DOS_FACTOR_VENCIDO"
const DIAS_CONFIANZA = 7

/**
 * Inicio de sesión: código institucional y contraseña y, si hace falta, el código
 * de 6 dígitos que llega al correo (mismo diseño que recuperar contraseña).
 */
export function IngresoWizard() {
  const { verificarDosFactor } = useAuth()
  const [desafio, setDesafio] = useState<DesafioDosFactor | null>(null)
  const [codigo, setCodigo] = useState("")
  const [recordar, setRecordar] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [verificando, setVerificando] = useState(false)
  const [reenviando, setReenviando] = useState(false)

  useCuentaRegresiva(desafio !== null, segundos, setSegundos)

  function iniciarPasoCodigo(d: DesafioDosFactor) {
    setDesafio(d)
    setCodigo("")
    setSegundos(d.segundosReenvio)
  }

  function volverACredenciales() {
    setDesafio(null)
    setCodigo("")
    setSegundos(0)
  }

  async function verificar() {
    if (!desafio || codigo.length !== 6 || verificando) return
    setVerificando(true)
    try {
      await verificarDosFactor(desafio.desafio, codigo, recordar)
      toast.success("¡Bienvenido!")
    } catch (error) {
      toast.error(mensajeError(error, "El código no es válido"))
      if (codigoDeError(error) === DOS_FACTOR_VENCIDO) {
        volverACredenciales()
      } else if (error instanceof ApiError && error.status === 423) {
        // Cuenta bloqueada por intentos: no tiene sentido seguir en este paso.
        volverACredenciales()
      } else {
        setCodigo("")
      }
    } finally {
      setVerificando(false)
    }
  }

  async function reenviar() {
    if (!desafio || segundos > 0 || reenviando) return
    setReenviando(true)
    try {
      const resp = await authApi.reenviarDosFactor(desafio.desafio)
      setCodigo("")
      setSegundos(resp.segundosReenvio ?? desafio.segundosReenvio)
      toast.success("Se envió un nuevo código a tu correo")
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo reenviar el código"))
      const espera = segundosDeEspera(error)
      if (espera) setSegundos(espera)
      if (codigoDeError(error) === DOS_FACTOR_VENCIDO) volverACredenciales()
    } finally {
      setReenviando(false)
    }
  }

  if (desafio) {
    return (
      <LayoutAcceso
        titulo={<h1 className="text-display font-bold text-foreground">Verifica tu identidad</h1>}
        descripcion={
          <p className="text-descripcion font-semibold text-gris-descripcion">
            Enviamos un código de 6 dígitos a: {desafio.correoEnmascarado}. Vence en{" "}
            {desafio.minutosCodigo} minutos.
          </p>
        }
        pie={
          <div className="text-center text-body">
            <button
              type="button"
              onClick={volverACredenciales}
              className="font-semibold text-brand-info hover:underline"
            >
              Usar otra cuenta
            </button>
          </div>
        }
      >
        <PasoCodigo
          codigo={codigo}
          onCodigo={setCodigo}
          onVerificar={verificar}
          verificando={verificando}
          segundos={segundos}
          onReenviar={reenviar}
          reenviando={reenviando}
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-3 text-pequeno">
            <Checkbox
              checked={recordar}
              onCheckedChange={(v) => setRecordar(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-foreground">
                Recordar este dispositivo por {DIAS_CONFIANZA} días
              </span>
              <span className="block text-muted-foreground">
                No te pediremos el código en este navegador. No lo marques en una computadora compartida.
              </span>
            </span>
          </label>
        </PasoCodigo>
      </LayoutAcceso>
    )
  }

  return (
    <LayoutAcceso
      titulo={<h1 className="text-display font-bold text-foreground">¡Bienvenido!</h1>}
      descripcion={
        <p className="text-descripcion font-semibold text-gris-descripcion">
          Ingresa con tu código institucional para empezar
        </p>
      }
      pie={
        <div className="text-center text-body">
          <Link href="/recuperar-contrasena" className="font-semibold text-brand-info hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      }
    >
      <LoginForm onDesafio={iniciarPasoCodigo} />
    </LayoutAcceso>
  )
}
