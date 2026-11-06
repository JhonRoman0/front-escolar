"use client"
import { useState } from "react"
import { useAniosEscolares, useNiveles } from "@/hooks/use-academico"
import { ESTADO_ANIO } from "@/lib/api/academico"
export function useFiltrosMalla() {
  const { data: anios = [] } = useAniosEscolares()
  const { data: niveles = [] } = useNiveles()
  const [idAnioElegido, setIdAnio] = useState<number | null>(null)
  const [idNivelElegido, setIdNivel] = useState<number | null>(null)

  const anioPorDefecto =
    anios.find((a) => a.estado === ESTADO_ANIO.POR_COMENZAR) ??
    anios.find((a) => a.estado === ESTADO_ANIO.VIGENTE) ??
    anios[0]
  const idAnio = idAnioElegido ?? anioPorDefecto?.idAnio ?? null
  const idNivel = idNivelElegido ?? niveles[0]?.idNivel ?? null
  const anio = anios.find((a) => a.idAnio === idAnio) ?? null
  const nivel = niveles.find((n) => n.idNivel === idNivel) ?? null

  return { anios, niveles, idAnio, setIdAnio, idNivel, setIdNivel, anio, nivel }
}

