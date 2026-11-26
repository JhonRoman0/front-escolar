"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { authApi, type LoginRequest, type LoginResponse, type PermisosRolResponse, type UsuarioResponse } from "@/lib/api/auth"
import {
  ApiError,
  canonizarPermisos,
  cerrarSesionLocal,
  getEsAdmin,
  getPermisos,
  getPermisosHash,
  setEsAdmin,
  setPermisos,
  setPermisosHash,
} from "@/lib/api"
import { PermisosActualizadosModal } from "@/components/seguridad/permisos-actualizados-modal"
import { CambiarContrasenaDialog } from "@/components/cuenta/cambiar-contrasena-dialog"
import { VigenciaVencidaModal } from "@/components/seguridad/vigencia-vencida-modal"
import { EVENTO_REVISAR_CUENTA, EVENTO_REVISAR_PERMISOS } from "@/components/escucha-cambios"
import { PANEL_CONTROL, RUTA_LOGIN } from "@/lib/navegacion"
import {
  EVENTO_SESION_BLOQUEADA,
  limpiarSesionBloqueada,
  marcarSesionBloqueada,
  sesionBloqueada,
  type DetalleSesionBloqueada,
} from "@/lib/sesion-bloqueada"
import {
  CODIGOS_VIGENCIA,
  MENSAJE_NO_DISPONIBLE,
  codigoVigenciaAEstado,
  esCodigoBloqueoSesion,
  esCodigoBloqueoVigencia,
  esCodigoSesionObsoleta,
  esEstadoVigenciaBloqueante,
  esEstadoVigenciaValido,
  estadoACodigoVigencia,
  mensajeEstadoVigencia,
} from "@/lib/vigencia"

const INTERVALO_VERIFICACION_PERMISOS_MS = 30_000
const RETARDO_PRIMER_CHEQUEO_PERMISOS_MS = 1_500
const RUTAS_PUBLICAS = [RUTA_LOGIN, "/sin-acceso"]
function esRutaPublica(pathname: string) {
  return (
    RUTAS_PUBLICAS.includes(pathname) ||
    pathname === "/recuperar-contrasena" ||
    pathname.startsWith("/restablecer-contrasena")
  )
}

interface AuthContextValue {
  usuario: UsuarioResponse | null
  permisos: PermisosRolResponse | null
  esAdmin: boolean
  cargando: boolean
  permisosCambiados: boolean
  /** Si devuelve requiereDosFactor, aún no hay sesión: falta verificarDosFactor. */
  login: (data: LoginRequest) => Promise<LoginResponse>
  verificarDosFactor: (desafio: string, codigo: string, recordar: boolean) => Promise<LoginResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [permisos, setPermisosState] = useState<PermisosRolResponse | null>(null)
  const [esAdmin, setEsAdminState] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [permisosCambiados, setPermisosCambiados] = useState(false)
  const [detalleBloqueo, setDetalleBloqueo] =
    useState<DetalleSesionBloqueada | null>(() => sesionBloqueada())
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const bloqueo = detalleBloqueo ?? sesionBloqueada()
  const estadoDelUsuario = usuario?.estadoVigencia
  const estadoDeclarado = bloqueo
    ? esEstadoVigenciaValido(bloqueo.estado)
      ? bloqueo.estado
      : codigoVigenciaAEstado(bloqueo.codigo)
    : esEstadoVigenciaValido(estadoDelUsuario)
      ? estadoDelUsuario
      : undefined
  const vigenciaInvalida =
    esCodigoBloqueoVigencia(bloqueo?.codigo) ||
    esEstadoVigenciaBloqueante(estadoDeclarado) ||
    esEstadoVigenciaBloqueante(estadoDelUsuario)

