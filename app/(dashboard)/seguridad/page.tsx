"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import UsuariosTab from "@/components/seguridad/usuarios-tab"
import RolesTab from "@/components/seguridad/roles-tab"
import AccesosTab from "@/components/seguridad/accesos-tab"
import { usePuedeLeer } from "@/hooks/use-permisos"

export default function SeguridadPage() {
  const puedeAccesos = usePuedeLeer("ROLES_PERMISOS")

  return (
    <div className="space-y-4">
      <Tabs defaultValue="accesos">
        <TabsList variant="segmented" className="overflow-x-auto">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          {puedeAccesos && <TabsTrigger value="accesos">Accesos</TabsTrigger>}
        </TabsList>
        <TabsContent value="usuarios">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
        {puedeAccesos && (
          <TabsContent value="accesos">
            <AccesosTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}