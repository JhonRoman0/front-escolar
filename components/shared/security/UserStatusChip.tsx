import { Chip } from "@mui/material";
import { CheckCircleIcon, XCircleIcon, type Icon } from "@phosphor-icons/react";

export type UserStatus = "activo" | "inactivo";

interface StatusConfig {
    label: string;
    icon: Icon;
    className: string;
}

export const userStatusConfig: Record<UserStatus, StatusConfig> = {
    activo: {
        label: "Activo",
        icon: CheckCircleIcon,
        className: "bg-green-50 text-green-700 border border-green-200",
    },
    inactivo: {
        label: "Inactivo",
        icon: XCircleIcon,
        className: "bg-gray-100 text-gray-600 border border-gray-300",
    },
};

// Color + ícono + texto (WCAG 1.4.1): el estado nunca se comunica solo por color.
export default function UserStatusChip({ status }: { status: UserStatus }) {
    const { label, icon: StatusIcon, className } = userStatusConfig[status];

    return (
        <Chip
            size="small"
            icon={<StatusIcon size={14} weight="fill" />}
            label={label}
            className={`font-medium ${className}`}
        />
    );
}