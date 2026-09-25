'use client';

import { useState } from "react";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    TablePagination,
    Paper,
    IconButton,
    Tooltip,
    Avatar,
} from "@mui/material";
import { PencilSimpleIcon, TrashIcon, KeyIcon } from "@phosphor-icons/react";
import UserStatusChip, { type UserStatus } from "./UserStatusChip";
import { Blobatar } from "blobatar/react";

export interface UserRow {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
    estado: UserStatus;
    ultimoAcceso: string | null;
}

interface UsersTableProps {
    rows: UserRow[];
    onEdit?: (row: UserRow) => void;
    onResetPassword?: (row: UserRow) => void;
    onDelete?: (row: UserRow) => void;
}

// Botón de acción con objetivo táctil mínimo de 44x44px (WCAG 2.5.5) y foco visible (WCAG 2.4.7)
const actionButtonSx = {
    width: 44,
    height: 44,
    "&:focus-visible": {
        outline: "2px solid",
        outlineColor: "primary.main",
        outlineOffset: "2px",
    },
};

export default function UsersTable({ rows, onEdit, onResetPassword, onDelete }: UsersTableProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Paper className="rounded-xl shadow-sm overflow-hidden">
            <TableContainer>
                <Table size="small" aria-label="Tabla de usuarios">
                    <TableHead>
                        <TableRow className="bg-gray-50">
                            <TableCell className="font-semibold">Usuario</TableCell>
                            <TableCell className="font-semibold">Correo</TableCell>
                            <TableCell className="font-semibold">Rol</TableCell>
                            <TableCell className="font-semibold">Estado</TableCell>
                            <TableCell className="font-semibold">Último acceso</TableCell>
                            <TableCell className="font-semibold" align="right">
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" className="py-8 text-gray-400">
                                    No se encontraron usuarios.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {/* <Blobatar
                                                name={row.nombre}
                                                animate="hover"
                                                size={32}
                                            /> */}
                                            <span className="font-medium text-gray-800">{row.nombre}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600">{row.correo}</TableCell>
                                    <TableCell>{row.rol}</TableCell>
                                    <TableCell>
                                        <UserStatusChip status={row.estado} />
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {row.ultimoAcceso ?? "Nunca"}
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="flex justify-end gap-1">
                                            <Tooltip title="Editar usuario">
                                                <IconButton
                                                    sx={actionButtonSx}
                                                    aria-label={`Editar a ${row.nombre}`}
                                                    onClick={() => onEdit?.(row)}
                                                >
                                                    <PencilSimpleIcon size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Restablecer contraseña">
                                                <IconButton
                                                    sx={actionButtonSx}
                                                    aria-label={`Restablecer contraseña de ${row.nombre}`}
                                                    onClick={() => onResetPassword?.(row)}
                                                >
                                                    <KeyIcon size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar usuario">
                                                <IconButton
                                                    sx={actionButtonSx}
                                                    className="text-red-500"
                                                    aria-label={`Eliminar a ${row.nombre}`}
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

            <TablePagination
                component="div"
                count={rows.length}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
        </Paper>
    );
}