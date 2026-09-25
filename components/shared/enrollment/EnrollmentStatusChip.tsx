import { Chip } from "@mui/material";
import { CheckCircleIcon, ClockIcon, XCircleIcon, type Icon } from "@phosphor-icons/react";

export type EnrollmentStatus = "aprobado" | "pendiente" | "anulado";

interface StatusConfig {
    label: string;
    icon: Icon;
    className: string;
}

export const statusConfig: Record<EnrollmentStatus, StatusConfig> = {
    aprobado: {
        label: "Aprobado",
        icon: CheckCircleIcon,
        className: "bg-green-50 text-green-700 border border-green-200",
    },
    pendiente: {
        label: "Pendiente",
        icon: ClockIcon,
        className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    },
    anulado: {
        label: "Anulado",
        icon: XCircleIcon,
        className: "bg-red-50 text-red-700 border border-red-200",
    },
};

export default function EnrollmentStatusChip({ status }: { status: EnrollmentStatus }) {
    const { label, icon: StatusIcon, className } = statusConfig[status];

    return (
        <Chip
            size="small"
            icon={<StatusIcon size={14} weight="fill" />}
            label={label}
            className={`font-medium ${className}`}
        />
    );
}