  useEffect(() => {
    let cancelado = false

    function alBloquear(event: Event) {
      const detalle = (event as CustomEvent<DetalleSesionBloqueada>).detail
      if (!detalle) return
      if (esCodigoSesionObsoleta(detalle.codigo)) {
        toast.error(detalle.mensaje)
        limpiarSesionBloqueada()
        cerrarSesionLocal()
        window.location.replace(RUTA_LOGIN)
        return
      }
      setDetalleBloqueo(detalle)
      const estado = esEstadoVigenciaValido(detalle.estado)
        ? detalle.estado
        : codigoVigenciaAEstado(detalle.codigo)
      if (estado) {
        setUsuario((actual) =>
          actual ? { ...actual, estadoVigencia: estado } : actual
        )
      }
    }

    window.addEventListener(EVENTO_SESION_BLOQUEADA, alBloquear)

    async function verificarSesion() {
      setEsAdminState(getEsAdmin())
      setPermisosState(getPermisos<PermisosRolResponse>())

      try {
        const usuario = await authApi.meSesion()
        if (!cancelado) {
          setUsuario(usuario)
          if (esEstadoVigenciaBloqueante(usuario.estadoVigencia)) {
            marcarSesionBloqueada({
              codigo: estadoACodigoVigencia(usuario.estadoVigencia),
              mensaje: mensajeEstadoVigencia(usuario.estadoVigencia),
              estado: usuario.estadoVigencia,
            })
          }
          // Refrescar nombreRol en permisos desde /auth/me
          const permisosActuales = getPermisos<PermisosRolResponse>()
          if (permisosActuales && usuario.nombreRol) {
            permisosActuales.nombreRol = usuario.nombreRol
            setPermisos(permisosActuales)
            setPermisosState(permisosActuales)
          }
          // Backfill del hash base para sesiones previas a esta verificación.
          if (permisosActuales && !getPermisosHash()) {
            setPermisosHash(canonizarPermisos(permisosActuales))
          }
        }
      } catch (error) {
        if (cancelado) return
        if (error instanceof ApiError && error.status === 403 && esCodigoBloqueoSesion(error.body?.codigo)) {
          const codigo = String(error.body?.codigo)
          if (esCodigoSesionObsoleta(codigo)) {
            toast.error(error.message)
            limpiarSesionBloqueada()
            cerrarSesionLocal()
            window.location.replace(RUTA_LOGIN)
            return
          }
          marcarSesionBloqueada({
            codigo,
            mensaje: error.message,
            estado: esEstadoVigenciaValido(error.body?.estado) ? error.body?.estado : undefined,
            fechaInicio: typeof error.body?.fechaInicio === "string" ? error.body.fechaInicio : null,
            fechaFin: typeof error.body?.fechaFin === "string" ? error.body.fechaFin : null,
          })
          return
        }
        cerrarSesionLocal()
        setUsuario(null)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    verificarSesion()
    return () => {
      cancelado = true
      window.removeEventListener(EVENTO_SESION_BLOQUEADA, alBloquear)
    }
  }, [])

  useEffect(() => {
    if (vigenciaInvalida || cargando) return

    const enLogin = pathname === RUTA_LOGIN
    const enPublica = esRutaPublica(pathname)

    if (!usuario && !enPublica) {
      router.replace(RUTA_LOGIN)
      return
    }

    if (usuario && enLogin) {
      router.replace(PANEL_CONTROL.url)
    }
  }, [usuario, cargando, pathname, router, vigenciaInvalida])

  // Detecta cambios de permisos en la sesión activa: consulta los permisos
  // actuales (recalculados en vivo en el backend) y los compara con el snapshot
  // guardado al iniciar sesión. Si difieren, fuerza el cierre de sesión.
  useEffect(() => {
    if (cargando || vigenciaInvalida || !usuario || permisosCambiados) return
    let cancelado = false

    async function verificarPermisos() {
      try {
        const actuales = await authApi.mePermisos()
        if (cancelado) return
        const base = getPermisosHash()
        if (base && canonizarPermisos(actuales) !== base) {
          setPermisosCambiados(true)
        }
      } catch {
        // El 401 ya lo maneja apiFetch (logout normal); otros errores se ignoran.
      }
    }

    const primerChequeo = window.setTimeout(
      verificarPermisos,
      RETARDO_PRIMER_CHEQUEO_PERMISOS_MS
    )
    const intervalo = window.setInterval(
      verificarPermisos,
      INTERVALO_VERIFICACION_PERMISOS_MS
    )
    window.addEventListener("focus", verificarPermisos)
    // Un aviso en vivo de cambios en Accesos: se revisa al momento.
    window.addEventListener(EVENTO_REVISAR_PERMISOS, verificarPermisos)
    return () => {
      cancelado = true
      window.clearTimeout(primerChequeo)
      window.clearInterval(intervalo)
      window.removeEventListener("focus", verificarPermisos)
      window.removeEventListener(EVENTO_REVISAR_PERMISOS, verificarPermisos)
    }
  }, [usuario, cargando, permisosCambiados, vigenciaInvalida])

  // Datos de la cuenta en vivo: ante un aviso se vuelven a pedir. Sin skipLogout:
  // si la sesión ya no vale (p. ej. se quitó este dispositivo), apiFetch lleva al login.
  const haySesion = !!usuario
  useEffect(() => {
    if (!haySesion) return
    async function revisarCuenta() {
      try {
        const actual = await authApi.me()
        // Solo se reemplaza si cambió algo (evita volver a pintar sin motivo).
        setUsuario((previo) =>
          previo && JSON.stringify(previo) === JSON.stringify(actual) ? previo : actual
        )
      } catch {
        // 401: apiFetch ya cerró la sesión; otros errores: se reintenta en el próximo aviso.
      }
    }
    window.addEventListener(EVENTO_REVISAR_CUENTA, revisarCuenta)
    return () => window.removeEventListener(EVENTO_REVISAR_CUENTA, revisarCuenta)
  }, [haySesion])

  async function login(data: LoginRequest): Promise<LoginResponse> {
    const resp = await authApi.login(data)
    if (resp.requiereDosFactor) return resp
    abrirSesion(resp)
    return resp
  }

  async function verificarDosFactor(desafio: string, codigo: string, recordar: boolean) {
    const resp = await authApi.verificarDosFactor(desafio, codigo, recordar)
    abrirSesion(resp)
    return resp
  }

  function abrirSesion(resp: LoginResponse) {
    if (!resp.usuario || !resp.permisos) return
    limpiarSesionBloqueada()
    setDetalleBloqueo(null)
    setEsAdmin(resp.esAdmin)
    setPermisos(resp.permisos)
    setPermisosHash(canonizarPermisos(resp.permisos))
    setEsAdminState(resp.esAdmin)
    setPermisosState(resp.permisos)
    setUsuario(resp.usuario)
    setPermisosCambiados(false)
    router.replace(PANEL_CONTROL.url)
  }

  function logout() {
    limpiarSesionBloqueada()
    setDetalleBloqueo(null)
    void authApi.logout().catch(() => {})
    cerrarSesionLocal()
    setUsuario(null)
    setPermisosState(null)
    setEsAdminState(false)
    setPermisosCambiados(false)
    router.replace(RUTA_LOGIN)
  }

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (vigenciaInvalida) {
    const detalleModal = bloqueo ?? {
      codigo: estadoDeclarado
        ? estadoACodigoVigencia(estadoDeclarado)
        : CODIGOS_VIGENCIA.NO_DISPONIBLE,
      mensaje: estadoDeclarado
        ? mensajeEstadoVigencia(estadoDeclarado)
        : MENSAJE_NO_DISPONIBLE,
      estado: estadoDeclarado,
    }
    return (
      <AuthContext.Provider value={{ usuario, permisos, esAdmin, cargando, permisosCambiados, login, verificarDosFactor, logout }}>
        <VigenciaVencidaModal
          detalle={detalleModal}
          usuario={usuario}
          onCerrarSesion={logout}
        />
      </AuthContext.Provider>
    )
  }

  // El sistema queda difuminado detrás del modal. Sus consultas fallan con 403
  // mientras tanto, por eso se recargan al completar el cambio.
  const cambioPendiente = !!usuario?.debeCambiarContrasena && !esRutaPublica(pathname)

  function onContrasenaCambiada() {
    limpiarSesionBloqueada()
    setDetalleBloqueo(null)
    setUsuario((u) => (u ? { ...u, debeCambiarContrasena: false } : u))
    void authApi
      .meSesion()
      .then(setUsuario)
      .catch(() => {})
    void queryClient.invalidateQueries()
  }

  return (
    <AuthContext.Provider value={{ usuario, permisos, esAdmin, cargando, permisosCambiados, login, verificarDosFactor, logout }}>
      {children}
      {cambioPendiente && (
        <CambiarContrasenaDialog
          open
          obligatorio
          onCambiada={onContrasenaCambiada}
          onCerrarSesion={logout}
        />
      )}
      {usuario && (
        <PermisosActualizadosModal
          abierto={permisosCambiados}
          onCerrarSesion={logout}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return ctx
}