import { TextField, MenuItem, Select, type SelectChangeEvent, InputAdornment } from "@mui/material";
import { MagnifyingGlassIcon, FunnelIcon } from "@phosphor-icons/react";
import type { EnrollmentStatus } from "./EnrollmentStatusChip";

interface EnrollmentFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    nivel: string;
    onNivelChange: (value: string) => void;
    estado: EnrollmentStatus | "todos";
    onEstadoChange: (value: EnrollmentStatus | "todos") => void;
    niveles: string[];
}

export default function EnrollmentFilters({
    search,
    onSearchChange,
    nivel,
    onNivelChange,
    estado,
    onEstadoChange,
    niveles,
}: EnrollmentFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TextField
                size="small"
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full sm:w-64"
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <MagnifyingGlassIcon size={18} className="text-gray-400" />
                            </InputAdornment>
                        ),
                    },
                }}
            />

            <div className="flex items-center gap-2 text-gray-400">
                <FunnelIcon size={18} />
                <span className="text-sm">Filtros:</span>
            </div>

            <Select
                size="small"
                value={nivel}
                onChange={(e: SelectChangeEvent) => onNivelChange(e.target.value)}
                className="w-full sm:w-44"
                displayEmpty
            >
                <MenuItem value="todos">Todos los niveles</MenuItem>
                {niveles.map((n) => (
                    <MenuItem key={n} value={n}>
                        {n}
                    </MenuItem>
                ))}
            </Select>

            <Select
                size="small"
                value={estado}
                onChange={(e: SelectChangeEvent) => onEstadoChange(e.target.value as EnrollmentStatus | "todos")}
                className="w-full sm:w-44"
                displayEmpty
            >
                <MenuItem value="todos">Todos los estados</MenuItem>
                <MenuItem value="aprobado">Aprobado</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="anulado">Anulado</MenuItem>
            </Select>
        </div>
    );
}