"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePuede } from "@/hooks/use-permisos"

import { RegistroTab } from "./registro-tab"
import { JustificacionesTab } from "./justificaciones-tab"
import { FeriadosTab } from "./feriados-tab"

export default function AsistenciaPage() {
  const puedeActualizar = usePuede("ASISTENCIAS", "ACTUALIZAR")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Registro por QR o código manual, justificaciones y días feriados.
        </p>
      </div>

      <Tabs defaultValue="registro">
        <TabsList className="w-full justify-start overflow-x-auto">
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
