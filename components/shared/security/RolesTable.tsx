'use client';

import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    IconButton,
    Tooltip,
    Chip,
} from "@mui/material";
import { PencilSimpleIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react";

export interface RoleRow {
    id: string;
    nombre: string;
    descripcion: string;
    usuariosAsignados: number;
    cantidadPermisos: number;
}

interface RolesTableProps {
    rows: RoleRow[];
    onEdit?: (row: RoleRow) => void;
    onDelete?: (row: RoleRow) => void;
}

const actionButtonSx = {
    width: 44,
    height: 44,
    "&:focus-visible": {
        outline: "2px solid",
        outlineColor: "primary.main",
        outlineOffset: "2px",
    },
};

export default function RolesTable({ rows, onEdit, onDelete }: RolesTableProps) {
    return (
        <Paper className="rounded-xl shadow-sm overflow-hidden">
            <TableContainer>
                <Table size="small" aria-label="Tabla de roles">
                    <TableHead>
                        <TableRow className="bg-gray-50">
                            <TableCell className="font-semibold">Rol</TableCell>
                            <TableCell className="font-semibold">Descripción</TableCell>
                            <TableCell className="font-semibold">Usuarios asignados</TableCell>
                            <TableCell className="font-semibold">Permisos</TableCell>
                            <TableCell className="font-semibold" align="right">
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" className="py-8 text-gray-400">
                                    No se encontraron roles.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell className="font-medium text-gray-800">{row.nombre}</TableCell>
                                    <TableCell className="text-gray-600">{row.descripcion}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <UsersIcon size={16} />
                                            <span>{row.usuariosAsignados}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={`${row.cantidadPermisos} permisos`}
                                            className="bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="flex justify-end gap-1">
                                            <Tooltip title="Editar rol">
                                                <IconButton
                                                    sx={actionButtonSx}
                                                    aria-label={`Editar el rol ${row.nombre}`}
                                                    onClick={() => onEdit?.(row)}
                                                >
                                                    <PencilSimpleIcon size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar rol">
                                                <IconButton
                                                    sx={actionButtonSx}
                                                    className="text-red-500"
                                                    aria-label={`Eliminar el rol ${row.nombre}`}
                                                    onClick={() => onDelete?.(row)}
                                                >
                                                    <TrashIcon size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}