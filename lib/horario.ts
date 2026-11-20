export interface BloqueTemporal {
  diaSemana: number
  horaInicio: string
  horaFin: string
  turno?: string
}

export interface DatosClase extends BloqueTemporal {
  curso: string
  docente: string
  aula: string
  grado: string
  seccion: string
  nivel?: string | null
}

export const DIAS_HORARIO = [1, 2, 3, 4, 5, 6] as const
export const NOMBRES_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
export const MINUTOS_SLOT = 30

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function formatearRango(inicio: number, fin: number): string {
  return `${minutosAHora(inicio)}–${minutosAHora(fin)}`
}

export function esDiaVisible(dia: number): boolean {
  return dia >= 1 && dia <= DIAS_HORARIO.length
}

export function diasHorarioVisibles(
  clases: readonly { diaSemana: number }[],
  recreos: readonly { diaSemana: number }[] = [],
): number[] {
  const dias: number[] = [1, 2, 3, 4, 5]
  const haySabado = clases.some((clase) => clase.diaSemana === 6) || recreos.some((recreo) => recreo.diaSemana === 6)
  if (haySabado) dias.push(6)
  return dias
}

export function etiquetaSeccion(datos: Pick<DatosClase, "grado" | "seccion" | "nivel">): string {
  return `${datos.grado} ${datos.seccion}${datos.nivel ? ` · ${datos.nivel}` : ""}`
}

export function limitesHorario(
  horarios: readonly BloqueTemporal[],
  recreos: readonly BloqueTemporal[],
  horaEntrada?: string,
  horaSalida?: string,
): { min: number; max: number } | null {
  let min = horaEntrada ? aMinutos(horaEntrada) : Infinity
  let max = horaSalida ? aMinutos(horaSalida) : 0

  for (const bloque of [...horarios, ...recreos]) {
    if (!esDiaVisible(bloque.diaSemana)) continue
    const inicio = aMinutos(bloque.horaInicio)
    const fin = aMinutos(bloque.horaFin)
    if (inicio < min) min = inicio
    if (fin > max) max = fin
  }

  if (!Number.isFinite(min)) return null

  const minAjustado = Math.floor(min / MINUTOS_SLOT) * MINUTOS_SLOT
  const maxAjustado = Math.max(Math.ceil(max / MINUTOS_SLOT) * MINUTOS_SLOT, minAjustado + MINUTOS_SLOT)
  return { min: minAjustado, max: maxAjustado }
}

export function ticksHorario(limites: { min: number; max: number }): number[] {
  const ticks: number[] = []
  for (let min = limites.min; min <= limites.max; min += MINUTOS_SLOT) ticks.push(min)
  return ticks
}

export interface FranjaRecreo {
  key: string
  desdeDia: number
  hastaDia: number
  inicio: number
  fin: number
  rango: string
}

export function agruparRecreos(recreos: readonly BloqueTemporal[]): FranjaRecreo[] {
  const grupos = new Map<string, { inicio: number; fin: number; dias: Set<number> }>()

  for (const recreo of recreos) {
    if (!esDiaVisible(recreo.diaSemana)) continue
    const inicio = aMinutos(recreo.horaInicio)
    const fin = aMinutos(recreo.horaFin)
    const clave = `${inicio}-${fin}`
    const grupo = grupos.get(clave) ?? { inicio, fin, dias: new Set<number>() }
    grupo.dias.add(recreo.diaSemana)
    grupos.set(clave, grupo)
  }

  const franjas: FranjaRecreo[] = []

  for (const grupo of grupos.values()) {
    const dias = [...grupo.dias].sort((a, b) => a - b)
    let desde = dias[0]
    let anterior = desde

    for (let i = 1; i <= dias.length; i++) {
      const dia = dias[i]
      if (dia === anterior + 1) {
        anterior = dia
        continue
      }

      franjas.push({
        key: `${grupo.inicio}-${grupo.fin}-${desde}`,
        desdeDia: desde,
        hastaDia: anterior,
        inicio: grupo.inicio,
        fin: grupo.fin,
        rango: formatearRango(grupo.inicio, grupo.fin),
      })

      desde = dia
      anterior = dia
    }
  }

  return franjas.sort((a, b) => a.inicio - b.inicio || a.desdeDia - b.desdeDia)
}

export interface CamposTarjeta {
  curso: string
  rango: string
  dia: string
  docente: string
  seccion: string
  aula: string
  turno: string
  secundario: string
  ubicacion: string
}

export function camposTarjeta(datos: DatosClase, vista: "seccion" | "docente"): CamposTarjeta {
  const seccion = etiquetaSeccion(datos)
  return {
    curso: datos.curso,
    rango: formatearRango(aMinutos(datos.horaInicio), aMinutos(datos.horaFin)),
    dia: NOMBRES_DIAS[datos.diaSemana - 1] ?? `Día ${datos.diaSemana}`,
    docente: datos.docente,
    seccion,
    aula: datos.aula,
    turno: datos.turno ?? "",
    secundario: vista === "docente" ? seccion : datos.docente,
    ubicacion: vista === "docente" ? [datos.aula, datos.turno].filter(Boolean).join(" · ") : datos.aula,
  }
}

