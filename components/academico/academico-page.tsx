"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import DocentesTab from "./docentes-tab"
import CatalogosTab, { CursosTab } from "./catalogos-tab"
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

  const tieneEstructura = puedeAnios || puedeGrados || puedeTurnos || puedeAulas

  // Estructura académica va primero: es el catálogo base del módulo y el resto
  // de pestañas dependen de lo que se registre ahí.
  const defaultTab = tieneEstructura ? "estructura" : puedeDocentes ? "docentes" : puedeCursos ? "cursos" : puedeAsignaciones ? "asignaciones" : "docentes"

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Académico</h1>
        <p className="text-[12px] font-medium leading-5 tracking-wide text-muted-foreground">
          Gestiona la información académica de tu institución
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {tieneEstructura && <TabsTrigger value="estructura">Estructura académica</TabsTrigger>}
          {puedeDocentes && <TabsTrigger value="docentes">Docentes</TabsTrigger>}
          {puedeCursos && <TabsTrigger value="cursos">Cursos</TabsTrigger>}
          {puedeAsignaciones && <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>}
          {puedeRecreos && <TabsTrigger value="recreos">Recreos</TabsTrigger>}
          {puedeSuspensiones && <TabsTrigger value="suspensiones">Suspensiones</TabsTrigger>}
          {puedeCambiosDocente && <TabsTrigger value="cambios">Cambios docente</TabsTrigger>}
        </TabsList>

        {tieneEstructura && (
          <TabsContent value="estructura">
            <CatalogosTab
              puedeTurnos={puedeTurnos}
              puedeAnios={puedeAnios}
              puedeAulas={puedeAulas}
              puedeGrados={puedeGrados}
            />
          </TabsContent>
        )}
        {puedeDocentes && (
          <TabsContent value="docentes">
            <DocentesTab />
          </TabsContent>
        )}
        {puedeCursos && (
          <TabsContent value="cursos">
            <CursosTab />
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