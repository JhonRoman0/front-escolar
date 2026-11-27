"use client"

import { useMemo, useState } from "react"
import { ArrowLeftRight, History, Settings2, UserMinus, type LucideIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePuede, usePuedeLeer } from "@/hooks/use-permisos"
import CambiosTab from "@/components/academico/cambios-tab"
import CambiosDocenteTab from "@/components/academico/cambios-docente-tab"
import MotivosCambioDocenteTab from "@/components/academico/motivos-cambio-docente-tab"
import SuspensionesTab from "@/components/academico/suspensiones-tab"

type SubTab = "cambios" | "suspensiones" | "historial" | "motivos"

export default function CambiosDocentePage() {
  const puedeCambios = usePuedeLeer("CAMBIOS_DOCENTE")
  const puedeSuspensiones = usePuedeLeer("SUSPENSIONES_DOCENTE")
  const puedeConfigurarMotivos = usePuede("CAMBIOS_DOCENTE", "CONFIGURAR")

  const opciones: { value: SubTab; label: string; icon: LucideIcon; show: boolean }[] = useMemo(
    () => [
      { value: "cambios", label: "Cambios", icon: ArrowLeftRight, show: puedeCambios },
      { value: "suspensiones", label: "Suspensiones laborales", icon: UserMinus, show: puedeSuspensiones },
      { value: "historial", label: "Historial", icon: History, show: puedeCambios || puedeSuspensiones },
      { value: "motivos", label: "Motivos", icon: Settings2, show: puedeCambios },
    ],
    [puedeCambios, puedeSuspensiones]
  )

  const visibles = opciones.filter((o) => o.show)
  const defaultValue = visibles[0]?.value ?? "cambios"
  const [activo, setActivo] = useState<SubTab | null>(null)

  if (!visibles.length) return null

  return (
    <Tabs
      value={activo ?? defaultValue}
      onValueChange={(v) => setActivo(v as SubTab)}
      className="flex flex-col gap-4"
    >
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-full justify-start gap-6 rounded-none bg-transparent p-0 sm:gap-8">
          {visibles.map((o) => {
            const Icon = o.icon
            return (
              <TabsTrigger key={o.value} value={o.value} className="flex-none gap-2 py-3">
                <Icon className="size-4" />
                {o.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {puedeCambios && (
        <TabsContent value="cambios">
          <CambiosTab />
        </TabsContent>
      )}
      {puedeSuspensiones && (
        <TabsContent value="suspensiones">
          <SuspensionesTab />
        </TabsContent>
      )}
      {(puedeCambios || puedeSuspensiones) && (
        <TabsContent value="historial">
          <CambiosDocenteTab />
        </TabsContent>
      )}
      {puedeCambios && (
        <TabsContent value="motivos">
          <MotivosCambioDocenteTab puedeConfigurar={puedeConfigurarMotivos} />
        </TabsContent>
      )}
    </Tabs>
  )
}
