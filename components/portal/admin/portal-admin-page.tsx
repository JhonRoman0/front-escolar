"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePuedeLeer } from "@/hooks/use-permisos"

import PublicacionesTab from "./publicaciones-tab"
import EventosTab from "./eventos-tab"
import GaleriasTab from "./galerias-tab"
import ContactosTab from "./contactos-tab"
import AjustesTab from "./ajustes-tab"

export default function PortalAdminPage() {
  const puedePublicaciones = usePuedeLeer("PUBLICACIONES")
  const puedeEventos = usePuedeLeer("EVENTOS")
  const puedeGalerias = usePuedeLeer("GALERIAS")
  const puedeContactos = usePuedeLeer("CONTACTOS")
  const puedeAjustes = usePuedeLeer("AJUSTES")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Portal</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Gestión del portal público del colegio.</p>
      </div>

      <Tabs defaultValue="publicaciones">
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {puedePublicaciones && <TabsTrigger value="publicaciones">Publicaciones</TabsTrigger>}
          {puedeEventos && <TabsTrigger value="eventos">Eventos</TabsTrigger>}
          {puedeGalerias && <TabsTrigger value="galerias">Galerías</TabsTrigger>}
          {puedeContactos && <TabsTrigger value="contactos">Contactos</TabsTrigger>}
          {puedeAjustes && <TabsTrigger value="ajustes">Ajustes</TabsTrigger>}
        </TabsList>

        {puedePublicaciones && (
          <TabsContent value="publicaciones"><PublicacionesTab /></TabsContent>
        )}
        {puedeEventos && (
          <TabsContent value="eventos"><EventosTab /></TabsContent>
        )}
        {puedeGalerias && (
          <TabsContent value="galerias"><GaleriasTab /></TabsContent>
        )}
        {puedeContactos && (
          <TabsContent value="contactos"><ContactosTab /></TabsContent>
        )}
        {puedeAjustes && (
          <TabsContent value="ajustes"><AjustesTab /></TabsContent>
        )}
      </Tabs>
    </div>
  )
}
