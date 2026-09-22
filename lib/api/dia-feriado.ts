import { crud } from "@/lib/api"

// ≡ DiaFeriadoResponse (GET /dias-feriados). idAnioEscolar null = feriado
// global (aplica a todos los años escolares).
export interface DiaFeriadoResponse {
  idDiaFeriado: number
  /** "YYYY-MM-DD". */
  fecha: string
  motivo: string
  idAnioEscolar: number | null
  anio: string | null
  accesoId: number | null
}

// ≡ DiaFeriadoRequest (@Valid del back). El back NO valida duplicados de
// fecha + año → advertencia informativa en el form del front.
export interface DiaFeriadoRequest {
  fecha: string
  motivo: string
  idAnioEscolar?: number | null
  accesoId?: number | null
}

export const diasFeriadosApi = crud<DiaFeriadoResponse, DiaFeriadoRequest>(
  "/dias-feriados"
)
