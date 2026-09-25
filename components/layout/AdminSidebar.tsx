'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    SquaresFourIcon,
    ShieldCheckIcon,
    GraduationCapIcon,
    BookOpenIcon,
    ClipboardTextIcon,
    ChartBarIcon,
    NotePencilIcon,
    CalendarIcon,
    CheckSquareIcon,
    BuildingsIcon,
    SignOutIcon,
    type Icon,
} from "@phosphor-icons/react";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { Blobatar } from "blobatar/react";

interface SidebarUser {
    name: string;
    role: string;
    avatarUrl?: string;
}

interface AdminSidebarProps {
    collapsed?: boolean;
    onNavigate?: () => void;
    user: SidebarUser;
    onLogout: () => void;
}

interface NavItem {
    label: string;
    icon: Icon;
    href: string;
}

const navItems: NavItem[] = [
    { label: "Panel de control", icon: SquaresFourIcon, href: "/admin" },
    { label: "Académico", icon: BookOpenIcon, href: "/admin/academic" },
    { label: "Seguridad", icon: ShieldCheckIcon, href: "/admin/security" },
    { label: "Estudiantes", icon: GraduationCapIcon, href: "/admin/students" },
    { label: "Matricula", icon: ClipboardTextIcon, href: "/admin/enrollment" },
    { label: "Competencias", icon: ChartBarIcon, href: "/admin/competencies" },
    { label: "Registro de notas", icon: NotePencilIcon, href: "/admin/records" },
    { label: "Horario", icon: CalendarIcon, href: "/admin/schedule" },
    { label: "Asistencia", icon: CheckSquareIcon, href: "/admin/attendance" },
    { label: "Datos del colegio", icon: BuildingsIcon, href: "/admin/school" },
];

export default function AdminSidebar({ collapsed = false, onNavigate, user, onLogout }: AdminSidebarProps) {
    const pathname = usePathname();
    const initials = user.name
        .split(" ")
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <nav className="flex h-full flex-col">
            <h1
                className={`text-xl font-bold text-blue-400 mb-6 whitespace-nowrap opacity-100 transition-opacity duration-200 ${
                    collapsed ? "md:opacity-0 md:h-0 md:overflow-hidden" : ""
                }`}
            >
                Sistema Escolar
            </h1>

            <span
                className={`block text-sm text-gray-500 whitespace-nowrap opacity-100 transition-opacity duration-200 ${
                    collapsed ? "md:opacity-0 md:h-0 md:overflow-hidden" : ""
                }`}
            >
                Módulos de Administración
            </span>

            <ul className="mt-4 space-y-2">
                {navItems.map(({ label, icon: ItemIcon, href }) => {
                    const isActive =
                        href === "/admin" ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

                    return (
                        <li key={label} className="group relative">
                            <span
                                aria-hidden="true"
                                className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500 transition-transform duration-150 ${
                                    isActive ? "scale-y-100" : "scale-y-0"
                                }`}
                            />

                            <Link
                                href={href}
                                onClick={onNavigate}
                                aria-label={label}
                                aria-current={isActive ? "page" : undefined}
                                className={`flex min-h-11 items-center gap-2 rounded-lg pl-3 p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                                    isActive
                                        ? "bg-blue-100 text-blue-600 font-medium"
                                        : "text-neutral-500 hover:bg-blue-100"
                                } ${collapsed ? "md:justify-center" : ""}`}
                            >
                                <ItemIcon
                                    size={16}
                                    weight={isActive ? "fill" : "regular"}
                                    className="shrink-0"
                                />
                                <span className={collapsed ? "md:sr-only" : ""}>{label}</span>
                            </Link>

                            {collapsed && (
                                <span
                                    role="tooltip"
                                    className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 md:block"
                                >
                                    {label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Usuario que inició sesión + cerrar sesión, siempre al fondo del sidebar */}
            <div className="mt-auto border-t border-gray-200 pt-3">
                <div className={`flex items-center gap-2 rounded-lg p-2 ${collapsed ? "md:justify-center" : ""}`}>
                    <Blobatar
                        name={user.name}
                        size={32}
                        className="shrink-0"
                        animate="always"
                    />

                    <div className={`flex min-w-0 flex-col ${collapsed ? "md:hidden" : ""}`}>
                        <span className="truncate text-sm font-medium text-gray-800">{user.name}</span>
                        <span className="truncate text-xs text-gray-500">{user.role}</span>
                    </div>

                    <Tooltip title="Cerrar sesión">
                        <IconButton
                            onClick={onLogout}
                            aria-label="Cerrar sesión"
                            className={`ml-auto text-red-500 hover:bg-red-50 ${collapsed ? "md:ml-0" : ""}`}
                            sx={{ width: 40, height: 40 }}
                        >
                            <SignOutIcon size={18} weight="bold" />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
        </nav>
    );
}