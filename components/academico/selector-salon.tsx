"use client"

import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAulas, useGrados } from "@/hooks/use-academico"
import { ACCESO } from "@/lib/api/academico"

/**
 * Salón de una sección: solo salones activos que ninguna otra sección tiene en
 * ese año y turno (el mismo salón sí puede ser de otra sección en otro turno).
 * Los ambientes especiales y los espacios compartidos no se ofrecen: esos los
 * elige cada horario al asignar.
 */
export function SelectorSalon({
  value,
  onChange,
  idAnio,
  idTurno,
  idGradoSeccionActual,
  reservados = [],
  invalido,
}: {
  value: number | null | undefined
  onChange: (idAula: number) => void
  idAnio: number | null | undefined
  idTurno: number | null | undefined
  /** Al editar, la sección no se compite a sí misma su salón. */
  idGradoSeccionActual?: number | null
  /** Salones ya elegidos para otras secciones del mismo formulario. */
  reservados?: number[]
  invalido?: boolean
}) {
  const { data: aulas = [] } = useAulas()
  const { data: grados = [] } = useGrados()

  const ocupados = useMemo(() => {
    const ids = new Set<number>()
    for (const grado of grados) {
      for (const s of grado.secciones) {
        if (s.idAula && s.idAnio === idAnio && s.idTurno === idTurno && s.idGradoSeccion !== idGradoSeccionActual) {
          ids.add(s.idAula)
        }
      }
    }
    return ids
  }, [grados, idAnio, idTurno, idGradoSeccionActual])

  const libres = aulas.filter(
    (a) =>
      a.tipo === "SALON" &&
      (a.accesoId ?? ACCESO.ACTIVO) === ACCESO.ACTIVO &&
      (a.idAula === value || (!ocupados.has(a.idAula) && !reservados.includes(a.idAula)))
  )
  const elegido = aulas.find((a) => a.idAula === value)
  const sinTurno = !idAnio || !idTurno

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={value ? String(value) : null}
        onValueChange={(v) => v && onChange(Number(v))}
        disabled={sinTurno || !libres.length}
      >
        <SelectTrigger className="w-full" aria-label="Salón" aria-invalid={invalido || undefined}>
          <SelectValue>
            {elegido?.nombre ?? (sinTurno ? "Elige el turno" : libres.length ? "Elige el salón" : "Sin salones libres")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {libres.map((a) => (
              <SelectItem key={a.idAula} value={String(a.idAula)}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {!sinTurno && !libres.length && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          No quedan salones libres en este año y turno. Registra primero un salón en Aulas.
        </p>
      )}
    </div>
  )
}
