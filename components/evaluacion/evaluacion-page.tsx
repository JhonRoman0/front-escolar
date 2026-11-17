"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { usePuedeLeer } from "@/hooks/use-permisos"
import EvaluacionesTab from "./evaluaciones-tab"
import NotasFinalesTab from "./notas-finales-tab"

export default function EvaluacionPage() {
  // Notas finales agrupa las de cada periodo y las del año: basta con leer una de ellas.
  const puedeBimestrales = usePuedeLeer("NOTAS")
  const puedeAnuales = usePuedeLeer("NOTAS_ANUALES")
  const puedeNotas = puedeBimestrales || puedeAnuales
  const puedeEvaluaciones = usePuedeLeer("EVALUACIONES")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Notas y evaluaciones</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">
          Evaluaciones de cada curso y notas finales de cada periodo y del año.
        </p>
      </div>

      <Tabs defaultValue={puedeEvaluaciones ? "evaluaciones" : "notas"}>
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {puedeEvaluaciones && <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>}
          {puedeNotas && <TabsTrigger value="notas">Notas finales</TabsTrigger>}
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
      </Tabs>
    </div>
  )
}
