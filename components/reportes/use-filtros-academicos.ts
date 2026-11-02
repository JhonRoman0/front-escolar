"use client"

import { useMemo, useState } from "react"

import type { FiltroDef } from "@/components/reportes/reporte-modal"
import { useAniosEscolares, useGradosPorNivel, useNiveles, useSeccionesPorGrado } from "@/hooks/use-academico"
import { anioParaFiltro } from "@/lib/api/academico"

export interface SeleccionAcademica {
  idAnio: number | null
  idNivel: number | null
  idGrado: number | null
  idGradoSeccion: number | null
}

const VACIO: SeleccionAcademica = { idAnio: null, idNivel: null, idGrado: null, idGradoSeccion: null }

function texto(id: number | null): string {
  return id ? String(id) : ""
}

function numero(valor: string): number | null {
  return valor ? Number(valor) : null
}

/**
 * Año, nivel, grado y sección de un reporte. Grados y secciones se limitan al año
 * elegido: una misma "A" existe en varios años. Cada apertura del modal llama a
 * iniciar(), así que nunca queda un filtro anterior sin que se vea.
 */
export function useFiltrosAcademicos() {
  const [seleccion, setSeleccion] = useState<SeleccionAcademica>(VACIO)
  const { data: anios = [] } = useAniosEscolares()
  const { data: niveles = [] } = useNiveles()
  const { data: grados = [] } = useGradosPorNivel(seleccion.idNivel)
  const { data: secciones = [] } = useSeccionesPorGrado(seleccion.idGrado)
  const idAnio = seleccion.idAnio ?? anioParaFiltro(anios)?.idAnio ?? null

  const filtros = useMemo<FiltroDef[]>(() => {
    const seccionesDelAnio = secciones.filter((s) => s.idAnio === idAnio)
    return [
      {
        id: "idAnio",
        label: "Año escolar",
        sinTodos: true,
        valor: texto(idAnio),
        opciones: [...anios]
          .sort((a, b) => b.anio.localeCompare(a.anio))
          .map((a) => ({ value: String(a.idAnio), label: a.anio })),
        // Grado y sección dependen del año; el nivel sigue siendo válido.
        onChange: (v) => setSeleccion((s) => ({ ...s, idAnio: numero(v), idGrado: null, idGradoSeccion: null })),
      },
      {
        id: "idNivel",
        label: "Nivel",
        valor: texto(seleccion.idNivel),
        opciones: niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre })),
        onChange: (v) => setSeleccion((s) => ({ ...s, idNivel: numero(v), idGrado: null, idGradoSeccion: null })),
      },
      {
        id: "idGrado",
        label: "Grado",
        valor: texto(seleccion.idGrado),
        opciones: grados
          .filter((g) => g.secciones.some((s) => s.idAnio === idAnio) || g.idAnio === idAnio)
          .map((g) => ({ value: String(g.idGrado), label: g.nombre })),
        onChange: (v) => setSeleccion((s) => ({ ...s, idGrado: numero(v), idGradoSeccion: null })),
      },
      {
        id: "idGradoSeccion",
        label: "Sección",
        valor: texto(seleccion.idGradoSeccion),
        opciones: seccionesDelAnio.map((s) => ({
          value: String(s.idGradoSeccion),
          label: seccionesDelAnio.some((o) => o.idGradoSeccion !== s.idGradoSeccion && o.nombre === s.nombre)
            ? `${s.nombre} · ${s.turno}`
            : s.nombre,
        })),
        onChange: (v) => setSeleccion((s) => ({ ...s, idGradoSeccion: numero(v) })),
      },
    ]
  }, [anios, grados, idAnio, niveles, secciones, seleccion])

  return {
    filtros,
    iniciar: (inicial: Partial<SeleccionAcademica> = {}) => setSeleccion({ ...VACIO, ...inicial }),
  }
}
