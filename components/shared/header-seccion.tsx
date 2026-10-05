import type { ElementType, ReactNode } from "react"

/**
 * Encabezado de una sección de catálogo: título, descripción opcional y las
 * acciones de la derecha (normalmente un BotonNuevo). El slot `acciones` es a
 * propósito, para que un encabezado con varios botones no necesite otro
 * componente: se pasan como hijos.
 */
export function HeaderSeccion({
  titulo,
  descripcion,
  icono: Icono,
  acciones,
}: {
  titulo: string
  descripcion?: string
  icono?: ElementType
  acciones?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icono && (
          <span className="rounded-full bg-muted p-2">
            <Icono className="size-5 text-muted-foreground" />
          </span>
        )}
        <div className="space-y-0.5">
          <h2 className="text-[20px] font-semibold tracking-tight">{titulo}</h2>
          {descripcion && (
            <p className="text-[14px] leading-5 text-muted-foreground">
              {descripcion}
            </p>
          )}
        </div>
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-2">{acciones}</div>
      )}
    </div>
  )
}
