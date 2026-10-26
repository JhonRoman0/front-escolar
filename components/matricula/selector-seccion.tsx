"use client"

import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { GradoOpcion } from "@/lib/api/matricula"

export interface SeleccionSeccion {
  idNivel: number
  idGrado: number
  idTurno: number
  idGradoSeccion: number
}

export const SELECCION_VACIA: SeleccionSeccion = { idNivel: 0, idGrado: 0, idTurno: 0, idGradoSeccion: 0 }

// Un grado puede tener una fila por turno: se muestran juntas como un solo grado.
export interface GradoAgrupado extends GradoOpcion {
  ids: number[]
}

export function agruparGrados(grados: GradoOpcion[]): GradoAgrupado[] {
  const grupos = new Map<string, GradoAgrupado>()
  for (const g of grados) {
    const clave = `${g.idNivel}|${g.grado}`
    const grupo = grupos.get(clave)
    if (grupo) {
      grupo.ids.push(g.idGrado)
      grupo.secciones = [...grupo.secciones, ...g.secciones]
      grupo.sugerido ||= g.sugerido
    } else {
      grupos.set(clave, { ...g, ids: [g.idGrado], secciones: [...g.secciones] })
    }
  }
  return [...grupos.values()]
}

export function grupoDe(grados: GradoAgrupado[], idGrado: number): GradoAgrupado | undefined {
  return grados.find((g) => g.ids.includes(idGrado))
}

/** Preselecciona el grado sugerido (el siguiente) o, si solo hay uno, ese. */
export function seleccionInicial(grados: GradoAgrupado[]): SeleccionSeccion {
  const grado = grados.find((g) => g.sugerido) ?? (grados.length === 1 ? grados[0] : undefined)
  if (!grado) return SELECCION_VACIA
  const turnos = [...new Set(grado.secciones.map((s) => s.idTurno))]
  const idTurno = turnos.length === 1 ? turnos[0] : 0
  const secciones = grado.secciones.filter((s) => s.idTurno === idTurno)
  return {
    idNivel: grado.idNivel,
    idGrado: grado.idGrado,
    idTurno,
    idGradoSeccion: secciones.length === 1 ? secciones[0].idGradoSeccion : 0,
  }
}

/**
 * Nivel → grado → turno → sección a partir de las opciones del back, que ya
 * vienen filtradas: solo grados permitidos y secciones con aula y cupo.
 */
export function SelectorSeccion({
  grados,
  value,
  onChange,
  errores,
}: {
  grados: GradoAgrupado[]
  value: SeleccionSeccion
  onChange: (value: SeleccionSeccion) => void
  errores?: Partial<Record<keyof SeleccionSeccion, string>>
}) {
  const niveles = [...new Map(grados.map((g) => [g.idNivel, g.nivel])).entries()]
  const gradosDelNivel = grados.filter((g) => g.idNivel === value.idNivel)
  const grado = grupoDe(grados, value.idGrado)
  const turnos = [...new Map((grado?.secciones ?? []).map((s) => [s.idTurno, s.turno])).entries()]
  const secciones = (grado?.secciones ?? []).filter((s) => s.idTurno === value.idTurno)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Selector
        label="Nivel *"
        valor={value.idNivel}
        opciones={niveles.map(([id, nombre]) => ({ id, nombre }))}
        error={errores?.idNivel}
        onChange={(idNivel) => onChange({ ...SELECCION_VACIA, idNivel })}
      />
      <Selector
        label="Grado *"
        valor={grado?.idGrado ?? 0}
        opciones={gradosDelNivel.map((g) => ({ id: g.idGrado, nombre: g.sugerido ? `${g.grado} (siguiente)` : g.grado }))}
        error={errores?.idGrado}
        disabled={!value.idNivel}
        onChange={(idGrado) => {
          const elegido = grupoDe(grados, idGrado)
          const turnosGrado = [...new Set(elegido?.secciones.map((s) => s.idTurno) ?? [])]
          onChange({ idNivel: value.idNivel, idGrado, idTurno: turnosGrado.length === 1 ? turnosGrado[0] : 0, idGradoSeccion: 0 })
        }}
      />
      <Selector
        label="Turno *"
        valor={value.idTurno}
        opciones={turnos.map(([id, nombre]) => ({ id, nombre }))}
        error={errores?.idTurno}
        disabled={!value.idGrado}
        onChange={(idTurno) => onChange({ ...value, idTurno, idGradoSeccion: 0 })}
      />
      <Selector
        label="Sección *"
        valor={value.idGradoSeccion}
        opciones={secciones.map((s) => ({
          id: s.idGradoSeccion,
          nombre: `${s.seccion} · ${s.ocupados}/${s.capacidad} matriculados`,
        }))}
        error={errores?.idGradoSeccion}
        disabled={!value.idTurno}
        onChange={(idGradoSeccion) => onChange({ ...value, idGradoSeccion })}
      />
    </div>
  )
}

function Selector({
  label,
  valor,
  opciones,
  onChange,
  error,
  disabled,
}: {
  label: string
  valor: number
  opciones: { id: number; nombre: string }[]
  onChange: (id: number) => void
  error?: string
  disabled?: boolean
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Select value={valor ? String(valor) : ""} onValueChange={(v) => onChange(Number(v))} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona">{opciones.find((o) => o.id === valor)?.nombre}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {opciones.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError errors={error ? [{ message: error }] : []} />
      </FieldContent>
    </Field>
  )
}
