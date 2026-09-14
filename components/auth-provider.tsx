"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

import { authApi, type LoginRequest, type LoginResponse, type PermisosRolResponse, type UsuarioResponse } from "@/lib/api/auth"
import { cerrarSesionLocal, getEsAdmin, setEsAdmin, getPermisos, setPermisos } from "@/lib/api"

const RUTA_LOGIN = "/login"
const RUTAS_PUBLICAS = ["/login", "/sin-acceso"]
function esRutaPublica(pathname: string) {
  return RUTAS_PUBLICAS.includes(pathname) || pathname.startsWith("/portal")
}

interface AuthContextValue {
  usuario: UsuarioResponse | null
  permisos: PermisosRolResponse | null
  esAdmin: boolean
  cargando: boolean
  login: (data: LoginRequest) => Promise<LoginResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [permisos, setPermisosState] = useState<PermisosRolResponse | null>(null)
  const [esAdmin, setEsAdminState] = useState(false)
  const [cargando, setCargando] = useState(true)
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

  async function login(data: LoginRequest): Promise<LoginResponse> {
    const resp = await authApi.login(data)
    setEsAdmin(resp.esAdmin)
    setPermisos(resp.permisos)
    setEsAdminState(resp.esAdmin)
    setPermisosState(resp.permisos)
    setUsuario(resp.usuario)
    router.replace("/")
    return resp
  }

  function logout() {
    void authApi.logout().catch(() => {})
    cerrarSesionLocal()
    setUsuario(null)
    setPermisosState(null)
    setEsAdminState(false)
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
    <AuthContext.Provider value={{ usuario, permisos, esAdmin, cargando, login, logout }}>
      {children}
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