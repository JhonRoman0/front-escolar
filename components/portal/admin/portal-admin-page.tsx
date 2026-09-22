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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Portal</h1>
        <p className="text-sm text-muted-foreground">
          Gestión del portal público del colegio.
        </p>
      </div>

      <Tabs defaultValue="publicaciones">
        <TabsList className="w-full justify-start overflow-x-auto">
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
