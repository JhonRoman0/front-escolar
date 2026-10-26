"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react"

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { HeaderSeccion } from "@/components/shared/header-seccion"
import { useGrados, useNiveles, useOrdenGrados } from "@/hooks/use-academico"
import { usePuede } from "@/hooks/use-permisos"
import type { GradoResponse } from "@/lib/api/academico"
import { cn } from "@/lib/utils"

import { tonoDe } from "./secciones-por-nivel"

/** Un grado puede tener una fila por turno: se muestran juntas y se mueven juntas. */
interface GradoOrdenado {
  orden: number
  nombre: string
  idGrado: number
  repite: boolean
}

function agrupar(grados: GradoResponse[], idNivel: number): GradoOrdenado[] {
  const porOrden = new Map<number, GradoOrdenado>()
  for (const g of grados) {
    if (g.idNivel !== idNivel || g.orden == null || porOrden.has(g.orden)) continue
    porOrden.set(g.orden, { orden: g.orden, nombre: g.nombre, idGrado: g.idGrado, repite: g.repite !== false })
  }
  return [...porOrden.values()].sort((a, b) => a.orden - b.orden)
}

/**
 * Orden de niveles y grados: define cuál es el grado siguiente al matricular.
 * "¿Repiten de año?" en No deja matricular a sus alumnos en el siguiente grado
 * sin esperar el cierre del año (Inicial y 1ro de Primaria).
 */
export function OrdenGradosTab() {
  const { data: niveles, isLoading: cargandoNiveles } = useNiveles()
  const { data: grados, isLoading: cargandoGrados } = useGrados()
  const orden = useOrdenGrados()
  const puedeActualizar = usePuede("ORDEN_GRADOS", "ACTUALIZAR")
  const enviando = orden.moverGrado.isPending || orden.moverNivel.isPending || orden.cambiarRepite.isPending

  const nivelesOrdenados = useMemo(
    () => [...(niveles ?? [])].sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)),
    [niveles]
  )

  async function ejecutar(accion: () => Promise<unknown>, exito?: string) {
    try {
      await accion()
      if (exito) toast.success(exito)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar")
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Orden de grados"
          descripcion="El orden define a qué grado pasa un alumno al matricularse. Si un grado no repite, sus alumnos pueden matricularse en el siguiente sin esperar el cierre del año."
        />
        {cargandoNiveles || cargandoGrados ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <Accordion multiple>
            {nivelesOrdenados.map((nivel, indiceNivel) => {
              const delNivel = agrupar(grados ?? [], nivel.idNivel)
              const tono = tonoDe(nivel.nombre)
              const Icono = tono.icono
              return (
                <AccordionItem
                  key={nivel.idNivel}
                  value={`nivel-${nivel.idNivel}`}
                  className={cn("overflow-hidden rounded-2xl border", tono.bloque)}
                >
                  {/* Las flechas del nivel van fuera del trigger: un botón no puede ir dentro de otro. */}
                  <div className="flex items-center gap-2 pr-3">
                    <AccordionTrigger className="min-w-0 flex-1 rounded-none">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180" />
                      <Badge
                        variant="outline"
                        className={cn("h-6 shrink-0 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset", tono.badge)}
                      >
                        {nivel.nombre}
                      </Badge>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Icono className="size-3.5" aria-hidden />
                        {delNivel.length} {delNivel.length === 1 ? "grado" : "grados"}
                      </span>
                    </AccordionTrigger>
                    {puedeActualizar && (
                      <Flechas
                        etiqueta={nivel.nombre}
                        puedeSubir={indiceNivel > 0}
                        puedeBajar={indiceNivel < nivelesOrdenados.length - 1}
                        disabled={enviando}
                        onMover={(subir) => ejecutar(() => orden.moverNivel.mutateAsync({ id: nivel.idNivel, subir }))}
                      />
                    )}
                  </div>
                  <AccordionPanel className="border-t">
                    <Table className="min-w-[480px]">
                      <TableHeader className={cn("[&_tr]:border-0 [&_th]:border-b [&_th]:border-border/60", tono.tabla)}>
                        <TableRow>
                          <TableHead className="h-8 w-16">Orden</TableHead>
                          <TableHead className="h-8">Grado</TableHead>
                          <TableHead className="h-8 w-44">¿Repiten de año?</TableHead>
                          {puedeActualizar && <TableHead className="h-8 w-24 text-right">Mover</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!delNivel.length ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              Este nivel aún no tiene grados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          delNivel.map((grado, indice) => (
                            <TableRow key={grado.orden}>
                              <TableCell className="tabular-nums text-muted-foreground">{grado.orden}</TableCell>
                              <TableCell className="font-medium">{grado.nombre}</TableCell>
                              <TableCell>
                                <Select
                                  value={grado.repite ? "si" : "no"}
                                  disabled={!puedeActualizar || enviando}
                                  onValueChange={(v) =>
                                    ejecutar(
                                      () => orden.cambiarRepite.mutateAsync({ id: grado.idGrado, repite: v === "si" }),
                                      `${grado.nombre} de ${nivel.nombre}: ${v === "si" ? "sí repite" : "no repite"}`
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue>{grado.repite ? "Sí" : "No"}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="si">Sí</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              {puedeActualizar && (
                                <TableCell className="text-right">
                                  <Flechas
                                    etiqueta={grado.nombre}
                                    puedeSubir={indice > 0}
                                    puedeBajar={indice < delNivel.length - 1}
                                    disabled={enviando}
                                    onMover={(subir) => ejecutar(() => orden.moverGrado.mutateAsync({ id: grado.idGrado, subir }))}
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </AccordionPanel>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}

function Flechas({
  etiqueta,
  puedeSubir,
  puedeBajar,
  disabled,
  onMover,
}: {
  etiqueta: string
  puedeSubir: boolean
  puedeBajar: boolean
  disabled: boolean
  onMover: (subir: boolean) => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="icon-sm" aria-label={`Subir ${etiqueta}`} disabled={!puedeSubir || disabled} onClick={() => onMover(true)}>
        <ArrowUp />
      </Button>
      <Button variant="outline" size="icon-sm" aria-label={`Bajar ${etiqueta}`} disabled={!puedeBajar || disabled} onClick={() => onMover(false)}>
        <ArrowDown />
      </Button>
    </div>
  )
}
