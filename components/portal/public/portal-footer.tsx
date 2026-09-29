"use client"

import Link from "next/link"
import { useColegioPublico } from "@/hooks/use-portal"

export function PortalFooter() {
  const { data: colegio } = useColegioPublico()

  return (
    <footer className="bg-[#002a5c] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Columna 1: Info del colegio */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {colegio?.urlFoto ? (
                <img
                  src={colegio.urlFoto}
                  alt={colegio.nombre}
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
                  {colegio?.nombre?.charAt(0) ?? "C"}
                </div>
              )}
              <span className="text-lg font-bold">
                {colegio?.nombre ?? "Colegio"}
              </span>
            </div>
            <p className="text-sm text-white/70">
              Formando líderes del mañana con amor, discipline y excelencia académica.
            </p>
          </div>

          {/* Columna 2: Contacto */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Contacto
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              {colegio?.direccion && (
                <li>📍 {colegio.direccion}</li>
              )}
              {colegio?.telefono && <li>📞 {colegio.telefono}</li>}
              {colegio?.celular && <li>📱 {colegio.celular}</li>}
            </ul>
          </div>

          {/* Columna 3: Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Navegación
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/portal" className="text-white/80 hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/portal/publicaciones" className="text-white/80 hover:text-white transition-colors">
                  Publicaciones
                </Link>
              </li>
              <li>
                <Link href="/portal/eventos" className="text-white/80 hover:text-white transition-colors">
                  Eventos
                </Link>
              </li>
              <li>
                <Link href="/portal/galerias" className="text-white/80 hover:text-white transition-colors">
                  Galería
                </Link>
              </li>
              <li>
                <Link href="/portal/contacto" className="text-white/80 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {colegio?.nombre ?? "Colegio"}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
