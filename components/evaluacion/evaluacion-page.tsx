"use client"

import { useAuth } from "@/components/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { usePuedeLeer } from "@/hooks/use-permisos"
import AutorizacionesTab from "./autorizaciones-tab"
import EvaluacionesTab from "./evaluaciones-tab"
import NotasFinalesTab from "./notas-finales-tab"

export default function EvaluacionPage() {
  const { esAdmin } = useAuth()
  const puedeNotas = usePuedeLeer("NOTAS")
  const puedeEvaluaciones = usePuedeLeer("EVALUACIONES")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Notas y evaluaciones</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">
          Evaluaciones de cada curso, notas finales del periodo y códigos de autorización.
        </p>
      </div>

      <Tabs defaultValue={puedeEvaluaciones ? "evaluaciones" : "notas"}>
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {puedeEvaluaciones && <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>}
          {puedeNotas && <TabsTrigger value="notas">Notas finales</TabsTrigger>}
          {esAdmin && (
            <TabsTrigger value="autorizaciones">Autorizaciones</TabsTrigger>
          )}
        </TabsList>

        {puedeEvaluaciones && (
          <TabsContent value="evaluaciones">
            <EvaluacionesTab />
          </TabsContent>
        )}
        {puedeNotas && (
          <TabsContent value="notas">
            <NotasFinalesTab />
          </TabsContent>
        )}
        {esAdmin && (
          <TabsContent value="autorizaciones">
            <AutorizacionesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
