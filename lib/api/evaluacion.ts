import { apiFetch } from "@/lib/api"

// ── Competencia (catálogo, solo lectura) ──────────────────────────────────

export interface CompetenciaResponse {
  idCompetencia: number
  competencia: string
  idCurso: number
  curso: string
  orden: number
  acceso: number
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

export interface NotaRequest {
  idMatricula: number
  idCompetencia: number
  bimestre: number
  calificacion: string
  conclusionDescriptiva?: string | null
  codigoAutorizacion?: string | null
}

export interface NotaBatchRequest {
  idCompetencia: number
  bimestre: number
  notas: {
    idMatricula: number
    calificacion: string
    conclusionDescriptiva?: string | null
  }[]
  codigoAutorizacion?: string | null
}

// ── Consolidado SIAGIE ───────────────────────────────────────────────────

export interface ConsolidadoCompetenciaItem {
  idCompetencia: number
  competencia: string
  orden: number
  idNota: number | null
  calificacion: string | null
  conclusionDescriptiva: string | null
  fechaRegistro: string | null
}

export interface ConsolidadoAlumnoItem {
  idMatricula: number
  idAlumno: number
  codigoAlumno: string
  alumno: string
  idCurso: number
  curso: string
  bimestre: number
  competencias: ConsolidadoCompetenciaItem[]
}

// ── Promedio SIAGIE ───────────────────────────────────────────────────────

export interface PromedioResponse {
  idMatricula: number
  idAlumno: number
  codigoAlumno: string
  alumno: string
  promedios: {
    bimestre: number
    promedioLiteral: string
  }[]
}

// ── Autorización (sin cambios) ────────────────────────────────────────────

export interface AutorizacionResponse {
  codigo: string
  destinatario: string
  fechaGeneracion: string
  fechaExpiracion: string
}

export interface AutorizacionRegistroResponse {
  idNotaAutorizacion: number
  codigo: string | null
  emisor: string
  destinatario: string
  fechaAsignacion: string
  fechaGeneracion: string
  fechaExpiracion: string
  estado: "ACTIVA" | "USADA" | "EXPIRADA"
  consumidor: string | null
  fechaUso: string | null
}

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
  async promedio(idMatricula: number): Promise<PromedioResponse> {
    return apiFetch<PromedioResponse>(
      `/notas/matricula/${idMatricula}/promedio`
    )
  },
  async consolidado(
    idGradoSeccion: number,
    bimestre: number,
    idCurso: number
  ): Promise<ConsolidadoAlumnoItem[]> {
    const params = new URLSearchParams({
      idGradoSeccion: String(idGradoSeccion),
      bimestre: String(bimestre),
      idCurso: String(idCurso),
    })
    return apiFetch<ConsolidadoAlumnoItem[]>(
      `/notas/consolidado?${params.toString()}`
    )
  },
  async registrar(data: NotaRequest): Promise<NotaResponse> {
    return apiFetch<NotaResponse>("/notas", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async registrarLote(data: NotaBatchRequest): Promise<NotaResponse[]> {
    return apiFetch<NotaResponse[]>("/notas/batch", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  async exportarSiagie(
    idGradoSeccion: number,
    bimestre: number
  ): Promise<Blob> {
    const params = new URLSearchParams({
      idGradoSeccion: String(idGradoSeccion),
      bimestre: String(bimestre),
    })
    return apiFetch<Blob>(`/notas/exportar?${params.toString()}`, {
      headers: { Accept: "application/octet-stream" },
      responseType: "blob",
      skipLogout: true,
    })
  },
  async generarAutorizacion(
    idUsuarioDestinatario: number
  ): Promise<AutorizacionResponse> {
    return apiFetch<AutorizacionResponse>("/notas/autorizaciones", {
      method: "POST",
      body: JSON.stringify({ idUsuarioDestinatario }),
    })
  },
  async validarAutorizacion(
    codigo: string
  ): Promise<{ valido: boolean }> {
    return apiFetch<{ valido: boolean }>("/notas/autorizaciones/validar", {
      method: "POST",
      body: JSON.stringify({ codigo }),
    })
  },
  async listarAutorizaciones(): Promise<AutorizacionRegistroResponse[]> {
    return apiFetch<AutorizacionRegistroResponse[]>("/notas/autorizaciones")
  },
}
