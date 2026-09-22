"use client"

import { useMemo } from "react"
import { BookOpen } from "lucide-react"

import type { HorarioListItem } from "@/lib/api/horario"

// ── Constantes ──────────────────────────────────────────────────────────

const DIAS = [1, 2, 3, 4, 5] as const
const NOMBRES_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
const MINUTOS_POR_SLOT = 30

const COLORES = [
  { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-900", darkBg: "dark:bg-blue-950", darkBorder: "dark:border-blue-700", darkText: "dark:text-blue-200" },
  { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-900", darkBg: "dark:bg-emerald-950", darkBorder: "dark:border-emerald-700", darkText: "dark:text-emerald-200" },
  { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-900", darkBg: "dark:bg-amber-950", darkBorder: "dark:border-amber-700", darkText: "dark:text-amber-200" },
  { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-900", darkBg: "dark:bg-rose-950", darkBorder: "dark:border-rose-700", darkText: "dark:text-rose-200" },
  { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-900", darkBg: "dark:bg-violet-950", darkBorder: "dark:border-violet-700", darkText: "dark:text-violet-200" },
  { bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-900", darkBg: "dark:bg-cyan-950", darkBorder: "dark:border-cyan-700", darkText: "dark:text-cyan-200" },
  { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-900", darkBg: "dark:bg-orange-950", darkBorder: "dark:border-orange-700", darkText: "dark:text-orange-200" },
  { bg: "bg-teal-100", border: "border-teal-400", text: "text-teal-900", darkBg: "dark:bg-teal-950", darkBorder: "dark:border-teal-700", darkText: "dark:text-teal-200" },
] as const

function hashCurso(nombre: string): number {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = ((hash << 5) - hash + nombre.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % COLORES.length
}

// ── Helpers de tiempo ───────────────────────────────────────────────────

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function minutosAHora(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function generarSlots(
  horarios: HorarioListItem[],
  horaEntrada?: string,
  horaSalida?: string
): string[] {
  // Rango del turno: si se provee, usar como base
  let minMinutos = Infinity
  let maxMinutos = 0

  if (horaEntrada && horaSalida) {
    minMinutos = aMinutos(horaEntrada)
    maxMinutos = aMinutos(horaSalida)
  }

  // Ampliar si algún horario se sale del rango del turno
  for (const h of horarios) {
    const ini = aMinutos(h.horaInicio)
    const fin = aMinutos(h.horaFin)
    if (ini < minMinutos) minMinutos = ini
    if (fin > maxMinutos) maxMinutos = fin
  }

  if (minMinutos === Infinity) return []

  minMinutos = Math.floor(minMinutos / MINUTOS_POR_SLOT) * MINUTOS_POR_SLOT

  const slots: string[] = []
  for (let m = minMinutos; m < maxMinutos; m += MINUTOS_POR_SLOT) {
    slots.push(minutosAHora(m))
  }
  return slots
}

// ── Bloque posicionado ──────────────────────────────────────────────────

interface BloqueHorario {
  horario: HorarioListItem
  rowStart: number
  rowSpan: number
  color: (typeof COLORES)[number]
}

// ── Componente ──────────────────────────────────────────────────────────

interface CalendarioSemanalProps {
  horarios: HorarioListItem[]
  titulo?: string
  /** Hora de entrada del turno (ej: "07:00:00"). Define el inicio de la grilla. */
  horaEntrada?: string
  /** Hora de salida del turno (ej: "12:30:00"). Define el fin de la grilla. */
  horaSalida?: string
}

export function CalendarioSemanal({ horarios, titulo, horaEntrada, horaSalida }: CalendarioSemanalProps) {
  const slots = useMemo(() => generarSlots(horarios, horaEntrada, horaSalida), [horarios, horaEntrada, horaSalida])

  const slotIndex = useMemo(() => {
    const map = new Map<string, number>()
    slots.forEach((s, i) => map.set(s, i))
    return map
  }, [slots])

  const bloquesPorDia = useMemo(() => {
    const mapa = new Map<number, BloqueHorario[]>()
    for (const dia of DIAS) mapa.set(dia, [])

    for (const h of horarios) {
      if (h.diaSemana > 5) continue

      const iniMin = aMinutos(h.horaInicio)
      const finMin = aMinutos(h.horaFin)
      const slotInicio = minutosAHora(Math.floor(iniMin / MINUTOS_POR_SLOT) * MINUTOS_POR_SLOT)

      const rowStart = slotIndex.get(slotInicio)
      if (rowStart == null) continue

      const rowSpan = Math.max(1, Math.round((finMin - iniMin) / MINUTOS_POR_SLOT))
      const color = COLORES[hashCurso(h.curso)]

      mapa.get(h.diaSemana)?.push({ horario: h, rowStart, rowSpan, color })
    }

    return mapa
  }, [horarios, slotIndex])

  if (horarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">No hay horarios registrados para esta selección.</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-border">
      {titulo && (
        <div className="border-b bg-muted/50 px-3 py-2 text-center text-sm font-medium text-muted-foreground">
          {titulo}
        </div>
      )}

      <table className="w-full min-w-[600px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-16 border-b border-r bg-muted px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hora
            </th>
            {NOMBRES_DIAS.map((dia) => (
              <th
                key={dia}
                className="border-b bg-muted px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {dia}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, slotIdx) => {
            // Qué celdas ocupan un rowSpan activo (ya empezó arriba)
            // Se resuelve con el Set de celdas consumidas
            return (
              <FilaHorario
                key={slot}
                slot={slot}
                slotIdx={slotIdx}
                bloquesPorDia={bloquesPorDia}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Fila individual ─────────────────────────────────────────────────────

interface FilaHorarioProps {
  slot: string
  slotIdx: number
  bloquesPorDia: Map<number, BloqueHorario[]>
}

function FilaHorario({ slot, slotIdx, bloquesPorDia }: FilaHorarioProps) {
  // Rastrear qué columnas ya están cubiertas por un rowSpan activo
  const columnasCubiertas = useMemo(() => {
    const cubiertas = new Set<number>()
    for (const dia of DIAS) {
      const bloques = bloquesPorDia.get(dia) ?? []
      for (const b of bloques) {
        if (slotIdx > b.rowStart && slotIdx < b.rowStart + b.rowSpan) {
          cubiertas.add(dia)
        }
      }
    }
    return cubiertas
  }, [bloquesPorDia, slotIdx])

  return (
    <tr className="h-14">
      {/* Columna hora */}
      <td className="sticky left-0 z-10 w-16 border-b border-r bg-background px-2 pt-1 text-center text-[11px] font-medium text-muted-foreground">
        {slot}
      </td>

      {/* Celdas de los 5 días */}
      {DIAS.map((dia) => {
        // Está cubierta por un rowSpan de arriba → no renderizar esta celda
        if (columnasCubiertas.has(dia)) {
          return null
        }

        // ¿Hay un bloque que EMPIECE en esta fila?
        const bloque = bloquesPorDia.get(dia)?.find((b) => b.rowStart === slotIdx)

        if (bloque) {
          return (
            <td
              key={dia}
              rowSpan={bloque.rowSpan}
              className={`border border-b-2 ${bloque.color.border} ${bloque.color.bg} ${bloque.color.text} ${bloque.color.darkBg} ${bloque.color.darkBorder} ${bloque.color.darkText} rounded-lg px-1.5 py-1 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex flex-col justify-center gap-0.5 overflow-hidden">
                <span className="truncate text-[11px] font-bold leading-tight">
                  {bloque.horario.curso}
                </span>
                <span className="truncate text-[10px] leading-tight opacity-80">
                  {bloque.horario.docente}
                </span>
                <span className="truncate text-[9px] leading-tight opacity-60">
                  {bloque.horario.aula}
                </span>
              </div>
            </td>
          )
        }

        // Celda vacía
        return (
          <td
            key={dia}
            className="border-b border-r bg-background/50"
          />
        )
      })}
    </tr>
  )
}
