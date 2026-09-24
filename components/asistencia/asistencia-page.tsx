"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePuede } from "@/hooks/use-permisos"

import { RegistroTab } from "./registro-tab"
import { JustificacionesTab } from "./justificaciones-tab"
import { FeriadosTab } from "./feriados-tab"

export default function AsistenciaPage() {
  const puedeActualizar = usePuede("ASISTENCIAS", "ACTUALIZAR")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Asistencia</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Registro por QR o código manual, justificaciones y días feriados.</p>
      </div>

      <Tabs defaultValue="registro">
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          {puedeActualizar && (
            <>
              <TabsTrigger value="justificaciones">
                Motivos de justificación
              </TabsTrigger>
              <TabsTrigger value="feriados">Días feriados</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="registro" className="mt-4 space-y-4">
          <RegistroTab />
        </TabsContent>

        {puedeActualizar && (
          <>
            <TabsContent value="justificaciones" className="mt-4 space-y-4">
              <JustificacionesTab />
            </TabsContent>
            <TabsContent value="feriados" className="mt-4 space-y-4">
              <FeriadosTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
