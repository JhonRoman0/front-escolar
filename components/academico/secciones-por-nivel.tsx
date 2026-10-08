"use client"

import { useMemo, useState } from "react"
import {
  Baby,
  BookOpen,
  ChevronDown,
  GraduationCap,
  School,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { AccionesFila, FilasCargando, MensajeSinDatos } from "@/components/shared/table-helpers"
import { cn } from "@/lib/utils"
import type {
  GradoResponse,
  NivelResponse,
  SeccionResponse,
  TurnoResponse,
} from "@/lib/api/academico"

/** Grado > Turno. El nombre del grado vive en `grado`, no se duplica por fila. */
interface GrupoGrado {
  grado: GradoResponse
  turnos: FilaTurno[]
}

interface FilaTurno {
  idTurno: number
  turno: string
  /** id del año de ESTA fila: cada combinación turno|año es una fila distinta. */
  idAnio: number
  anio: string
  secciones: SeccionResponse[]
}

interface BloqueNivel {
  idNivel: number
  nombre: string
  grados: GrupoGrado[]
}

const COLUMNAS = 5

/**
 * Separación entre turnos del mismo grado. Sutil a propósito: son filas que se
 * leen como un bloque.
 */
const BORDE_TURNO = "border-b border-border/50"

/**
 * Cierre de grupo de grado. Mismo tono y mismo grosor que `BORDE_TURNO`, solo
 * que al 100% de opacidad: así se lee como claramente más importante sin
 * engrosar la línea ni competes con la tipografía.
 */
const BORDE_GRADO = "border-b border-border"

/**
 * Tinte y color de cada nivel. El tema no tiene tokens para estas familias, pero
 * `badge.tsx` ya usa hex y clases directas, así que se sigue esa vía. Los tres
 * niveles del seed tienen familia propia; si aparece uno nuevo cae al neutro.
 */
const TONO_NIVEL: Record<
  string,
  { bloque: string; tabla: string; badge: string; icono: LucideIcon }
> = {
  Inicial: {
    bloque: "bg-violet-50/70 dark:bg-violet-950/25",
    tabla: "bg-violet-100/50 dark:bg-violet-900/25",
    badge:
      "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30",
    icono: Baby,
  },
  Primaria: {
    bloque: "bg-blue-50/70 dark:bg-blue-950/25",
    tabla: "bg-blue-100/50 dark:bg-blue-900/25",
    badge:
      "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-400/30",
    icono: GraduationCap,
  },
  Secundaria: {
    bloque: "bg-emerald-50/70 dark:bg-emerald-950/25",
    tabla: "bg-emerald-100/50 dark:bg-emerald-900/25",
    badge:
      "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30",
    icono: BookOpen,
  },
}

const TONO_NEUTRAL = {
  bloque: "bg-muted/40 dark:bg-muted/20",
  tabla: "bg-muted/30 dark:bg-muted/15",
  badge: "bg-muted text-foreground ring-border",
  icono: School,
}

const tonoDe = (nivel: string) => TONO_NIVEL[nivel] ?? TONO_NEUTRAL

/**
 * Orden numérico de los nombres de grado: "1ro" y "3 años" arrancan con número,
 * así que 1ro va antes que 10to y 3 años antes que 4 años. Los que no tienen
 * ninguno van al final, y entre ellos por nombre.
 */
function ordenGrado(nombre: string): number {
  const n = nombre.match(/\d+/)?.[0]
  return n ? Number.parseInt(n, 10) : Number.POSITIVE_INFINITY
}

/**
 * Arma la estructura Nivel > Grado > Turno.
 *
 * Se descartan los grados sin secciones y los niveles que se quedan sin grados:
 * un bloque que se despliega y no tiene nada es solo ruido. También se descartan
 * las secciones sin letra, que son las que quedaron huérfanas de una migración.
 */
export function agruparPorNivel(
  grados: GradoResponse[],
  niveles: NivelResponse[],
  turnos: TurnoResponse[],
): BloqueNivel[] {
  const posNivel = new Map(niveles.map((n, i) => [n.idNivel, i]))
  const posTurno = new Map(turnos.map((t, i) => [t.idTurno, i]))
  // Infinity para lo que no está en el catálogo, así queda al final. Cuando los
  // dos lados dan Infinity la resta es NaN, y el NaN es falsy: el `||` de los
  // comparadores sigue al siguiente criterio sin romperse.
  const pos = (i: number | undefined) => (i == null ? Number.POSITIVE_INFINITY : i)

  const porNivel = new Map<number, BloqueNivel>()
  for (const grado of grados) {
    // Un grado sin secciones no se muestra. Sigue existiendo y se le puede crear
    // la primera desde "Nueva sección", porque el catálogo de ese formulario
    // consulta los grados sin filtrar.
    const conLetra = grado.secciones.filter((s) => s.nombre)
    if (conLetra.length === 0) continue

    const porTurnoAnio = new Map<string, SeccionResponse[]>()
    for (const s of conLetra) {
      const clave = `${s.idTurno}|${s.idAnio}`
      const lista = porTurnoAnio.get(clave)
      if (lista) lista.push(s)
      else porTurnoAnio.set(clave, [s])
    }

    const filasTurno = [...porTurnoAnio.values()]
      .map((lista) => ({
        secciones: [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        idTurno: lista[0].idTurno,
        turno: lista[0].turno,
        idAnio: lista[0].idAnio,
        anio: lista[0].anio,
      }))
      .sort(
        (a, b) =>
          pos(posTurno.get(a.idTurno)) - pos(posTurno.get(b.idTurno)) ||
          a.turno.localeCompare(b.turno, "es") ||
          b.anio.localeCompare(a.anio, "es"),
      )

    const grupo: GrupoGrado = { grado, turnos: filasTurno }
    const bloque = porNivel.get(grado.idNivel)
    if (bloque) bloque.grados.push(grupo)
    else porNivel.set(grado.idNivel, { idNivel: grado.idNivel, nombre: grado.nivel, grados: [grupo] })
  }

  return [...porNivel.values()]
    .sort(
      (a, b) =>
        pos(posNivel.get(a.idNivel)) - pos(posNivel.get(b.idNivel)) ||
        a.nombre.localeCompare(b.nombre, "es"),
    )
    .map((bloque) => ({
      ...bloque,
      grados: bloque.grados.sort(
        (a, b) =>
          ordenGrado(a.grado.nombre) - ordenGrado(b.grado.nombre) ||
          a.grado.nombre.localeCompare(b.grado.nombre, "es"),
      ),
    }))
}

interface SeccionesPorNivelProps {
  grados: GradoResponse[]
  niveles: NivelResponse[]
  turnos: TurnoResponse[]
  isLoading: boolean
  isError: boolean
  puedeActualizar: boolean
  /** La fila editada define grado + turno + año: los tres van juntos. */
  onEditar: (grado: GradoResponse, idTurno: number, idAnio: number) => void
}

export function SeccionesPorNivel({
  grados,
  niveles,
  turnos,
  isLoading,
  isError,
  puedeActualizar,
  onEditar,
}: SeccionesPorNivelProps) {
  const bloques = useMemo(
    () => agruparPorNivel(grados, niveles, turnos),
    [grados, niveles, turnos],
  )

  const ids = useMemo(() => bloques.map((b) => `nivel-${b.idNivel}`), [bloques])

  /*
   * El acordeón va controlado y el estado es SOLO qué niveles están cerrados.
   * Con `defaultValue` derivado de `bloques`, crear la primera sección de un
   * nivel lo hacía aparecer en la lista y cambiaba el default después de
   * montar, lo que Base UI rechaza (warning de useControlled) y, encima, el
   * nivel nuevo quedaba cerrado porque el estado interno guardaba la lista
   * vieja. Así los abiertos/cerrados del usuario solo cambian cuando él
   * alterna, un nivel que aparece después no está en `cerrados` y arranca
   * abierto (como todo al cargar), y los ids de niveles que ya no existen se
   * descartan al recalcular `cerrados` en cada toggle.
   */
  const [cerrados, setCerrados] = useState<ReadonlySet<string>>(() => new Set())

  return (
    <div className="flex flex-col gap-3">
      {isLoading || isError || !bloques.length ? (
        <EstadoTabla isLoading={isLoading} isError={isError} />
      ) : (
        <Accordion
          multiple
          value={ids.filter((id) => !cerrados.has(id))}
          onValueChange={(abiertos) =>
            setCerrados(new Set(ids.filter((id) => !abiertos.includes(id))))
          }
        >
          {bloques.map((bloque) => (
            <NivelTabla
              key={bloque.idNivel}
              bloque={bloque}
              puedeActualizar={puedeActualizar}
              onEditar={onEditar}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}

/**
 * Estados de carga, error y vacío.
*
 * Los helpers devuelven `<tr>`, así que tienen que vivir adentro de un `<tbody>`
 * real. Envolverlos en un `<div>` genera `<div><tr>`, que es HTML inválido y
 * hace fallar la hidratación. El div de afuera es válido: envuelve un `<table>`,
 * que es lo que renderiza `Table`.
  */
function EstadoTabla({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (!isLoading && !isError) {
    return (
      <div className="rounded-2xl border">
        <Table className="border-collapse">
          <TableBody>
            <MensajeSinDatos
              columnas={COLUMNAS}
              mensaje="Aún no hay secciones. Usá Nueva sección para empezar."
            />
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border">
      <Table className="border-collapse">
        <TableBody>
          {isLoading ? (
            <FilasCargando columnas={COLUMNAS} />
          ) : (
            <MensajeSinDatos
              columnas={COLUMNAS}
              mensaje="No se pudo cargar. Recarga la pantalla."
            />
          )}
        </TableBody>
      </Table>
    </div>
  )
}

interface NivelTablaProps {
  bloque: BloqueNivel
  puedeActualizar: boolean
  onEditar: (grado: GradoResponse, idTurno: number, idAnio: number) => void
}

function NivelTabla({ bloque, puedeActualizar, onEditar }: NivelTablaProps) {
  const tono = tonoDe(bloque.nombre)
  const Icono = tono.icono
  const cantidad = `${bloque.grados.length} ${bloque.grados.length === 1 ? "grado" : "grados"}`

  return (
    <AccordionItem
      value={`nivel-${bloque.idNivel}`}
      className={cn("overflow-hidden rounded-2xl border", tono.bloque)}
    >
      {/* El ítem recorta con `overflow-hidden`, así que el trigger no redondea
          o aparecería un hueco al abrirse. El hover ya lo trae el wrapper. */}
      <AccordionTrigger className="rounded-none">
        {/* Rota con `aria-expanded` del trigger en vez de `data-open` del ítem,
            que no es alcanzable desde un descendant con grupos de Tailwind. */}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180" />
        <Badge
          variant="outline"
          className={cn(
            "h-6 shrink-0 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset",
            tono.badge,
          )}
        >
          {bloque.nombre}
        </Badge>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <Icono className="size-3.5" aria-hidden />
          {cantidad}
        </span>
      </AccordionTrigger>

      {/*
        `border-collapse` es lo que evita que el `rowSpan` del grado corte las
        líneas: con `border-separate` (el default) la celda combinada queda más
        alta que su fila y el borde de la fila le pasa por debajo. Por eso los
        bordes van en las `<td>` y se anula el `border-b` que pone `TableRow`.
      */}
      <AccordionPanel className="border-t">
        <Table className="min-w-[520px] border-collapse">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[24%]" />
            <col className="w-[34%]" />
            <col className="w-[14%]" />
            <col className="w-[6%]" />
          </colgroup>
          <TableHeader
            className={cn(
              "[&_tr]:border-0 [&_th]:border-b [&_th]:border-border/60",
              tono.tabla,
            )}
          >
            <TableRow>
              <TableHead className="h-8">Grado</TableHead>
              <TableHead className="h-8">Turno</TableHead>
              <TableHead className="h-8">Secciones</TableHead>
              <TableHead className="h-8">Año</TableHead>
              <TableHead className="h-8 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bloque.grados.map((grupo, indice) =>
              grupo.turnos.map((fila, i) => {
                // Si al grupo le sigue otro grado, este cierra con línea completa.
                // El último lo cierra el borde del bloque; ponerlo ahí dibujaría
                // una línea justo encima de ese borde.
                const cierraGrupo = indice < bloque.grados.length - 1
                const ultimo = i === grupo.turnos.length - 1
                const borde = ultimo
                  ? cierraGrupo
                    ? BORDE_GRADO
                    : ""
                  : BORDE_TURNO
                // La celda de Grado se renderiza en la primera fila, así que su
                // cierre depende de la posición del GRUPO y no de la fila: si se
                // derivara de `ultimo`, en un grado de varios turnos `i === 0`
                // no es la última fila, quedaría sin borde y la línea cerraría
                // en la columna Turno en vez de cruzar también la de Grado.
                const bordeGrado = cierraGrupo ? BORDE_GRADO : ""
                return (
                  <TableRow
                    key={`${grupo.grado.idGrado}-${fila.idTurno}-${fila.anio}`}
                    className="border-0"
                  >
                    {/*
                      El nombre del grado abre una celda combinada que ocupa sus
                      turnos, así no se repite y queda centrado al lado. En las
                      filas siguientes no se renderiza celda: si se pusiera una
                      vacía, el rowspan quedaría desalineado.
                    */}
                    {i === 0 && (
                      <TableCell
                        rowSpan={grupo.turnos.length}
                        className={cn("font-medium", bordeGrado)}
                      >
                        {grupo.grado.nombre}
                      </TableCell>
                    )}
                    <TableCell className={borde}>{fila.turno}</TableCell>
                    <TableCell className={borde}>
                      <span className="flex flex-wrap gap-1">
                        {fila.secciones.map((s) => (
                          <Badge
                            key={s.idGradoSeccion}
                            variant="secondary"
                            className="h-6 rounded-full px-2.5 font-medium"
                          >
                            {s.nombre}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className={cn("tabular-nums text-muted-foreground", borde)}>
                      {fila.anio}
                    </TableCell>
                    <TableCell className={cn("text-right", borde)}>
                      <AccionesFila
                        puedeActualizar={puedeActualizar}
                        puedeEliminar={false}
                        onEditar={() => onEditar(grupo.grado, fila.idTurno, fila.idAnio)}
                        ariaEditar={`Editar secciones de ${grupo.grado.nombre} en ${fila.turno} ${fila.anio}`}
                      />
                    </TableCell>
                  </TableRow>
                )
              }),
            )}
          </TableBody>
        </Table>
      </AccordionPanel>
    </AccordionItem>
  )
}