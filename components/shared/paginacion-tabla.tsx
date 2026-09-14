"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { Paginated } from "@/lib/api"

interface TablaPaginacionProps<T> {
  data?: Paginated<T> | null
  onPage: (page: number) => void
}

/** Barra de paginación estándar para tablas que consumen un Page del back. */
export function TablaPaginacion<T>({ data, onPage }: TablaPaginacionProps<T>) {
  if (!data?.totalPages || data.totalPages <= 1) return null

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Anterior"
            onClick={(e) => {
              e.preventDefault()
              if (!data.first) onPage(Math.max(0, data.number - 1))
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-3 text-sm text-muted-foreground">
            Página {data.number + 1} de {data.totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Siguiente"
            onClick={(e) => {
              e.preventDefault()
              if (!data.last) onPage(data.number + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
