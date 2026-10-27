import { apiFetch } from "@/lib/api"

export interface MetodoPagoResponse {
  idMetodoPago: number
  nombre: string
  requiereCodigo: boolean
  requiereComprobante: boolean
  activo: boolean
}

export interface MetodoPagoRequest {
  nombre: string
  requiereCodigo: boolean
  requiereComprobante: boolean
  activo?: boolean
}

export interface MontoMatriculaResponse {
  idNivel: number
  nivel: string
  monto: number | null
  // Monto del año anterior cuando este aún no tiene ninguno.
  sugerido: number | null
}

export interface MontoMatriculaRequest {
  idAnio: number
  montos: { idNivel: number; monto: number }[]
}

export interface ParentescoResponse {
  idParentesco: number
  nombre: string
}

export interface OpcionResponse {
  valor: string
  nombre: string
}

export const pagosApi = {
  async metodos(soloActivos = false): Promise<MetodoPagoResponse[]> {
    return apiFetch<MetodoPagoResponse[]>(`/metodos-pago${soloActivos ? "?soloActivos=true" : ""}`)
  },
  async crearMetodo(data: MetodoPagoRequest): Promise<MetodoPagoResponse> {
    return apiFetch<MetodoPagoResponse>("/metodos-pago", { method: "POST", body: JSON.stringify(data) })
  },
  async actualizarMetodo(id: number, data: MetodoPagoRequest): Promise<MetodoPagoResponse> {
    return apiFetch<MetodoPagoResponse>(`/metodos-pago/${id}`, { method: "PUT", body: JSON.stringify(data) })
  },
  async eliminarMetodo(id: number): Promise<void> {
    return apiFetch<void>(`/metodos-pago/${id}`, { method: "DELETE" })
  },
  async montos(idAnio: number): Promise<MontoMatriculaResponse[]> {
    return apiFetch<MontoMatriculaResponse[]>(`/montos-matricula?idAnio=${idAnio}`)
  },
  async guardarMontos(data: MontoMatriculaRequest): Promise<MontoMatriculaResponse[]> {
    return apiFetch<MontoMatriculaResponse[]>("/montos-matricula", { method: "PUT", body: JSON.stringify(data) })
  },
  async parentescos(): Promise<ParentescoResponse[]> {
    return apiFetch<ParentescoResponse[]>("/parentescos")
  },
  async sexos(): Promise<OpcionResponse[]> {
    return apiFetch<OpcionResponse[]>("/sexos")
  },
}
