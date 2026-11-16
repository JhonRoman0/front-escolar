import { apiFetch } from "@/lib/api"

// ── Competencia (viene del Excel del SIAGIE: solo se activa o desactiva) ──

export interface CompetenciaResponse {
  idCompetencia: number
  /** Número de la LEYENDA del SIAGIE ("01", "02"...). */
  codigo: string
  competencia: string
  idCurso: number
  curso: string
  orden: number
  accesoId: number | null
}

// ── Nota SIAGIE ───────────────────────────────────────────────────────────

export interface NotaResponse {
  idNota: number
  idMatricula: number
  idAlumno: number
  codigoAlumno: string
  alumno: string
  idCompetencia: number
  competencia: string
  idCurso: number
  curso: string
  bimestre: number
  calificacion: string
  conclusionDescriptiva: string | null
  fechaRegistro: string
  docenteRegistro: string
}

// ── Promedio SIAGIE ───────────────────────────────────────────────────────

// ── API ──────────────────────────────────────────────────────────────────

export const competenciasApi = {
  async listar(idCurso?: number): Promise<CompetenciaResponse[]> {
    const params = new URLSearchParams()
    if (idCurso) params.set("idCurso", String(idCurso))
    const query = params.toString()
    return apiFetch<CompetenciaResponse[]>(
      `/competencias${query ? `?${query}` : ""}`
    )
  },
  async cambiarEstado(idCompetencia: number, accesoId: number): Promise<CompetenciaResponse> {
    return apiFetch<CompetenciaResponse>(`/competencias/${idCompetencia}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ accesoId }),
    })
  },
}

export const notasApi = {
  async porCompetencia(
    idCompetencia: number,
    bimestre?: number
  ): Promise<NotaResponse[]> {
    const params = new URLSearchParams()
    if (bimestre) params.set("bimestre", String(bimestre))
    const query = params.toString()
    return apiFetch<NotaResponse[]>(
      `/notas/competencia/${idCompetencia}${query ? `?${query}` : ""}`
    )
  },
  async porMatricula(idMatricula: number): Promise<NotaResponse[]> {
    return apiFetch<NotaResponse[]>(`/notas/matricula/${idMatricula}`)
  },
}
