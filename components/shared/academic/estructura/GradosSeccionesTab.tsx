export default function GradosSeccionesTab() {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-gray-800">Grados y secciones</h3>
            <p className="text-sm text-gray-500">
                Define los grados (por ejemplo 1°, 2°, 3°) y sus secciones (A, B, C) para
                el año escolar seleccionado.
            </p>
            {/* TODO: listado de grados con sus secciones anidadas */}
        </div>
    );
}