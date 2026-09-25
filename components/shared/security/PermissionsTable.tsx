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
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

export interface PermissionRow {
    id: string;
    nombre: string;
    modulo: string;
    descripcion: string;
    rolesConAcceso: string[];
}

interface PermissionsTableProps {
    rows: PermissionRow[];
    onEdit?: (row: PermissionRow) => void;
    onDelete?: (row: PermissionRow) => void;
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

// Máximo de chips visibles antes de resumir en "+N" (Ley de Miller: no saturar la celda)
const MAX_VISIBLE_ROLES = 3;

export default function PermissionsTable({ rows, onEdit, onDelete }: PermissionsTableProps) {
    return (
        <Paper className="rounded-xl shadow-sm overflow-hidden">
            <TableContainer>
                <Table size="small" aria-label="Tabla de permisos">
                    <TableHead>
                        <TableRow className="bg-gray-50">
                            <TableCell className="font-semibold">Permiso</TableCell>
                            <TableCell className="font-semibold">Módulo</TableCell>
                            <TableCell className="font-semibold">Descripción</TableCell>
                            <TableCell className="font-semibold">Roles con acceso</TableCell>
                            <TableCell className="font-semibold" align="right">
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" className="py-8 text-gray-400">
                                    No se encontraron permisos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => {
                                const visibleRoles = row.rolesConAcceso.slice(0, MAX_VISIBLE_ROLES);
                                const remaining = row.rolesConAcceso.length - visibleRoles.length;

                                return (
                                    <TableRow key={row.id} hover>
                                        <TableCell className="font-medium text-gray-800">{row.nombre}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={row.modulo}
                                                className="bg-purple-50 text-purple-700 border border-purple-200 font-medium"
                                            />
                                        </TableCell>
                                        <TableCell className="text-gray-600">{row.descripcion}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1">
                                                {visibleRoles.map((rol) => (
                                                    <Chip
                                                        key={rol}
                                                        size="small"
                                                        label={rol}
                                                        className="bg-gray-100 text-gray-600 border border-gray-200"
                                                    />
                                                ))}
                                                {remaining > 0 && (
                                                    <span
                                                        className="text-xs text-gray-400"
                                                        aria-label={`${remaining} roles más con acceso`}
                                                    >
                                                        +{remaining}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end gap-1">
                                                <Tooltip title="Editar permiso">
                                                    <IconButton
                                                        sx={actionButtonSx}
                                                        aria-label={`Editar el permiso ${row.nombre}`}
                                                        onClick={() => onEdit?.(row)}
                                                    >
                                                        <PencilSimpleIcon size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Eliminar permiso">
                                                    <IconButton
                                                        sx={actionButtonSx}
                                                        className="text-red-500"
                                                        aria-label={`Eliminar el permiso ${row.nombre}`}
                                                        onClick={() => onDelete?.(row)}
                                                    >
                                                        <TrashIcon size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}