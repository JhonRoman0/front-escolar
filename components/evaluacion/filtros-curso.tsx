"use client"

import { useState } from "react"

import { FilterSelect, type FilterOption } from "@/components/shared/filter-select"

/** Lo que los filtros necesitan saber de cada curso de una sección. */
export interface CursoFiltrable {
  clave: string
  curso: string
  turno: string
  nivel: string
  grado: string
  seccion: string | null
}

const SIN_LETRA = "Única"

/** Valores únicos en el orden en que llegan (el backend ya los ordena por nivel y grado). */
function unicos(valores: string[]): FilterOption[] {
  return [...new Set(valores)].map((v) => ({ value: v, label: v }))
}

/** Lo elegido, o la única opción si no hay otra: un docente con un solo turno no tiene que elegirlo. */
function efectivo(elegido: string, opciones: FilterOption[]): string {
  if (elegido && opciones.some((o) => o.value === elegido)) return elegido
  return opciones.length === 1 ? opciones[0].value : ""
}

/**
 * Turno → nivel → grado → sección → curso, en ese orden y sin valor por defecto:
 * cada uno se habilita cuando el anterior tiene valor. Un filtro con una sola
 * opción se elige solo.
 */
export function useFiltrosCurso<T>(items: T[], aFiltrable: (item: T) => CursoFiltrable) {
  const [turno, setTurno] = useState("")
  const [nivel, setNivel] = useState("")
  const [grado, setGrado] = useState("")
  const [seccion, setSeccion] = useState("")
  const [clave, setClave] = useState("")

  const lista = items.map((item) => ({ item, f: aFiltrable(item) }))
  const turnos = unicos(lista.map(({ f }) => f.turno))
  const turnoEf = efectivo(turno, turnos)
  const porTurno = turnoEf ? lista.filter(({ f }) => f.turno === turnoEf) : []
  const niveles = unicos(porTurno.map(({ f }) => f.nivel))
  const nivelEf = efectivo(nivel, niveles)
  const porNivel = nivelEf ? porTurno.filter(({ f }) => f.nivel === nivelEf) : []
  const grados = unicos(porNivel.map(({ f }) => f.grado))
  const gradoEf = efectivo(grado, grados)
  const porGrado = gradoEf ? porNivel.filter(({ f }) => f.grado === gradoEf) : []
  const secciones = unicos(porGrado.map(({ f }) => f.seccion ?? SIN_LETRA))
  const seccionEf = efectivo(seccion, secciones)
  const porSeccion = seccionEf ? porGrado.filter(({ f }) => (f.seccion ?? SIN_LETRA) === seccionEf) : []
  const cursos = porSeccion.map(({ f }) => ({ value: f.clave, label: f.curso }))
  const claveEf = efectivo(clave, cursos)
  const elegido = porSeccion.find(({ f }) => f.clave === claveEf)

  function cambiar(set: (v: string) => void, ...hijos: ((v: string) => void)[]) {
    return (valor: string) => {
      set(valor)
      hijos.forEach((h) => h(""))
    }
  }

  const faltan = [!turnoEf && "turno", !nivelEf && "nivel", !gradoEf && "grado", !seccionEf && "sección", !elegido && "curso"]
    .filter(Boolean) as string[]

  return {
    seleccionado: elegido?.item,
    clave: elegido?.f.clave ?? null,
    /** Cualquier curso del nivel elegido: para sus periodos. */
    delNivel: porNivel[0]?.item,
    /** Cualquier curso de la sección elegida: para lo que es de toda la sección (boletas, SIAGIE). */
    deLaSeccion: porSeccion[0]?.item,
    /** "Elige turno, nivel, grado, sección y curso", o null si ya está todo. */
    faltaElegir: faltan.length
      ? `Elige ${faltan.length === 1 ? faltan[0] : `${faltan.slice(0, -1).join(", ")} y ${faltan.at(-1)}`}`
      : null,
    /** Vacía todo, por ejemplo al cambiar de año. */
    reiniciar: () => {
      setTurno("")
      setNivel("")
      setGrado("")
      setSeccion("")
      setClave("")
    },
    props: {
      turno: turnoEf,
      nivel: nivelEf,
      grado: gradoEf,
      seccion: seccionEf,
      clave: claveEf,
      turnos,
      niveles,
      grados,
      secciones,
      cursos,
      onTurno: cambiar(setTurno, setNivel, setGrado, setSeccion, setClave),
      onNivel: cambiar(setNivel, setGrado, setSeccion, setClave),
      onGrado: cambiar(setGrado, setSeccion, setClave),
      onSeccion: cambiar(setSeccion, setClave),
      onCurso: (v: string) => setClave(v),
    },
  }
}

export type FiltrosCursoProps = ReturnType<typeof useFiltrosCurso>["props"] & { cargando?: boolean }

export function FiltrosCurso(p: FiltrosCursoProps) {
  const vacio = p.cargando ? "Cargando…" : "Elige…"
  return (
    <>
      <FilterSelect label="Turno" value={p.turno} onValueChange={p.onTurno} options={p.turnos}
        includeAll={false} allLabel={p.turnos.length ? "Elige…" : vacio} disabled={!p.turnos.length} className="w-[150px]" />
      <FilterSelect label="Nivel" value={p.nivel} onValueChange={p.onNivel} options={p.niveles}
        includeAll={false} allLabel="Elige…" disabled={!p.turno} className="w-[170px]" />
      <FilterSelect label="Grado" value={p.grado} onValueChange={p.onGrado} options={p.grados}
        includeAll={false} allLabel="Elige…" disabled={!p.nivel} className="w-[140px]" />
      <FilterSelect label="Sección" value={p.seccion} onValueChange={p.onSeccion} options={p.secciones}
        includeAll={false} allLabel="Elige…" disabled={!p.grado} className="w-[140px]" />
      <FilterSelect
        label="Curso"
        value={p.clave}
        onValueChange={p.onCurso}
        options={p.cursos}
        includeAll={false}
        allLabel="Elige…"
        disabled={!p.seccion}
        opcionesLargas
        className="w-[240px] max-w-full"
      />
    </>
  )
}
