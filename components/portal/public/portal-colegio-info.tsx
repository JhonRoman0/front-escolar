"use client"

import { MapPin, Phone, Smartphone } from "lucide-react"
import { useColegioPublico } from "@/hooks/use-portal"

export function PortalColegioInfo() {
  const { data: colegio } = useColegioPublico()

  if (!colegio) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Cargando información del colegio...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      {/* Datos */}
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-[#0f1e3d]">
            {colegio.nombre}
          </h2>
          {colegio.codigoColegio && (
            <p className="text-sm text-muted-foreground">
              Código: {colegio.codigoColegio}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {colegio.direccion && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004497]/10 text-[#004497]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0f1e3d]">Dirección</p>
                <p className="text-sm text-muted-foreground">{colegio.direccion}</p>
              </div>
            </div>
          )}

          {colegio.telefono && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004497]/10 text-[#004497]">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0f1e3d]">Teléfono</p>
                <p className="text-sm text-muted-foreground">{colegio.telefono}</p>
              </div>
            </div>
          )}

          {colegio.celular && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004497]/10 text-[#004497]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0f1e3d]">Celular</p>
                <p className="text-sm text-muted-foreground">{colegio.celular}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logo + mapa */}
      <div className="flex flex-col items-center justify-center">
        {colegio.urlFoto ? (
          <img
            src={colegio.urlFoto}
            alt={colegio.nombre}
            className="mb-6 h-40 w-40 rounded-2xl object-cover shadow-md"
          />
        ) : (
          <div className="mb-6 flex h-40 w-40 items-center justify-center rounded-2xl bg-[#004497] text-5xl font-bold text-white shadow-md">
            {colegio.nombre.charAt(0)}
          </div>
        )}

        {/* Placeholder mapa */}
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-[#e1e7f0] bg-[#f5f7fa] text-sm text-muted-foreground">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-[#004497]/40" />
            <p>{colegio.direccion ?? "Sin dirección registrada"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
