"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

import { authApi, type LoginRequest, type LoginResponse, type PermisosRolResponse, type UsuarioResponse } from "@/lib/api/auth"
import {
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

const RUTA_LOGIN = "/login"
const INTERVALO_VERIFICACION_PERMISOS_MS = 30_000
const RETARDO_PRIMER_CHEQUEO_PERMISOS_MS = 1_500
const RUTAS_PUBLICAS = ["/login", "/sin-acceso"]
function esRutaPublica(pathname: string) {
  return (
    RUTAS_PUBLICAS.includes(pathname) ||
    pathname.startsWith("/portal") ||
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
  login: (data: LoginRequest) => Promise<LoginResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [permisos, setPermisosState] = useState<PermisosRolResponse | null>(null)
  const [esAdmin, setEsAdminState] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [permisosCambiados, setPermisosCambiados] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let cancelado = false

    async function verificarSesion() {
      setEsAdminState(getEsAdmin())
      setPermisosState(getPermisos<PermisosRolResponse>())

      try {
        const usuario = await authApi.meSesion()
        if (!cancelado) {
          setUsuario(usuario)
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
      } catch {
        if (!cancelado) {
          cerrarSesionLocal()
          setUsuario(null)
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    verificarSesion()
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (cargando) return

    const enLogin = pathname === RUTA_LOGIN
    const enPublica = esRutaPublica(pathname)

    if (!usuario && !enPublica) {
      router.replace(RUTA_LOGIN)
      return
    }

    if (usuario && enLogin) {
      router.replace("/")
    }
  }, [usuario, cargando, pathname, router])

  // Detecta cambios de permisos en la sesión activa: consulta los permisos
  // actuales (recalculados en vivo en el backend) y los compara con el snapshot
  // guardado al iniciar sesión. Si difieren, fuerza el cierre de sesión.
  useEffect(() => {
    if (cargando || !usuario || permisosCambiados) return
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
    return () => {
      cancelado = true
      window.clearTimeout(primerChequeo)
      window.clearInterval(intervalo)
      window.removeEventListener("focus", verificarPermisos)
    }
  }, [usuario, cargando, permisosCambiados])

  async function login(data: LoginRequest): Promise<LoginResponse> {
    const resp = await authApi.login(data)
    setEsAdmin(resp.esAdmin)
    setPermisos(resp.permisos)
    setPermisosHash(canonizarPermisos(resp.permisos))
    setEsAdminState(resp.esAdmin)
    setPermisosState(resp.permisos)
    setUsuario(resp.usuario)
    setPermisosCambiados(false)
    router.replace("/")
    return resp
  }

  function logout() {
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

  return (
    <AuthContext.Provider value={{ usuario, permisos, esAdmin, cargando, permisosCambiados, login, logout }}>
      {children}
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