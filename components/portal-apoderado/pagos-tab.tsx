"use client"

import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { usePagosPortal } from "@/hooks/use-portal-apoderado"
import { formatearFecha } from "@/lib/fechas"
import { Cargando, ErrorCarga, Seccion, Vacio } from "./comunes"

const soles = (n: number | null) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TIPO: Record<string, string> = { PAGO: "Pago", DIFERENCIA: "Diferencia", DEVOLUCION: "Devolución" }

export function PagosTab({ idMatricula }: { idMatricula: number }) {
  const { data, isLoading, error } = usePagosPortal(idMatricula)
  if (isLoading) return <Cargando />
  if (error || !data) return <ErrorCarga error={error} />

  const pagada = data.saldo != null && data.saldo <= 0

  return (
    <div className="flex flex-col gap-4">
      <Seccion
        titulo="Matrícula"
        extra={data.saldo != null && (
          <Badge variant={pagada ? "success" : "warning"}>{pagada ? "Pagada" : "Saldo pendiente"}</Badge>
        )}
      >
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Monto", valor: data.monto },
            { label: "Pagado", valor: data.pagado },
            { label: "Saldo", valor: data.saldo },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-sm font-bold sm:text-base">{soles(f.valor)}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion titulo="Pagos registrados">
        {data.pagos.length === 0 ? (
          <Vacio>No hay pagos registrados.</Vacio>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.pagos.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {TIPO[p.tipo] ?? p.tipo} · {soles(p.tipo === "DEVOLUCION" ? -p.monto : p.monto)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(p.fecha)}{p.metodo ? ` · ${p.metodo}` : ""}
                  </p>
                </div>
                {p.urlComprobante && (
                  <a
                    href={p.urlComprobante}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Comprobante
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