export type TipoLinea = "curso" | "rango" | "detalle"
export type PesoTexto = 400 | 500 | 700

export interface CampoMedible {
  texto: string
  peso: PesoTexto
  tipo: TipoLinea
}

export interface LineaTarjeta {
  texto: string
  peso: PesoTexto
  tipo: TipoLinea
  elipsis?: boolean
}

export interface OpcionesSeleccionTarjeta {
  ancho: number
  alto: number
  alturaLinea: number
  separacionLineas?: number
  medirLineas: (texto: string, ancho: number, peso: PesoTexto) => string[]
  truncarTexto?: (texto: string, ancho: number, peso: PesoTexto) => string
}

function unirCampos(...valores: string[]): string {
  return valores.filter(Boolean).join(" · ")
}

function composicionesTarjeta(campos: CamposTarjeta): CampoMedible[][] {
  const curso: CampoMedible = { texto: campos.curso, peso: 700, tipo: "curso" }
  const rango: CampoMedible = { texto: campos.rango, peso: 500, tipo: "rango" }
  const secundario: CampoMedible = { texto: campos.secundario, peso: 400, tipo: "detalle" }
  const ubicacion: CampoMedible = { texto: campos.ubicacion, peso: 400, tipo: "detalle" }
  const secundarioUbicacion: CampoMedible = {
    texto: unirCampos(campos.secundario, campos.ubicacion),
    peso: 400,
    tipo: "detalle",
  }
  const todos: CampoMedible = {
    texto: unirCampos(campos.secundario, campos.ubicacion, campos.rango),
    peso: 400,
    tipo: "detalle",
  }
  const cursoRango: CampoMedible = {
    texto: unirCampos(campos.curso, campos.rango),
    peso: 700,
    tipo: "curso",
  }

  return [
    [curso, secundario, ubicacion, rango],
    [curso, secundarioUbicacion, rango],
    [curso, todos],
    [curso, rango],
    [cursoRango],
    [curso],
  ].map((composicion) => composicion.filter((campo) => campo.texto))
}

export function seleccionarLineasTarjeta(
  campos: CamposTarjeta,
  opciones: OpcionesSeleccionTarjeta,
): LineaTarjeta[] {
  const { ancho, alto, alturaLinea, separacionLineas = 0, medirLineas, truncarTexto } = opciones
  if (ancho <= 0 || alto <= 0) return []

  for (const composicion of composicionesTarjeta(campos)) {
    const totalLineas = composicion.reduce(
      (total, campo) => total + medirLineas(campo.texto, ancho, campo.peso).length,
      0,
    )
    const altura = totalLineas * alturaLinea + Math.max(0, totalLineas - 1) * separacionLineas
    if (altura > alto) continue

    return composicion.flatMap((campo) =>
      medirLineas(campo.texto, ancho, campo.peso).map((texto) => ({
        texto,
        peso: campo.peso,
        tipo: campo.tipo,
      })),
    )
  }

  const texto = campos.curso || campos.rango
  return [{
    texto: truncarTexto ? truncarTexto(texto, ancho, 700) : texto,
    peso: 700,
    tipo: "curso",
    elipsis: true,
  }]
}

export interface ColorCurso {
  fondo: string
  borde: string
  rgb: [number, number, number]
}

export const COLORES_CURSO: ColorCurso[] = [
  { fondo: "bg-blue-100/80 dark:bg-blue-400/10", borde: "border-l-blue-400 dark:border-l-blue-400/70", rgb: [219, 234, 254] },
  { fondo: "bg-emerald-100/80 dark:bg-emerald-400/10", borde: "border-l-emerald-400 dark:border-l-emerald-400/70", rgb: [209, 250, 229] },
  { fondo: "bg-amber-100/80 dark:bg-amber-400/10", borde: "border-l-amber-400 dark:border-l-amber-400/70", rgb: [254, 243, 199] },
  { fondo: "bg-rose-100/80 dark:bg-rose-400/10", borde: "border-l-rose-400 dark:border-l-rose-400/70", rgb: [254, 226, 226] },
  { fondo: "bg-violet-100/80 dark:bg-violet-400/10", borde: "border-l-violet-400 dark:border-l-violet-400/70", rgb: [237, 233, 254] },
  { fondo: "bg-cyan-100/80 dark:bg-cyan-400/10", borde: "border-l-cyan-400 dark:border-l-cyan-400/70", rgb: [207, 250, 254] },
  { fondo: "bg-orange-100/80 dark:bg-orange-400/10", borde: "border-l-orange-400 dark:border-l-orange-400/70", rgb: [255, 237, 213] },
  { fondo: "bg-teal-100/80 dark:bg-teal-400/10", borde: "border-l-teal-400 dark:border-l-teal-400/70", rgb: [204, 251, 241] },
]

export function colorCurso(nombre: string): ColorCurso {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = ((hash << 5) - hash + nombre.charCodeAt(i)) | 0
  }
  return COLORES_CURSO[Math.abs(hash) % COLORES_CURSO.length]
}
