"use client"

import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { usePagosMatricula } from "@/hooks/use-matricula"
import type { MatriculaResponse, PagoMatriculaResponse } from "@/lib/api/matricula"

import { formatoSoles } from "./campos-pago"

const TIPOS: Record<PagoMatriculaResponse["tipo"], { etiqueta: string; variante: "success" | "info" | "warning" }> = {
  PAGO: { etiqueta: "Pago", variante: "success" },
  DIFERENCIA: { etiqueta: "Diferencia", variante: "info" },
  DEVOLUCION: { etiqueta: "Devolución", variante: "warning" },
}

const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" })

/** Historial de dinero de la matrícula: nunca se reemplaza un movimiento ni un comprobante. */
export function PagosDialog({
  matricula,
  onOpenChange,
}: {
  matricula: MatriculaResponse | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: pagos, isLoading } = usePagosMatricula(matricula?.idMatricula)

  return (
    <Dialog open={!!matricula} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Pagos de la matrícula</DialogTitle>
        </DialogHeader>
        {matricula && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Monto de {matricula.nivel} {matricula.anio}</p>
                <p className="text-lg font-semibold">{formatoSoles(matricula.monto)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-lg font-semibold">{formatoSoles(matricula.pagadoNeto)}</p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !pagos?.length ? (
              <p className="text-sm text-muted-foreground">Esta matrícula no tiene pagos registrados.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pagos.map((pago) => (
                  <li key={pago.idPago} className="flex gap-3 rounded-lg border p-3">
                    {pago.urlComprobante ? (
                      <a href={pago.urlComprobante} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Ver comprobante">
                        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Cloudinary */}
                        <img src={pago.urlComprobante} alt="Comprobante" className="h-14 w-14 rounded object-cover" />
                      </a>
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={TIPOS[pago.tipo].variante}>{TIPOS[pago.tipo].etiqueta}</Badge>
                        <span className="font-semibold">
                          {pago.tipo === "DEVOLUCION" ? "− " : ""}
                          {formatoSoles(pago.monto)}
                        </span>
                        <span className="text-sm text-muted-foreground">{pago.metodoPago}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fechaHora.format(new Date(pago.fecha))} · {pago.registradoPor}
                        {pago.codigoTransaccion ? ` · Código ${pago.codigoTransaccion}` : ""}
                      </p>
                    </div>
                    {pago.urlComprobante && (
                      <a
                        href={pago.urlComprobante}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir comprobante"
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <ExternalLink />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <DialogTrigger render={<Button variant="outline" />}>Cerrar</DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
