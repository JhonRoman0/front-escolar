import { apiFetch } from "@/lib/api"

// ─────────── Tipos (espejo de los DTOs del back Escolar) ───────────

export interface LoginRequest {
  codigo: string
  contraseña: string
}

export interface RolResponse {
  idRol: number
  nombre: string
  accesoId: number | null
}

export interface UsuarioResponse {
  idUsuario: number
  nombre: string
  apellidoPat: string
  apellidoMat: string
  codigo: string
  documentoIdentidad: string | null
  accesoId: number | null
  gmail: string | null
  fechaNaci: string | null
  urlFoto: string | null
  pkUrlFoto: string | null
  intentosFallidos: number | null
  fechaBloqueo: string | null
  nombreRol: string | null
  roles: RolResponse[]
  debeCambiarContrasena?: boolean
  fechaInicioVigencia?: string | null
  fechaFinVigencia?: string | null
  estadoVigencia?: string | null
}

export interface PermisoAccionResponse {
  idPermiso: number
  codigo: string
  nombre: string
  accionesDisponibles: string[]
  accionesConcedidas: string[]
}

export interface ModuloPermisosResponse {
  idModulo: number
  modulo: string
  icono: string | null
  permisos: PermisoAccionResponse[]
}

export interface PermisosRolResponse {
  idRol: number | null
  nombreRol: string | null
  modulos: ModuloPermisosResponse[]
  // Con solo lectura, el docente ve lo suyo y el apoderado lo de sus hijos.
  vinculo?: "DOCENTE" | "APODERADO" | null
}

export interface LoginResponse {
  token: string | null
  usuario: UsuarioResponse | null
  permisos: PermisosRolResponse | null
  esAdmin: boolean
  // Contraseña correcta pero falta el código del correo (aún sin sesión).
  requiereDosFactor?: boolean
  desafio?: string | null
  correoEnmascarado?: string | null
  segundosReenvio?: number | null
  minutosCodigo?: number | null
}

/** Inicio de sesión a medias: datos del paso del código. */
export interface DesafioDosFactor {
  desafio: string
  correoEnmascarado: string
  segundosReenvio: number
  minutosCodigo: number
}

export interface DispositivoResponse {
  idDispositivo: number
  navegador: string
  ip: string | null
  primerUso: string
  ultimoUso: string
  // Vacío si no es de confianza (o la confianza venció).
  confiableHasta: string | null
  actual: boolean
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string
  nuevaContrasena: string
}

/** Clave de la consulta "mis dispositivos" (Mi perfil); la recargan los avisos de cuenta. */
export const CLAVE_DISPOSITIVOS = ["mis-dispositivos"]

// ─────────── API ───────────

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      skipLogout: true,
    })
  },

  async verificarDosFactor(
    desafio: string,
    codigo: string,
    recordar: boolean
  ): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/2fa/verificar", {
      method: "POST",
      body: JSON.stringify({ desafio, codigo, recordar }),
      skipLogout: true,
    })
  },

  async reenviarDosFactor(desafio: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/2fa/reenviar", {
      method: "POST",
      body: JSON.stringify({ desafio }),
      skipLogout: true,
    })
  },

  async dispositivos(): Promise<DispositivoResponse[]> {
    return apiFetch<DispositivoResponse[]>("/auth/dispositivos")
  },

  async olvidarDispositivo(id: number): Promise<void> {
    return apiFetch<void>(`/auth/dispositivos/${id}`, { method: "DELETE" })
  },

  async me(): Promise<UsuarioResponse> {
    return apiFetch<UsuarioResponse>("/auth/me")
  },

  // Chequeo de sesión (cookie httpOnly): nunca redirige a login automáticamente
  // para no romper rutas públicas como el portal.
  async meSesion(): Promise<UsuarioResponse> {
    return apiFetch<UsuarioResponse>("/auth/me", { skipLogout: true })
  },

  // Permisos actuales del usuario conectado, recalculados en vivo desde la BD.
  // Sin skipLogout: si la sesión ya expiró, apiFetch ejecuta el logout normal.
  async mePermisos(): Promise<PermisosRolResponse> {
    return apiFetch<PermisosRolResponse>("/auth/permisos")
  },

  async logout(): Promise<void> {
    return apiFetch<void>("/auth/logout", { method: "POST", skipLogout: true })
  },

  async forgotPassword(gmail: string): Promise<{ mensaje: string }> {
    return apiFetch<{ mensaje: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ gmail }),
      skipLogout: true,
    })
  },

  async verifyResetCode(
    gmail: string,
    codigo: string
  ): Promise<{ mensaje: string }> {
    return apiFetch<{ mensaje: string }>("/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify({ gmail, codigo }),
      skipLogout: true,
    })
  },

  async resetPassword(
    gmail: string,
    codigo: string,
    nuevaContrasena: string
  ): Promise<{ mensaje: string }> {
    return apiFetch<{ mensaje: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ gmail, codigo, nuevaContrasena }),
      skipLogout: true,
    })
  },

  // El backend identifica al usuario por el token de sesión; este request no
  // lleva idUsuario. Una contraseña actual incorrecta responde 400 (no 401),
  // así el frontend no la interpreta como sesión caducada.
  async cambiarContrasena(data: CambiarContrasenaRequest): Promise<{ mensaje: string }> {
    return apiFetch<{ mensaje: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}