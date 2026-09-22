"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useColegioPublico } from "@/hooks/use-portal"

export function PortalHero() {
  const { data: colegio } = useColegioPublico()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#004497] via-[#003377] to-[#002255] text-white">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:py-28">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Bienvenidos al{" "}
          <span className="text-[#fdf3b0]">{colegio?.nombre ?? "Colegio"}</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80 md:text-xl">
          Formando líderes del mañana con amor, disciplina y excelencia académica.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            render={<Link href="/portal/colegio" />}
            size="lg"
            className="bg-[#fdf3b0] text-[#4a3d00] hover:bg-[#f5e88a] font-semibold"
            nativeButton={false}
          >
            Conócenos
          </Button>
          <Button
            render={<Link href="/portal/contacto" />}
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
            nativeButton={false}
          >
            Contáctanos
          </Button>
        </div>
      </div>
    </section>
  )
}
