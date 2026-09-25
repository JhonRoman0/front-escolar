'use client';

import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useState } from "react";
import {
    GraduationCapIcon,
    ChalkboardTeacherIcon,
    UsersIcon,
    UserCheckIcon,
    type Icon,
} from "@phosphor-icons/react";

interface StatCardProps {
    label: string;
    value: string;
    icon: Icon;
    accent: "blue" | "green" | "yellow" | "purple";
}

const accentStyles: Record<StatCardProps["accent"], { bg: string; iconBg: string; text: string }> = {
    blue: { bg: "bg-blue-50", iconBg: "bg-blue-500", text: "text-blue-600" },
    green: { bg: "bg-green-50", iconBg: "bg-green-500", text: "text-green-600" },
    yellow: { bg: "bg-yellow-50", iconBg: "bg-yellow-500", text: "text-yellow-600" },
    purple: { bg: "bg-purple-50", iconBg: "bg-purple-500", text: "text-purple-600" },
};

function StatCard({ label, value, icon: ItemIcon, accent }: StatCardProps) {
    const styles = accentStyles[accent];

    return (
        <div className={`flex items-center gap-4 rounded-xl p-4 ${styles.bg}`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
                <ItemIcon size={24} weight="fill" className="text-white" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-sm text-gray-500 truncate">{label}</span>
                <span className={`text-2xl font-bold ${styles.text}`}>{value}</span>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [year, setYear] = useState<number>(2026);

    const handleChangeYear = (event: SelectChangeEvent<number>) => {
        setYear(Number(event.target.value));
    }

    return (
        <div className="grid grid-rows-[auto_auto_auto_auto] h-[calc(100vh-8rem)] overflow-hidden overflow-y-scroll">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b-2 border-gray-200">
                <div className="flex flex-col gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-blue-500">Hola, Janluvi</span>
                    <span className="text-sm text-gray-500">
                        {new Date().toLocaleDateString("es-PE", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </span>
                </div>
                <Select
                    value={year}
                    onChange={handleChangeYear}
                    variant="outlined"
                    className="w-full sm:w-auto"
                >
                    {Array.from(
                        { length: new Date().getFullYear() - 2026 + 1 },
                        (_, i) => 2026 + i
                    ).map((y) => (
                        <MenuItem key={y} value={y}>
                            {y}
                        </MenuItem>
                    ))}
                </Select>
            </div>
            {/* cards alumnos, docentes, usuarios, matriculados */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                <StatCard label="Alumnos" value="1,234" icon={GraduationCapIcon} accent="blue" />
                <StatCard label="Docentes" value="123" icon={ChalkboardTeacherIcon} accent="green" />
                <StatCard label="Usuarios" value="456" icon={UsersIcon} accent="yellow" />
                <StatCard label="Matriculados" value="789" icon={UserCheckIcon} accent="purple" />
            </div>
            {/* graficos de asistencia y alumnos por grado(matriculas activas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <span className="text-sm text-gray-500">Asistencia</span>
                    <div className="h-64 bg-gray-100 rounded-lg mt-2 flex items-center justify-center">
                        <span className="text-gray-400">Gráfico de asistencia</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <span className="text-sm text-gray-500">Alumnos por grado</span>
                    <div className="h-64 bg-gray-100 rounded-lg mt-2 flex items-center justify-center">
                        <span className="text-gray-400">Gráfico de alumnos por grado</span>
                    </div>
                </div>
            </div>
            {/* analisis de asistencias */}
            <div className="bg-white p-4 rounded-lg shadow-md m-4">
                <span className="text-sm text-gray-500">Análisis de asistencias</span>
                <div className="h-64 bg-gray-100 rounded-lg mt-2 flex items-center justify-center">
                    <span className="text-gray-400">Análisis de asistencias</span>
                </div>
            </div>
        </div>
    );
}