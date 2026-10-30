"use client"
import { Lock } from "lucide-react"
import { FilterSelect } from "@/components/shared/filter-select"
import { ESTADO_ANIO, type AnioEscolarResponse, type NivelResponse } from "@/lib/api/academico"
export const TEXTO_ESTADO_ANIO: Record<number, string> = {
  [ESTADO_ANIO.VIGENTE]: "vigente",
  [ESTADO_ANIO.CERRADO]: "cerrado",
  [ESTADO_ANIO.POR_COMENZAR]: "por comenzar",
}

export function FiltrosMalla({
  anios,
  niveles,
  idAnio,
  idNivel,
  onAnio,
  onNivel,
}: {
  anios: AnioEscolarResponse[]
  niveles: NivelResponse[]
  idAnio: number | null
  idNivel: number | null
  onAnio: (id: number) => void
  onNivel: (id: number) => void
}) {
  const opcionesAnio = [...anios]
    .sort((a, b) => b.anio.localeCompare(a.anio))
    .map((a) => ({ value: String(a.idAnio), label: `${a.anio} (${TEXTO_ESTADO_ANIO[a.estado] ?? ""})` }))
  return (
    <>
      <FilterSelect
        label="Año"
        value={idAnio ? String(idAnio) : ""}
        onValueChange={(v) => v && onAnio(Number(v))}
        options={opcionesAnio}
        includeAll={false}
        allLabel="Selecciona"
        className="w-[240px]"
      />
      <FilterSelect
        label="Nivel"
        value={idNivel ? String(idNivel) : ""}
        onValueChange={(v) => v && onNivel(Number(v))}
        options={niveles.map((n) => ({ value: String(n.idNivel), label: n.nombre }))}
        includeAll={false}
        allLabel="Selecciona"
        className="w-[180px]"
      />
    </>
  )
}

/** Aviso de solo lectura cuando el año no está por comenzar. */
export function AvisoMallaBloqueada({ anio, extra }: { anio: AnioEscolarResponse; extra?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
      <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold leading-tight">
          Año escolar {anio.anio} {TEXTO_ESTADO_ANIO[anio.estado]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Su malla curricular es de solo lectura. Solo se configura la de un año por comenzar.
          {extra ? ` ${extra}` : ""}
        </p>
      </div>
    </div>
  )
}

// ── Pestaña ──────────────────────────────────────────────────────────────

