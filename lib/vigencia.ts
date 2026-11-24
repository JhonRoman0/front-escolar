import { dateAIso, isoADate } from "@/lib/fechas"

export const ESTADOS_VIGENCIA = {
  VIGENTE: "VIGENTE",
  INDEFINIDA: "INDEFINIDA",
  NO_INICIADA: "NO_INICIADA",
  VENCIDA: "VENCIDA",
} as const

export type EstadoVigencia =
  (typeof ESTADOS_VIGENCIA)[keyof typeof ESTADOS_VIGENCIA]

export const ETIQUETAS_ESTADO_VIGENCIA: Record<EstadoVigencia, string> = {
  VIGENTE: "Vigente",
  INDEFINIDA: "Indefinida",
  NO_INICIADA: "No iniciada",
  VENCIDA: "Vencida",
}

export const OPCIONES_ESTADO_VIGENCIA = Object.values(ESTADOS_VIGENCIA).map(
  (estado) => ({ value: estado, label: ETIQUETAS_ESTADO_VIGENCIA[estado] })
)

export function etiquetaEstadoVigencia(estado: unknown): string {
  return esEstadoVigenciaValido(estado)
    ? ETIQUETAS_ESTADO_VIGENCIA[estado]
    : "Desconocida"
}

export const CODIGOS_VIGENCIA = {
  VIGENTE: "VIGENCIA_VIGENTE",
  INDEFINIDA: "VIGENCIA_INDEFINIDA",
  NO_INICIADA: "VIGENCIA_NO_INICIADA",
  VENCIDA: "VIGENCIA_VENCIDA",
  TOKEN_OBSOLETO: "VIGENCIA_TOKEN_OBSOLETO",
  NO_DISPONIBLE: "VIGENCIA_NO_DISPONIBLE",
  CAMBIO_CONTRASENA: "CAMBIO_CONTRASENA_REQUERIDO",
} as const

export const MENSAJE_NO_DISPONIBLE =
  "No se pudo verificar la vigencia de su cuenta."
export const TEXTO_SIN_FIN = "Sin fecha de fin"

const CODIGOS_BLOQUEO_VIGENCIA = new Set<string>([
  CODIGOS_VIGENCIA.NO_INICIADA,
  CODIGOS_VIGENCIA.VENCIDA,
  CODIGOS_VIGENCIA.NO_DISPONIBLE,
])

const ESTADOS_VALIDOS = new Set<string>(Object.values(ESTADOS_VIGENCIA))

function hoyVigenciaISO(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ""
  return `${valor("year")}-${valor("month")}-${valor("day")}`
}

export function inicioVigenciaPorDefecto(): string {
  return hoyVigenciaISO()
}

export function esEstadoVigenciaValido(
  estado: unknown
): estado is EstadoVigencia {
  return typeof estado === "string" && ESTADOS_VALIDOS.has(estado)
}

export function esEstadoVigenciaBloqueante(
  estado: unknown
): estado is EstadoVigencia {
  return (
    estado === ESTADOS_VIGENCIA.NO_INICIADA ||
    estado === ESTADOS_VIGENCIA.VENCIDA
  )
}

export function codigoVigenciaAEstado(
  codigo: unknown
): EstadoVigencia | undefined {
  switch (codigo) {
    case CODIGOS_VIGENCIA.NO_INICIADA:
      return ESTADOS_VIGENCIA.NO_INICIADA
    case CODIGOS_VIGENCIA.VENCIDA:
      return ESTADOS_VIGENCIA.VENCIDA
    case CODIGOS_VIGENCIA.INDEFINIDA:
      return ESTADOS_VIGENCIA.INDEFINIDA
    case CODIGOS_VIGENCIA.VIGENTE:
      return ESTADOS_VIGENCIA.VIGENTE
    default:
      return undefined
  }
}

export function estadoACodigoVigencia(estado: EstadoVigencia): string {
  switch (estado) {
    case ESTADOS_VIGENCIA.NO_INICIADA:
      return CODIGOS_VIGENCIA.NO_INICIADA
    case ESTADOS_VIGENCIA.VENCIDA:
      return CODIGOS_VIGENCIA.VENCIDA
    case ESTADOS_VIGENCIA.INDEFINIDA:
      return CODIGOS_VIGENCIA.INDEFINIDA
    default:
      return CODIGOS_VIGENCIA.VIGENTE
  }
}

