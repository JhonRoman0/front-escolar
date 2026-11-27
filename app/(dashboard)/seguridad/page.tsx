"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import UsuariosTab from "@/components/seguridad/usuarios-tab"
import RolesTab from "@/components/seguridad/roles-tab"
import AccesosTab from "@/components/seguridad/accesos-tab"
import { usePuedeLeer } from "@/hooks/use-permisos"

export default function SeguridadPage() {
  const puedeUsuarios = usePuedeLeer("USUARIOS")
  const puedeRoles = usePuedeLeer("ROLES")
  const puedeAccesos = usePuedeLeer("ROLES_PERMISOS")
  // Se abre la primera pestaña que el usuario puede ver.
  const inicial = puedeUsuarios ? "usuarios" : puedeRoles ? "roles" : "accesos"

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold tracking-tight text-foreground">Seguridad</h1>
        <p className="text-[12px] font-medium leading-5 text-muted-foreground">Usuarios, roles y accesos por rol.</p>
      </div>
      <Tabs defaultValue={inicial}>
        <TabsList variant="segmented" className="w-full justify-start overflow-x-auto">
          {puedeUsuarios && <TabsTrigger value="usuarios">Usuarios</TabsTrigger>}
          {puedeRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {puedeAccesos && <TabsTrigger value="accesos">Accesos</TabsTrigger>}
        </TabsList>
        {puedeUsuarios && (
          <TabsContent value="usuarios">
            <UsuariosTab />
          </TabsContent>
        )}
        {puedeRoles && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}
        {puedeAccesos && (
          <TabsContent value="accesos">
            <AccesosTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}