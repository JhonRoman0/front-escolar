export default function TurnosAulasTab() {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-gray-800">Turnos y aulas</h3>
            <p className="text-sm text-gray-500">
                Configura los turnos disponibles (mañana, tarde) y las aulas físicas donde
                se dictan las clases.
            </p>
            {/* TODO: listado de turnos + listado de aulas */}
        </div>
    );
}