export function esCodigoBloqueoVigencia(codigo: unknown): boolean {
  return (
    typeof codigo === "string" &&
    (CODIGOS_BLOQUEO_VIGENCIA.has(codigo) ||
      (codigo.startsWith("VIGENCIA_") && !esCodigoSesionObsoleta(codigo)))
  )
}

export function esCodigoSesionObsoleta(codigo: unknown): boolean {
  return codigo === CODIGOS_VIGENCIA.TOKEN_OBSOLETO
}

export function esCodigoBloqueoSesion(codigo: unknown): boolean {
  return (
    esCodigoBloqueoVigencia(codigo) ||
    esCodigoSesionObsoleta(codigo) ||
    codigo === CODIGOS_VIGENCIA.CAMBIO_CONTRASENA
  )
}

export function tituloBloqueoVigencia(
  codigo: unknown,
  estado?: EstadoVigencia
): string {
  if (codigo === CODIGOS_VIGENCIA.NO_DISPONIBLE) {
    return "No se pudo verificar la vigencia"
  }
  if (estado === ESTADOS_VIGENCIA.NO_INICIADA) {
    return "Tu vigencia aún no ha iniciado"
  }
  return "Tu vigencia no está activa"
}

export function validarFechaISO(iso: unknown): iso is string {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const fecha = isoADate(iso)
  return !!fecha && dateAIso(fecha) === iso
}

export interface DatosVigencia {
  inicio?: string | null
  fin?: string | null
  indefinida?: boolean
}

export function estadoVigenciaEfectivo({
  estado,
  inicio,
  fin,
  hoy = hoyVigenciaISO(),
}: {
  estado?: string | null
  inicio?: string | null
  fin?: string | null
  hoy?: string
}): EstadoVigencia {
  if (esEstadoVigenciaValido(estado)) return estado
  if (!validarFechaISO(inicio)) return ESTADOS_VIGENCIA.VENCIDA
  if (validarFechaISO(fin) && fin < inicio) return ESTADOS_VIGENCIA.VENCIDA
  if (inicio > hoy) return ESTADOS_VIGENCIA.NO_INICIADA
  if (!validarFechaISO(fin)) return ESTADOS_VIGENCIA.INDEFINIDA
  if (fin < hoy) return ESTADOS_VIGENCIA.VENCIDA
  return ESTADOS_VIGENCIA.VIGENTE
}

export function mensajeEstadoVigencia(estado: EstadoVigencia): string {
  if (estado === ESTADOS_VIGENCIA.NO_INICIADA) {
    return "Tu vigencia aún no ha iniciado. No puedes ingresar hasta la fecha de inicio indicada."
  }
  if (estado === ESTADOS_VIGENCIA.VENCIDA) {
    return "Tu vigencia ha vencido. Solicita al administrador que renueve el periodo de acceso."
  }
  if (estado === ESTADOS_VIGENCIA.INDEFINIDA) {
    return "Tu vigencia es indefinida."
  }
  return "Tu vigencia está activa."
}

export function errorVigencia({
  inicio,
  fin,
  indefinida,
}: DatosVigencia): string | null {
  if (!validarFechaISO(inicio)) {
    return "La fecha de inicio de vigencia es obligatoria (aaaa-mm-dd)."
  }
  if (indefinida) {
    if (fin) {
      return "No ingreses una fecha de fin cuando la vigencia es indefinida."
    }
    return null
  }
  if (!fin) {
    return `La fecha de fin de vigencia es obligatoria o marca «${TEXTO_SIN_FIN}».`
  }
  if (!validarFechaISO(fin)) {
    return "La fecha de fin de vigencia debe tener formato aaaa-mm-dd."
  }
  const fechaInicio = isoADate(inicio)
  const fechaFin = isoADate(fin)
  if (fechaInicio && fechaFin && fechaInicio.getTime() > fechaFin.getTime()) {
    return "La fecha de fin debe ser igual o posterior a la fecha inicial."
  }
  return null
}
