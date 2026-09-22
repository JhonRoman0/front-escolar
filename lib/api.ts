const ES_ADMIN_KEY = "escolar_es_admin"
const PERMISOS_KEY = "escolar_permisos"

// Página estándar de Spring Data (Page<T>) que devuelven los endpoints paginados.
export interface Paginated<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  numberOfElements: number
  first: boolean
  last: boolean
  empty: boolean
}

// Fábrica CRUD genérica ≡ un @RestController estándar del back
// (GET list, GET /{id}, POST 201, PUT /{id}, DELETE 204).
export function crud<T, R>(base: string) {
  return {
    async listar(): Promise<T[]> {
      return apiFetch<T[]>(base)
    },
    async porId(id: number): Promise<T> {
      return apiFetch<T>(`${base}/${id}`)
    },
    async crear(data: R): Promise<T> {
      return apiFetch<T>(base, { method: "POST", body: JSON.stringify(data) })
    },
    async actualizar(id: number, data: R): Promise<T> {
      return apiFetch<T>(`${base}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
    },
    async eliminar(id: number): Promise<void> {
      return apiFetch<void>(`${base}/${id}`, { method: "DELETE" })
    },
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function getEsAdmin(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(ES_ADMIN_KEY) === "true"
}

export function setEsAdmin(esAdmin: boolean): void {
  localStorage.setItem(ES_ADMIN_KEY, String(esAdmin))
}

export function getPermisos<T>(): T | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(PERMISOS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setPermisos<T>(permisos: T): void {
  localStorage.setItem(PERMISOS_KEY, JSON.stringify(permisos))
}

// La sesión ahora vive en una cookie httpOnly (escolar_token) que manda el navegador.
// Aquí solo se limpian datos no sensibles de sesión.
export function cerrarSesionLocal(): void {
  localStorage.removeItem(ES_ADMIN_KEY)
  localStorage.removeItem(PERMISOS_KEY)
}

async function notificarLogout(apiUrl: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" })
  } catch {
    // Silencioso: el usuario ya va a login; la cookie expira sola.
  }
}

type FetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob"
  skipLogout?: boolean
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL no está definida en .env")
  }

  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(!isFormData && options.body && { "Content-Type": "application/json" }),
      ...(API_URL.includes("ngrok-free") && { "ngrok-skip-browser-warning": "true" }),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    if (!options.skipLogout) {
      void notificarLogout(API_URL)
      cerrarSesionLocal()
      if (typeof window !== "undefined") {
        window.location.replace("/login")
      }
    }
    throw new ApiError("Tu sesión expiró. Vuelve a iniciar sesión.", 401)
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type")
    let message = `Error ${response.status}`
    if (contentType?.includes("application/json")) {
      try {
        const body = await response.json()
        message = body?.mensaje ?? body?.message ?? message
      } catch {
      }
    } else {
      const text = await response.text()
      if (text) message = text
    }
    throw new ApiError(message, response.status)
  }

  if (options.responseType === "blob") {
    return response.blob() as unknown as Promise<T>
  }

  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>
  }
  return response.text() as unknown as T
}