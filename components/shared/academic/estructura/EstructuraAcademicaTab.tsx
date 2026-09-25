'use client';

import { useState, type SyntheticEvent } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import {
    CalendarIcon,
    ListNumbersIcon,
    ClockIcon,
    type Icon,
} from "@phosphor-icons/react";
import AnioEscolarTab from "./AnioEscolarTab";
import GradosSeccionesTab from "./GradosSeccionesTab";
import TurnosAulasTab from "./TurnosAulasTab";

interface SubTab {
    value: string;
    label: string;
    icon: Icon;
}

const subTabs: SubTab[] = [
    { value: "anio-escolar", label: "Año escolar", icon: CalendarIcon },
    { value: "grados-secciones", label: "Grados y secciones", icon: ListNumbersIcon },
    { value: "turnos-aulas", label: "Turnos y aulas", icon: ClockIcon },
];

function a11yProps(value: string) {
    return {
        id: `estructura-tab-${value}`,
        "aria-controls": `estructura-tabpanel-${value}`,
    };
}

interface SubTabPanelProps {
    children: React.ReactNode;
    value: string;
    current: string;
}

function SubTabPanel({ children, value, current }: SubTabPanelProps) {
    const isSelected = value === current;

    return (
        <div
            role="tabpanel"
            hidden={!isSelected}
            id={`estructura-tabpanel-${value}`}
            aria-labelledby={`estructura-tab-${value}`}
        >
            {isSelected && <Box className="pt-4">{children}</Box>}
        </div>
    );
}

export default function EstructuraAcademicaTab() {
    // Sub-navegación interna: no se sincroniza con la URL a propósito,
    // para no ensuciar la query con dos niveles de tabs anidados.
    const [subTab, setSubTab] = useState<string>("anio-escolar");

    const handleChangeSubTab = (_event: SyntheticEvent, newValue: string) => {
        setSubTab(newValue);
    };

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
                Define cómo se organiza tu institución: el año escolar activo, los grados
                y secciones que lo componen, y los turnos y aulas disponibles.
            </p>

            <Box className="border-b border-gray-200">
                <Tabs
                    value={subTab}
                    onChange={handleChangeSubTab}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    aria-label="Estructura académica"
                >
                    {subTabs.map(({ value, label, icon: TabIcon }) => (
                        <Tab
                            key={value}
                            value={value}
                            label={label}
                            icon={<TabIcon size={16} />}
                            iconPosition="start"
                            {...a11yProps(value)}
                        />
                    ))}
                </Tabs>
            </Box>

            <SubTabPanel value="anio-escolar" current={subTab}>
                <AnioEscolarTab />
            </SubTabPanel>
            <SubTabPanel value="grados-secciones" current={subTab}>
                <GradosSeccionesTab />
            </SubTabPanel>
            <SubTabPanel value="turnos-aulas" current={subTab}>
                <TurnosAulasTab />
            </SubTabPanel>
        </div>
    );
}