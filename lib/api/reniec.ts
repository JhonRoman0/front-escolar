import { apiFetch } from "@/lib/api"

export interface ReniecResponse {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  codVerifica: string | null
  origen: "LOCAL" | "CACHE" | "RENIEC"
}

export const reniecApi = {
  async consultarDni(numero: string): Promise<ReniecResponse> {
    return apiFetch<ReniecResponse>(`/consulta/dni/${encodeURIComponent(numero)}`)
  },
}
