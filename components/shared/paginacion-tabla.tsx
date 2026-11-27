"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { Paginated } from "@/lib/api"

interface TablaPaginacionProps<T> {
  data?: Paginated<T> | null
  onPage: (page: number) => void
}

const TAMANIO_PAGINA = 10

export function paginarFilas<T>(filas: T[], paginaSolicitada: number): Paginated<T> {
  const totalElements = filas.length
  const totalPages = Math.ceil(totalElements / TAMANIO_PAGINA)
  const number = Math.min(Math.max(paginaSolicitada, 0), Math.max(0, totalPages - 1))
  const inicio = number * TAMANIO_PAGINA
  const content = filas.slice(inicio, inicio + TAMANIO_PAGINA)

  return {
    content,
    totalElements,
    totalPages,
    size: TAMANIO_PAGINA,
    number,
    numberOfElements: content.length,
    first: number === 0,
    last: number >= totalPages - 1,
    empty: totalElements === 0,
  }
}

type ElementoPaginacion = number | "ellipsis"

function paginasVisibles(actual: number, total: number): ElementoPaginacion[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const candidatas = [0, total - 1, actual - 1, actual, actual + 1]
  const validas = [...new Set(candidatas)]
    .filter((pagina) => pagina >= 0 && pagina < total)
    .sort((a, b) => a - b)

  const resultado: ElementoPaginacion[] = []
  validas.forEach((pagina, i) => {
    if (i > 0 && pagina - validas[i - 1] > 1) resultado.push("ellipsis")
    resultado.push(pagina)
  })
  return resultado
}

/** Barra única de paginación: contador a la izquierda y navegación a la derecha. */
export function TablaPaginacion<T>({ data, onPage }: TablaPaginacionProps<T>) {
  if (!data) return null

  const total = data.totalPages
  const actual = Math.min(Math.max(data.number, 0), Math.max(0, total - 1))
  const inicio = data.totalElements === 0 ? 0 : actual * data.size + 1
  const fin = Math.min((actual + 1) * data.size, data.totalElements)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {inicio}–{fin} de {data.totalElements} registros
      </span>
      {total > 1 && (
        <Pagination className="w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={actual <= 0}
                onClick={() => onPage(actual - 1)}
              />
            </PaginationItem>
            <PaginationItem className="sm:hidden">
              <span className="px-3 text-sm text-muted-foreground" aria-live="polite">
                Página {actual + 1} de {total}
              </span>
            </PaginationItem>
            {paginasVisibles(actual, total).map((pagina, i) =>
              pagina === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`} className="hidden sm:block">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pagina} className="hidden sm:block">
                  <PaginationLink
                    isActive={pagina === actual}
                    aria-label={`Ir a la página ${pagina + 1}`}
                    onClick={() => onPage(pagina)}
                  >
                    {pagina + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                disabled={actual >= total - 1}
                onClick={() => onPage(actual + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
