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
} from "@mui/material";
import { EyeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import EnrollmentStatusChip, { type EnrollmentStatus } from "./EnrollmentStatusChip";

export interface EnrollmentRow {
    id: string;
    alumno: string;
    nivel: string;
    grado: string;
    seccion: string;
    turno: string;
    estado: EnrollmentStatus;
    pago: "pagado" | "sin pagar";
    fechaPago: string | null;
}

interface EnrollmentTableProps {
    rows: EnrollmentRow[];
    onView?: (row: EnrollmentRow) => void;
    onEdit?: (row: EnrollmentRow) => void;
    onDelete?: (row: EnrollmentRow) => void;
}

export default function EnrollmentTable({ rows, onView, onEdit, onDelete }: EnrollmentTableProps) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Paper className="rounded-xl shadow-sm overflow-hidden">
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow className="bg-gray-50">
                            <TableCell className="font-semibold">Alumno</TableCell>
                            <TableCell className="font-semibold">Nivel</TableCell>
                            <TableCell className="font-semibold">Grado</TableCell>
                            <TableCell className="font-semibold">Sección</TableCell>
                            <TableCell className="font-semibold">Turno</TableCell>
                            <TableCell className="font-semibold">Estado</TableCell>
                            <TableCell className="font-semibold">Pago</TableCell>
                            <TableCell className="font-semibold">Fecha de pago</TableCell>
                            <TableCell className="font-semibold" align="right">
                                Acciones
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" className="py-8 text-gray-400">
                                    No se encontraron matrículas con los filtros seleccionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell className="font-medium text-gray-800">{row.alumno}</TableCell>
                                    <TableCell>{row.nivel}</TableCell>
                                    <TableCell>{row.grado}</TableCell>
                                    <TableCell>{row.seccion}</TableCell>
                                    <TableCell>{row.turno}</TableCell>
                                    <TableCell>
                                        <EnrollmentStatusChip status={row.estado} />
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={
                                                row.pago === "pagado"
                                                    ? "text-green-600 font-medium"
                                                    : "text-red-500 font-medium"
                                            }
                                        >
                                            {row.pago === "pagado" ? "Pagado" : "Sin pagar"}
                                        </span>
                                    </TableCell>
                                    <TableCell>{row.fechaPago ?? "—"}</TableCell>
                                    <TableCell align="right">
                                        <div className="flex justify-end gap-1">
                                            <Tooltip title="Ver detalle">
                                                <IconButton size="small" onClick={() => onView?.(row)}>
                                                    <EyeIcon size={16} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={() => onEdit?.(row)}>
                                                    <PencilSimpleIcon size={16} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Anular">
                                                <IconButton
                                                    size="small"
                                                    className="text-red-500"
                                                    onClick={() => onDelete?.(row)}
                                                >
                                                    <TrashIcon size={16} />
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
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
        </Paper>
    );
}