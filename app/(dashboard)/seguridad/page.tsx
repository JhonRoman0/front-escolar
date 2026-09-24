"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import UsuariosTab from "@/components/seguridad/usuarios-tab"
import RolesTab from "@/components/seguridad/roles-tab"
import AccesosTab from "@/components/seguridad/accesos-tab"
import { usePuedeLeer } from "@/hooks/use-permisos"

export default function SeguridadPage() {
  const puedeAccesos = usePuedeLeer("ROLES_PERMISOS")

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Seguridad</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Usuarios, roles y accesos por rol.</p>
      </div>
      <Tabs defaultValue="usuarios">
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
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