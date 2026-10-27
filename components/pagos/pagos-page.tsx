"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { usePuedeLeer } from "@/hooks/use-permisos"
import { MetodosPagoTab } from "./metodos-pago-tab"
import { MontosMatriculaTab } from "./montos-matricula-tab"

export default function PagosPage() {
  const puedePagos = usePuedeLeer("PAGOS_MATRICULA")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Pagos</h1>
        <p className="text-[12px] font-medium leading-5 tracking-wide text-muted-foreground">
          Métodos de pago y monto de la matrícula por nivel.
        </p>
      </div>

      {puedePagos && (
        <Tabs defaultValue="metodos">
          <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="metodos">Métodos de pago</TabsTrigger>
            <TabsTrigger value="montos">Montos de matrícula</TabsTrigger>
          </TabsList>
          <TabsContent value="metodos">
            <MetodosPagoTab />
          </TabsContent>
          <TabsContent value="montos">
            <MontosMatriculaTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
