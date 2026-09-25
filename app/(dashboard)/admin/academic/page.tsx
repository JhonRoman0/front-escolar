'use client';

import { Suspense, useState, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, Tab, Box } from "@mui/material";
import {
    ChalkboardTeacherIcon,
    BooksIcon,
    SquaresFourIcon,
    ListChecksIcon,
    type Icon,
} from "@phosphor-icons/react";
import DocentesTab from "@/components/shared/academic/DocentesTab";
import CursosTab from "@/components/shared/academic/CursosTab";
import EstructuraAcademicaTab from "@/components/shared/academic/estructura/EstructuraAcademicaTab";
import AsignacionesTab from "@/components/shared/academic/AsignacionesTab";

interface MainTab {
    value: string;
    label: string;
    icon: Icon;
}

const mainTabs: MainTab[] = [
    { value: "docentes", label: "Docentes", icon: ChalkboardTeacherIcon },
    { value: "cursos", label: "Cursos", icon: BooksIcon },
    { value: "estructura", label: "Estructura Académica", icon: SquaresFourIcon },
    { value: "asignaciones", label: "Asignaciones", icon: ListChecksIcon },
];

function a11yProps(value: string) {
    return {
        id: `academico-tab-${value}`,
        "aria-controls": `academico-tabpanel-${value}`,
    };
}

interface TabPanelProps {
    children: React.ReactNode;
    value: string;
    current: string;
}

function TabPanel({ children, value, current }: TabPanelProps) {
    const isSelected = value === current;

    return (
        <div
            role="tabpanel"
            hidden={!isSelected}
            id={`academico-tabpanel-${value}`}
            aria-labelledby={`academico-tab-${value}`}
        >
            {isSelected && <Box className="pt-4">{children}</Box>}
        </div>
    );
}

function AcademicPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentTab = searchParams.get("tab") ?? "docentes";
    const validTab = mainTabs.some((t) => t.value === currentTab) ? currentTab : "docentes";

    const handleChangeTab = (_event: SyntheticEvent, newValue: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", newValue);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <h1 className="text-2xl font-bold text-blue-500">Académico</h1>
                <p className="text-gray-500">
                    Aquí puedes gestionar la información académica de tu institución.
                </p>
            </div>

            <Box className="border-b-2 border-gray-200">
                <Tabs
                    value={validTab}
                    onChange={handleChangeTab}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    aria-label="Secciones académicas"
                >
                    {mainTabs.map(({ value, label, icon: TabIcon }) => (
                        <Tab
                            key={value}
                            value={value}
                            label={label}
                            icon={<TabIcon size={18} />}
                            iconPosition="start"
                            {...a11yProps(value)}
                        />
                    ))}
                </Tabs>
            </Box>

            <TabPanel value="docentes" current={validTab}>
                <DocentesTab />
            </TabPanel>
            <TabPanel value="cursos" current={validTab}>
                <CursosTab />
            </TabPanel>
            <TabPanel value="estructura" current={validTab}>
                <EstructuraAcademicaTab />
            </TabPanel>
            <TabPanel value="asignaciones" current={validTab}>
                <AsignacionesTab />
            </TabPanel>
        </div>
    );
}

export default function AcademicPage() {
    // useSearchParams necesita un boundary de Suspense en App Router
    return (
        <Suspense fallback={null}>
            <AcademicPageContent />
        </Suspense>
    );
}