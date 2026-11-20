"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { BookOpen } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { type HorarioListItem, type RecreoHorario } from "@/lib/api/horario"
import {
  NOMBRES_DIAS,
  aMinutos,
  agruparRecreos,
  camposTarjeta,
  colorCurso,
  diasHorarioVisibles,
  esDiaVisible,
  limitesHorario,
  minutosAHora,
  seleccionarLineasTarjeta,
  ticksHorario,
  type CampoMedible,
  type CamposTarjeta,
  type LineaTarjeta,
  type PesoTexto,
} from "@/lib/horario"
import { cn } from "@/lib/utils"

const PX_POR_MINUTO = 1.8
const ANCHO_HORA = "4.5rem"
const ANCHO_HORA_PX = 72
const ANCHO_MINIMO_DIA_PX = 94
const MIN_ANCHO_CONTENIDO = 24
const RESERVA_ANCHO_TARJETA = 22
const ALTURA_LINEA_PX = 11
const SEPARACION_LINEAS_PX = 0

let contextoMedicion: CanvasRenderingContext2D | null = null
let fuenteMedicion = "11px sans-serif"
const cacheLineas = new Map<string, string[]>()

function obtenerContexto(): CanvasRenderingContext2D | null {
  if (contextoMedicion) return contextoMedicion
  if (typeof document === "undefined" || !document.body) return null

  const referencia = document.createElement("span")
  referencia.className = "text-micro leading-none"
  referencia.style.position = "absolute"
  referencia.style.visibility = "hidden"
  document.body.appendChild(referencia)
  const estilo = getComputedStyle(referencia)
  fuenteMedicion = `${estilo.fontSize} ${estilo.fontFamily}`
  referencia.remove()

  contextoMedicion = document.createElement("canvas").getContext("2d")
  return contextoMedicion
}

function medirLineas(texto: string, ancho: number, peso: PesoTexto): string[] {
  if (!texto) return []
  const anchoUtil = Math.max(1, ancho - 1)
  const clave = `${anchoUtil.toFixed(1)}|${peso}|${texto}`
  const cached = cacheLineas.get(clave)
  if (cached) return cached

  const contexto = obtenerContexto()
  if (!contexto) return [texto]

  contexto.font = `${peso} ${fuenteMedicion}`
  const cabe = (valor: string) => contexto.measureText(valor).width <= anchoUtil
  const lineas: string[] = []
  let actual = ""

  for (const palabra of texto.trim().split(/\s+/)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra
    if (cabe(candidata)) {
      actual = candidata
      continue
    }
    if (actual) {
      lineas.push(actual)
      actual = ""
    }
    if (cabe(palabra)) {
      actual = palabra
      continue
    }

    let parte = ""
    for (const caracter of Array.from(palabra)) {
      if (cabe(parte + caracter)) {
        parte += caracter
        continue
      }
      if (parte) lineas.push(parte)
      parte = caracter
    }
    actual = parte
  }

  if (actual) lineas.push(actual)
  cacheLineas.set(clave, lineas)
  return lineas
}

function truncarTexto(texto: string, ancho: number, peso: PesoTexto): string {
  const contexto = obtenerContexto()
  if (!contexto || !texto) return texto
  contexto.font = `${peso} ${fuenteMedicion}`
  const anchoUtil = Math.max(1, ancho - 1)
  if (contexto.measureText(texto).width <= anchoUtil) return texto

  const elipsis = "…"
  let resultado = ""
  for (const caracter of Array.from(texto)) {
    if (contexto.measureText(resultado + caracter + elipsis).width > anchoUtil) break
    resultado += caracter
  }
  return `${resultado}${elipsis}`
}

function lineasSeguras(campos: CamposTarjeta, alto: number): LineaTarjeta[] {
  const maxLineas = Math.max(1, Math.floor((alto + SEPARACION_LINEAS_PX) / (ALTURA_LINEA_PX + SEPARACION_LINEAS_PX)))
  const camposPorLinea: CampoMedible[] = maxLineas >= 4
    ? [
        { texto: campos.curso, peso: 700, tipo: "curso" },
        { texto: campos.secundario, peso: 400, tipo: "detalle" },
        { texto: campos.ubicacion, peso: 400, tipo: "detalle" },
        { texto: campos.rango, peso: 500, tipo: "rango" },
      ]
    : maxLineas >= 3
      ? [
          { texto: campos.curso, peso: 700, tipo: "curso" },
          { texto: campos.secundario, peso: 400, tipo: "detalle" },
          { texto: campos.rango, peso: 500, tipo: "rango" },
        ]
      : maxLineas >= 2
        ? [
            { texto: campos.curso, peso: 700, tipo: "curso" },
            { texto: campos.rango, peso: 500, tipo: "rango" },
          ]
        : [{ texto: campos.curso, peso: 700, tipo: "curso" }]

  return camposPorLinea
    .filter((campo) => campo.texto)
    .map((campo) => ({ ...campo, elipsis: true }))
}

