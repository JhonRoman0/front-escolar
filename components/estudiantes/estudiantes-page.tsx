"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { usePuedeLeer } from "@/hooks/use-permisos"
import { AlumnosTab } from "./alumnos-tab"
import { ApoderadosTab } from "./apoderados-tab"

export default function EstudiantesPage() {
  const puedeAlumnos = usePuedeLeer("ALUMNOS")
  const puedeApoderados = usePuedeLeer("APODERADOS")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">
          Alumnos con su código QR y apoderados.
        </p>
      </div>

      <Tabs defaultValue="alumnos">
        <TabsList className="w-full justify-start overflow-x-auto">
          {puedeAlumnos && (
            <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
          )}
          {puedeApoderados && (
            <TabsTrigger value="apoderados">Apoderados</TabsTrigger>
          )}
        </TabsList>

        {puedeAlumnos && (
          <TabsContent value="alumnos">
            <AlumnosTab />
          </TabsContent>
        )}
        {puedeApoderados && (
          <TabsContent value="apoderados">
            <ApoderadosTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}