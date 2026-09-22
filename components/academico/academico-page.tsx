"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import DocentesTab from "./docentes-tab"
import CatalogosTab from "./catalogos-tab"
import GradosTab from "./grados-tab"
import AsignacionesTab from "./asignaciones-tab"
import SuspensionesTab from "./suspensiones-tab"
import CambiosDocenteTab from "./cambios-docente-tab"
import RecreosTab from "./recreos-tab"
import { usePuedeLeer } from "@/hooks/use-permisos"

export default function AcademicoPage() {
  const puedeDocentes = usePuedeLeer("DOCENTES")
  const puedeCursos = usePuedeLeer("CURSOS")
  const puedeTurnos = usePuedeLeer("TURNOS")
  const puedeAnios = usePuedeLeer("ANIOS_ESCOLARES")
  const puedeAulas = usePuedeLeer("AULAS")
  const puedeGrados = usePuedeLeer("GRADOS")
  const puedeAsignaciones = usePuedeLeer("ASIGNACIONES")
  const puedeSuspensiones = usePuedeLeer("SUSPENSIONES_DOCENTE")
  const puedeCambiosDocente = usePuedeLeer("CAMBIOS_DOCENTE")
  const puedeRecreos = usePuedeLeer("RECREOS")

  const tieneCatalogos =
    puedeCursos || puedeTurnos || puedeAnios || puedeAulas

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Académico</h1>
        <p className="text-sm text-muted-foreground">
          Docentes, catálogos, grados y asignaciones de clases.
        </p>
      </div>

      <Tabs defaultValue="docentes">
        <TabsList className="w-full justify-start overflow-x-auto">
          {puedeDocentes && <TabsTrigger value="docentes">Docentes</TabsTrigger>}
          {tieneCatalogos && (
            <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          )}
          {puedeGrados && <TabsTrigger value="grados">Grados</TabsTrigger>}
          {puedeAsignaciones && (
            <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
          )}
          {puedeRecreos && (
            <TabsTrigger value="recreos">Recreos</TabsTrigger>
          )}
          {puedeSuspensiones && (
            <TabsTrigger value="suspensiones">Suspensiones</TabsTrigger>
          )}
          {puedeCambiosDocente && (
            <TabsTrigger value="cambios">Cambios docente</TabsTrigger>
          )}
        </TabsList>

        {puedeDocentes && (
          <TabsContent value="docentes">
            <DocentesTab />
          </TabsContent>
        )}
        {tieneCatalogos && (
          <TabsContent value="catalogos">
            <CatalogosTab
              puedeCursos={puedeCursos}
              puedeTurnos={puedeTurnos}
              puedeAnios={puedeAnios}
              puedeAulas={puedeAulas}
            />
          </TabsContent>
        )}
        {puedeGrados && (
          <TabsContent value="grados">
            <GradosTab />
          </TabsContent>
        )}
        {puedeAsignaciones && (
          <TabsContent value="asignaciones">
            <AsignacionesTab />
          </TabsContent>
        )}
        {puedeRecreos && (
          <TabsContent value="recreos">
            <RecreosTab />
          </TabsContent>
        )}
        {puedeSuspensiones && (
          <TabsContent value="suspensiones">
            <SuspensionesTab />
          </TabsContent>
        )}
        {puedeCambiosDocente && (
          <TabsContent value="cambios">
            <CambiosDocenteTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}