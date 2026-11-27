"use client"

import { Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/auth-provider"
import { usePuede } from "@/hooks/use-permisos"

import { RegistroTab } from "./registro-tab"
import { JustificacionesTab } from "./justificaciones-tab"
import { FeriadosTab } from "./feriados-tab"

export default function AsistenciaPage() {
  const { esAdmin, permisos } = useAuth()
  const puedeConfigurar = usePuede("ASISTENCIAS", "CONFIGURAR")
  const puedeRegistrar = usePuede("ASISTENCIAS", "CREAR")
  const puedeJustificar = usePuede("ASISTENCIAS", "ACTUALIZAR")

  // El apoderado verá la asistencia de su hijo en su portal.
  if (!esAdmin && !puedeRegistrar && !puedeJustificar && permisos?.vinculo === "APODERADO") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="mb-3 size-10 opacity-40" />
          <p className="text-sm font-medium">La asistencia de tu hijo está disponible en el módulo Portal.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Asistencia</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Ingreso diario al colegio: portería con QR, consulta por año escolar, justificaciones y días feriados.</p>
      </div>

      <Tabs defaultValue="registro">
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          {puedeConfigurar && (
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

        {puedeConfigurar && (
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
