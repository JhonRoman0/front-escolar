"use client"

import { useAuth } from "@/components/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { usePuedeLeer } from "@/hooks/use-permisos"
import AutorizacionesTab from "./autorizaciones-tab"
import ConsolidadoTab from "./consolidado-tab"
import NotasTab from "./notas-tab"

export default function EvaluacionPage() {
  const { esAdmin } = useAuth()
  const puedeConsolidados = usePuedeLeer("CONSOLIDADOS")
  const puedeNotas = usePuedeLeer("NOTAS")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Consolidados</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Consolidados por competencias, registro de notas y promedios por alumno.</p>
      </div>

      <Tabs defaultValue={puedeConsolidados ? "consolidado" : "notas"}>
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {puedeConsolidados && (
            <TabsTrigger value="consolidado">Consolidados</TabsTrigger>
          )}
          {puedeNotas && <TabsTrigger value="notas">Registrar notas</TabsTrigger>}
          {esAdmin && (
            <TabsTrigger value="autorizaciones">Autorizaciones</TabsTrigger>
          )}
        </TabsList>

        {puedeConsolidados && (
          <TabsContent value="consolidado">
            <ConsolidadoTab />
          </TabsContent>
        )}
        {puedeNotas && (
          <TabsContent value="notas">
            <NotasTab />
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
