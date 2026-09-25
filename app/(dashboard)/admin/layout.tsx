'use client';

import { useEffect, useState } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { ListIcon, XIcon, LayoutIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false); // desktop: ancho completo / icono
    const [isMobileOpen, setIsMobileOpen] = useState(false); // mobile: drawer oculto / visible

    // Evita que el fondo haga scroll mientras el drawer móvil está abierto
    useEffect(() => {
        document.body.style.overflow = isMobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileOpen]);

    return (
        <div className="min-h-screen md:grid md:grid-cols-[auto_1fr]">
            {/* Backdrop, solo visible en mobile cuando el drawer está abierto */}
            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 border-r-2 border-gray-200 bg-white p-4 transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
                    md:static md:z-auto md:translate-x-0 md:border-2 md:transition-[width]
                    ${isCollapsed ? "md:w-20" : "md:w-64"}`}
            >
                <AdminSidebar
                    collapsed={isCollapsed}
                    onNavigate={() => setIsMobileOpen(false)}
                    user={{ name: "Janluvi Burga", role: "Administrador" }}
                    onLogout={() => {
                        // TODO: reemplazar por tu lógica real, ej:
                        // await signOut({ callbackUrl: "/login" });
                        console.log("cerrar sesión");
                    }}
                />
            </aside>

            <div className="grid grid-rows-[auto_1fr] min-h-screen">
                <header className="flex items-center gap-2 p-4 border-b-2 border-gray-200">
                    {/* Botón mobile: abre/cierra el drawer */}
                    <button
                        type="button"
                        onClick={() => setIsMobileOpen((prev) => !prev)}
                        aria-label={isMobileOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
                        aria-expanded={isMobileOpen}
                        className="text-blue-400 hover:bg-blue-100 p-2 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 md:hidden"
                    >
                        {isMobileOpen ? <XIcon size={28} /> : <ListIcon size={28} />}
                    </button>

                    {/* Botón desktop: colapsa/expande el ancho */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        aria-label={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
                        aria-expanded={!isCollapsed}
                        className="hidden md:inline-flex text-blue-400 hover:bg-blue-100 p-2 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                    >
                        <LayoutIcon size={42} />
                    </button>
                </header>
                <main className="p-4">{children}</main>
            </div>
        </div>
    );
}