function seleccionarLineas(campos: CamposTarjeta, ancho: number, alto: number): LineaTarjeta[] {
  if (ancho <= 0) return lineasSeguras(campos, alto)

  return seleccionarLineasTarjeta(campos, {
    ancho,
    alto,
    alturaLinea: ALTURA_LINEA_PX,
    separacionLineas: SEPARACION_LINEAS_PX,
    medirLineas,
    truncarTexto,
  })
}

interface ClasePosicionada {
  key: string
  inicio: number
  fin: number
  horario: HorarioListItem
}

interface CalendarioSemanalProps {
  horarios: HorarioListItem[]
  titulo?: string
  horaEntrada?: string
  horaSalida?: string
  vista?: "seccion" | "docente"
  recreos?: RecreoHorario[]
}

function ColumnaHoras({
  ticks,
  alturaTotal,
  porcentaje,
}: {
  ticks: number[]
  alturaTotal: number
  porcentaje: (min: number) => number
}) {
  return (
    <div className="relative border-r border-border/50 bg-muted/20" style={{ height: alturaTotal }}>
      {ticks.map((min, idx) => {
        const primera = idx === 0
        const ultima = idx === ticks.length - 1
        return (
          <div
            key={min}
            className={cn(
              "absolute right-2 z-10 text-micro font-medium tabular-nums text-muted-foreground",
              primera ? "translate-y-0" : ultima ? "-translate-y-full" : "-translate-y-1/2",
            )}
            style={{ top: `calc(${porcentaje(min)}% + ${primera ? 2 : ultima ? -2 : 0}px)` }}
          >
            {minutosAHora(min)}
          </div>
        )
      })}
    </div>
  )
}

