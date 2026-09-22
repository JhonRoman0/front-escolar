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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consolidados</h1>
        <p className="text-sm text-muted-foreground">
          Consolidados por competencias, registro de notas y promedios por alumno.
        </p>
      </div>

      <Tabs defaultValue={puedeConsolidados ? "consolidado" : "notas"}>
        <TabsList className="w-full justify-start overflow-x-auto">
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
