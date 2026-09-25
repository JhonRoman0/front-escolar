'use client';

import { Suspense, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Tab, Box, Button } from "@mui/material";
import { UsersIcon, UserGearIcon, LockKeyIcon, PlusIcon, type Icon } from "@phosphor-icons/react";
import UsersTable, { type UserRow } from "@/components/shared/security/UsersTable";
import RolesTable, { type RoleRow } from "@/components/shared/security/RolesTable";
import PermissionsTable, { type PermissionRow } from "@/components/shared/security/PermissionsTable";

interface SecurityTab {
    value: string;
    label: string;
    icon: Icon;
    newLabel: string;
}

// 3 tabs: por debajo del límite de Miller, no hay riesgo de sobrecarga aquí.
const securityTabs: SecurityTab[] = [
    { value: "usuarios", label: "Usuarios", icon: UsersIcon, newLabel: "Nuevo usuario" },
    { value: "roles", label: "Roles", icon: UserGearIcon, newLabel: "Nuevo rol" },
    { value: "permisos", label: "Permisos", icon: LockKeyIcon, newLabel: "Nuevo permiso" },
];

function a11yProps(value: string) {
    return {
        id: `seguridad-tab-${value}`,
        "aria-controls": `seguridad-tabpanel-${value}`,
    };
}

// TODO: reemplazar por datos reales
const mockUsers: UserRow[] = [
    { id: "1", nombre: "Ana Torres", correo: "ana.torres@colegio.pe", rol: "Administrador", estado: "activo", ultimoAcceso: "24/09/2026 08:15" },
    { id: "2", nombre: "Luis Fernández", correo: "luis.fernandez@colegio.pe", rol: "Docente", estado: "activo", ultimoAcceso: "23/09/2026 17:40" },
    { id: "3", nombre: "María Quiroz", correo: "maria.quiroz@colegio.pe", rol: "Secretaría", estado: "inactivo", ultimoAcceso: null },
];

const mockRoles: RoleRow[] = [
    { id: "1", nombre: "Administrador", descripcion: "Acceso total al sistema", usuariosAsignados: 2, cantidadPermisos: 24 },
    { id: "2", nombre: "Docente", descripcion: "Gestión de notas y asistencia", usuariosAsignados: 18, cantidadPermisos: 8 },
    { id: "3", nombre: "Secretaría", descripcion: "Gestión de matrícula", usuariosAsignados: 3, cantidadPermisos: 6 },
];

const mockPermissions: PermissionRow[] = [
    { id: "1", nombre: "Ver matrícula", modulo: "Matrícula", descripcion: "Consultar solicitudes de matrícula", rolesConAcceso: ["Administrador", "Secretaría"] },
    { id: "2", nombre: "Registrar notas", modulo: "Académico", descripcion: "Registrar calificaciones de estudiantes", rolesConAcceso: ["Administrador", "Docente"] },
    { id: "3", nombre: "Gestionar usuarios", modulo: "Seguridad", descripcion: "Crear, editar y eliminar usuarios", rolesConAcceso: ["Administrador"] },
];

function SecurityPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentTab = searchParams.get("tab") ?? "usuarios";
    const validTab = securityTabs.some((t) => t.value === currentTab) ? currentTab : "usuarios";
    const activeTabConfig = securityTabs.find((t) => t.value === validTab)!;

    const handleChangeTab = (_event: SyntheticEvent, newValue: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", newValue);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">Seguridad</h1>
                    <p className="text-gray-500">
                        Aquí puedes gestionar la seguridad de tu institución.
                    </p>
                </div>

                <Button
                    variant="contained"
                    startIcon={<PlusIcon size={18} />}
                    className="bg-blue-500 hover:bg-blue-600 normal-case"
                    sx={{ minHeight: 44 }}
                >
                    {activeTabConfig.newLabel}
                </Button>
            </div>

            <Box className="border-b-2 border-gray-200">
                <Tabs
                    value={validTab}
                    onChange={handleChangeTab}
                    aria-label="Secciones de seguridad"
                >
                    {securityTabs.map(({ value, label, icon: TabIcon }) => (
                        <Tab
                            key={value}
                            value={value}
                            label={label}
                            icon={<TabIcon size={18} />}
                            iconPosition="start"
                            sx={{ minHeight: 44 }}
                            {...a11yProps(value)}
                        />
                    ))}
                </Tabs>
            </Box>

            <div
                role="tabpanel"
                id={`seguridad-tabpanel-${validTab}`}
                aria-labelledby={`seguridad-tab-${validTab}`}
            >
                {validTab === "usuarios" && <UsersTable rows={mockUsers} />}
                {validTab === "roles" && <RolesTable rows={mockRoles} />}
                {validTab === "permisos" && <PermissionsTable rows={mockPermissions} />}
            </div>
        </div>
    );
}

export default function SecurityPage() {
    return (
        <Suspense fallback={null}>
            <SecurityPageContent />
        </Suspense>
    );
}