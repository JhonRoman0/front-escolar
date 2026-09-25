'use client';

import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import { PlusIcon } from "@phosphor-icons/react";
import EnrollmentFilters from "@/components/shared/enrollment/EnrollmentFilters";
import EnrollmentTable, { type EnrollmentRow } from "@/components/shared/enrollment/EnrollmentTable";
import { statusConfig, type EnrollmentStatus } from "@/components/shared/enrollment/EnrollmentStatusChip";

// TODO: reemplazar por datos reales (fetch a tu API / server component)
const mockRows: EnrollmentRow[] = [
    {
        id: "1",
        alumno: "Ana Torres Vega",
        nivel: "Primaria",
        grado: "3°",
        seccion: "A",
        turno: "Mañana",
        estado: "aprobado",
        pago: "pagado",
        fechaPago: "12/03/2026",
    },
    {
        id: "2",
        alumno: "Luis Fernández Ruiz",
        nivel: "Secundaria",
        grado: "1°",
        seccion: "B",
        turno: "Tarde",
        estado: "pendiente",
        pago: "sin pagar",
        fechaPago: null,
    },
    {
        id: "3",
        alumno: "María Quiroz Paz",
        nivel: "Inicial",
        grado: "5 años",
        seccion: "C",
        turno: "Mañana",
        estado: "anulado",
        pago: "sin pagar",
        fechaPago: null,
    },
];

export default function EnrollmentPage() {
    const [search, setSearch] = useState("");
    const [nivel, setNivel] = useState("todos");
    const [estado, setEstado] = useState<EnrollmentStatus | "todos">("todos");

    const niveles = useMemo(() => Array.from(new Set(mockRows.map((r) => r.nivel))), []);

    const filteredRows = useMemo(() => {
        return mockRows.filter((row) => {
            const matchesSearch = row.alumno.toLowerCase().includes(search.toLowerCase());
            const matchesNivel = nivel === "todos" || row.nivel === nivel;
            const matchesEstado = estado === "todos" || row.estado === estado;
            return matchesSearch && matchesNivel && matchesEstado;
        });
    }, [search, nivel, estado]);

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">Matrícula</h1>
                    <p className="text-gray-500">Aquí puedes gestionar la matrícula de los estudiantes.</p>
                </div>

                <Button
                    variant="contained"
                    startIcon={<PlusIcon size={18} />}
                    className="bg-blue-500 hover:bg-blue-600 normal-case"
                >
                    Nueva matrícula
                </Button>
            </div>

            {/* Leyenda de estados */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-2">
                <span className="text-sm text-gray-500">Leyenda:</span>
                {(Object.keys(statusConfig) as EnrollmentStatus[]).map((key) => {
                    const { label, icon: StatusIcon, className } = statusConfig[key];
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${className}`}>
                                <StatusIcon size={12} weight="fill" />
                            </span>
                            <span className="text-sm text-gray-600">{label}</span>
                        </div>
                    );
                })}
            </div>

            <EnrollmentFilters
                search={search}
                onSearchChange={setSearch}
                nivel={nivel}
                onNivelChange={setNivel}
                estado={estado}
                onEstadoChange={setEstado}
                niveles={niveles}
            />

            <EnrollmentTable rows={filteredRows} />
        </div>
    );
}