function TarjetaCurso({
  clase,
  vista,
  inicio,
  fin,
  top,
  height,
  anchoContenido,
}: {
  clase: HorarioListItem
  vista: "seccion" | "docente"
  inicio: number
  fin: number
  top: string
  height: string
  anchoContenido: number
}) {
  const color = colorCurso(clase.curso)
  const campos = useMemo(() => camposTarjeta(clase, vista), [clase, vista])
  const duracion = fin - inicio
  const altoContenido = Math.max(ALTURA_LINEA_PX, duracion * PX_POR_MINUTO - 2)
  const lineas = useMemo(
    () => seleccionarLineas(campos, anchoContenido, altoContenido),
    [campos, anchoContenido, altoContenido],
  )

  const detalles: [string, string][] = [
    ["Día", campos.dia],
    ["Hora", campos.rango],
    ["Docente", campos.docente],
    ["Sección", campos.seccion],
    ["Aula", campos.aula],
    ["Turno", campos.turno || "—"],
  ]

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "absolute inset-x-1 z-10 flex overflow-hidden rounded-md border border-border/60 border-l-4 px-1 py-0 text-left shadow-sm text-card-foreground transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              color.fondo,
              color.borde,
            )}
            style={{ top, height }}
            aria-label={`${campos.curso}, ${campos.dia} ${campos.rango}. ${campos.secundario}, ${campos.ubicacion}. Ver detalle`}
          />
        }
      >
        <span className="flex h-full w-full min-w-0 flex-col justify-center gap-0 overflow-hidden text-micro leading-none">
          {lineas.map((linea, idx) => (
            <span
              key={idx}
              className={cn(
                "block w-full whitespace-nowrap",
                linea.tipo === "curso" && "font-bold text-card-foreground",
                linea.tipo === "rango" && "font-medium tabular-nums text-muted-foreground",
                linea.tipo === "detalle" && "text-muted-foreground",
                linea.elipsis && "truncate",
              )}
            >
              {linea.texto}
            </span>
          ))}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={6}
        className="w-64 p-3 text-mini"
      >
        <p className="break-words text-sm font-semibold leading-tight">{campos.curso}</p>
        <dl className="mt-2 space-y-1">
          {detalles.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
              <dt className="text-muted-foreground">{etiqueta}</dt>
              <dd className="break-words font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}

export function CalendarioSemanal({ horarios, titulo, horaEntrada, horaSalida, vista = "seccion", recreos = [] }: CalendarioSemanalProps) {
  const rejillaRef = useRef<HTMLDivElement>(null)
  const [anchoRejilla, setAnchoRejilla] = useState(0)

  useLayoutEffect(() => {
    const nodo = rejillaRef.current
    if (!nodo) return

    const actualizar = () => setAnchoRejilla(nodo.clientWidth)
    actualizar()
    if (typeof ResizeObserver === "undefined") return

    const observador = new ResizeObserver(actualizar)
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  const limites = useMemo(
    () => limitesHorario(horarios, recreos, horaEntrada, horaSalida),
    [horarios, recreos, horaEntrada, horaSalida],
  )
  const diasVisibles = useMemo(() => diasHorarioVisibles(horarios, recreos), [horarios, recreos])

  const clasesPorDia = useMemo(() => {
    const mapa = new Map<number, ClasePosicionada[]>()
    for (const dia of diasVisibles) mapa.set(dia, [])

    for (const horario of horarios) {
      if (!esDiaVisible(horario.diaSemana)) continue
      mapa.get(horario.diaSemana)?.push({
        key: `clase-${horario.idHorario}`,
        inicio: aMinutos(horario.horaInicio),
        fin: aMinutos(horario.horaFin),
        horario,
      })
    }

    return mapa
  }, [horarios, diasVisibles])

  const franjasRecreo = useMemo(() => agruparRecreos(recreos), [recreos])
  const ticks = useMemo(() => (limites ? ticksHorario(limites) : []), [limites])

  const hayDatos = horarios.some((h) => esDiaVisible(h.diaSemana)) || recreos.some((r) => esDiaVisible(r.diaSemana))

  if (!hayDatos) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">No hay horarios registrados para esta selección.</p>
      </div>
    )
  }

  if (!limites) return null

  const total = limites.max - limites.min
  const alturaTotal = total * PX_POR_MINUTO
  const porcentaje = (min: number) => ((min - limites.min) / total) * 100
  const estiloGeneral = { gridTemplateColumns: `${ANCHO_HORA} minmax(0, 1fr)` }
  const estiloDias = { gridTemplateColumns: `repeat(${diasVisibles.length}, minmax(0, 1fr))` }
  const anchoMinimoRejilla = ANCHO_HORA_PX + diasVisibles.length * ANCHO_MINIMO_DIA_PX + (diasVisibles.length - 1)
  const anchoReferencia = anchoRejilla || anchoMinimoRejilla
  const anchoDia = (anchoReferencia - ANCHO_HORA_PX - (diasVisibles.length - 1)) / diasVisibles.length
  const anchoContenidoTarjeta = Math.max(MIN_ANCHO_CONTENIDO, anchoDia - 8 - RESERVA_ANCHO_TARJETA)

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      {titulo && (
        <div className="border-b border-border/60 bg-brand px-3 py-3 text-center text-descripcion font-semibold text-primary-foreground">
          {titulo}
        </div>
      )}

      <div ref={rejillaRef} style={{ minWidth: anchoMinimoRejilla }}>
        <div className="grid border-b border-border bg-brand-subtle/70 dark:bg-brand-subtle/20" style={estiloGeneral}>
          <div className="sticky left-0 z-30 border-r border-border/60 bg-brand-subtle/70 px-2 py-2.5 text-center text-mini font-semibold uppercase tracking-wide text-brand-info dark:bg-brand-subtle/20 dark:text-foreground">
            Hora
          </div>
          <div className="grid" style={estiloDias}>
            {diasVisibles.map((dia) => (
              <div
                key={dia}
                className="border-l border-border/60 px-2 py-2.5 text-center text-mini font-semibold uppercase tracking-wide text-brand-info dark:text-foreground"
              >
                {NOMBRES_DIAS[dia - 1]}
              </div>
            ))}
          </div>
        </div>

        <div className="grid" style={estiloGeneral}>
          <ColumnaHoras ticks={ticks} alturaTotal={alturaTotal} porcentaje={porcentaje} />

          <div className="relative" style={{ height: alturaTotal }}>
            <div className="grid h-full" style={estiloDias}>
              {diasVisibles.map((dia) => (
                <div key={dia} className="relative border-l border-border/50 first:border-l-0">
                  {ticks.map((min) => (
                    <div
                      key={min}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: `${porcentaje(min)}%` }}
                    />
                  ))}

                  {(clasesPorDia.get(dia) ?? []).map((clase) => (
                    <TarjetaCurso
                      key={clase.key}
                      clase={clase.horario}
                      vista={vista}
                      inicio={clase.inicio}
                      fin={clase.fin}
                      top={`${porcentaje(clase.inicio)}%`}
                      height={`${((clase.fin - clase.inicio) / total) * 100}%`}
                      anchoContenido={anchoContenidoTarjeta}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0 z-20">
              {franjasRecreo.map((franja) => {
                const desdeIndice = diasVisibles.indexOf(franja.desdeDia)
                const hastaIndice = diasVisibles.indexOf(franja.hastaDia)
                if (desdeIndice < 0 || hastaIndice < desdeIndice) return null

                return (
                  <div
                    key={franja.key}
                    className="pointer-events-auto absolute flex flex-col items-center justify-center overflow-hidden rounded-sm bg-muted/90 text-muted-foreground ring-1 ring-border/60 dark:bg-muted/70"
                    style={{
                      top: `${porcentaje(franja.inicio)}%`,
                      height: `${((franja.fin - franja.inicio) / total) * 100}%`,
                      left: `${(desdeIndice / diasVisibles.length) * 100}%`,
                      width: `${((hastaIndice - desdeIndice + 1) / diasVisibles.length) * 100}%`,
                    }}
                    title={`Recreo ${franja.rango}`}
                  >
                    <span className="truncate text-mini font-semibold uppercase tracking-wide">Recreo</span>
                    <span className="truncate text-mini font-medium tabular-nums">{franja.rango}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
