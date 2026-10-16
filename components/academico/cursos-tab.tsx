"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  FileSpreadsheet,
  Lock,
  RotateCcw,
  Upload,
  CheckCircle2,
  FileCheck,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { EstadoBadge } from "@/components/seguridad/estado-badge"
import { BotonNuevo } from "@/components/shared/boton-nuevo"
import { BotonReintentar } from "@/components/shared/boton-reintentar"
import { BotonGuardar } from "@/components/shared/boton-guardar"
import { BuscadorTabla } from "@/components/shared/buscador-tabla"
import { FilterSelect } from "@/components/shared/filter-select"
import { HeaderSeccion } from "@/components/shared/header-seccion"
import { useEliminarConToast } from "@/hooks/use-eliminar-toast"
import { guardarConToast } from "@/hooks/guardar-con-toast"
import { useResetAlAbrir } from "@/hooks/use-reset-al-abrir"
import { useDebouncedValue } from "@/hooks/use-debounce"
import { usePuede } from "@/hooks/use-permisos"
import {
  AccionesFila,
  CampoAcceso,
  FilasCargando,
  MensajeSinDatos,
} from "@/components/shared/table-helpers"
import {
  useAniosEscolares,
  useCambiarEstadoCurso,
  useCrudCursos,
  useCursos,
  useImportarCursosExcel,
} from "@/hooks/use-academico"
import type {
  CursoImportResponse,
  CursoResponse,
} from "@/lib/api/academico"
import { ACCESO, ESTADO_ANIO } from "@/lib/api/academico"
import { cursoSchema, type CursoValues } from "@/lib/schemas/academico"

const ESTADO_OPCIONES = [
  { value: "1", label: "Activo" },
  { value: "3", label: "Inactivo" },
]

export function CursosTab() {
  const { data, isLoading, isError, refetch } = useCursos()
  const crud = useCrudCursos()
  const cambiarEstado = useCambiarEstadoCurso()
  const { data: anios = [] } = useAniosEscolares()

  const puedeCrear = usePuede("CURSOS", "CREAR")
  const puedeActualizar = usePuede("CURSOS", "ACTUALIZAR")
  const puedeEliminar = usePuede("CURSOS", "ELIMINAR")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [editando, setEditando] = useState<CursoResponse | null>(null)
  const [cambiandoId, setCambiandoId] = useState<number | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const busquedaDebounced = useDebouncedValue(busqueda, 400)

  // Año escolar vigente
  const anioVigente = useMemo(
    () => anios.find((a) => a.estado === ESTADO_ANIO.VIGENTE),
    [anios]
  )
  const estaBloqueadoPorVigencia = !!anioVigente

  const eliminarConToast = useEliminarConToast()

  function handleEliminar(curso: CursoResponse) {
    return eliminarConToast(crud.eliminar.mutateAsync, {
      id: curso.idCurso,
      mensaje: `Curso "${curso.nombre}" eliminado`,
    })
  }

  async function handleCambiarEstado(curso: CursoResponse, activar: boolean) {
    if (estaBloqueadoPorVigencia) {
      toast.warning(
        "No se puede modificar el estado de los cursos mientras el año escolar esté vigente."
      )
      return
    }
    const nuevoAccesoId = activar ? ACCESO.ACTIVO : ACCESO.INACTIVO
    setCambiandoId(curso.idCurso)
    try {
      await cambiarEstado.mutateAsync({
        id: curso.idCurso,
        accesoId: nuevoAccesoId,
      })
      toast.success(
        `Curso "${curso.nombre}" ${activar ? "activado" : "inactivado"}`
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al cambiar el estado del curso"
      )
    } finally {
      setCambiandoId(null)
    }
  }

  const cursosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase()
    return (data ?? []).filter((curso) => {
      if (filtroEstado && String(curso.accesoId) !== filtroEstado) return false
      if (!q) return true
      const codigoMatch = curso.codigo?.toLowerCase().includes(q)
      const nombreMatch = curso.nombre?.toLowerCase().includes(q)
      return codigoMatch || nombreMatch
    })
  }, [data, busquedaDebounced, filtroEstado])

  const hayFiltros = busqueda.trim() !== "" || filtroEstado !== ""

  function limpiarFiltros() {
    setBusqueda("")
    setFiltroEstado("")
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <HeaderSeccion
          titulo="Cursos"
          descripcion="Áreas curriculares y asignaturas de la institución educativa."
          acciones={
            <div className="flex flex-wrap items-center gap-2">
              {puedeCrear && (
                <Button
                  variant="outline"
                  onClick={() => setImportarOpen(true)}
                >
                  <FileSpreadsheet data-icon="inline-start" />
                  Importar desde Excel
                </Button>
              )}
              <BotonNuevo
                texto="Nuevo curso"
                puedeCrear={puedeCrear && !estaBloqueadoPorVigencia}
                onClick={() => {
                  setEditando(null)
                  setDialogOpen(true)
                }}
              />
            </div>
          }
        />

        {estaBloqueadoPorVigencia && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
            <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold leading-tight">
                Año escolar {anioVigente?.anio} en curso
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                La malla curricular se encuentra bloqueada para modificaciones,
                cambios de estado o eliminaciones.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <BuscadorTabla
            value={busqueda}
            onValueChange={setBusqueda}
            placeholder="Buscar por código o nombre..."
            className="min-w-[200px] flex-1 max-w-[360px]"
          />
          <FilterSelect
            value={filtroEstado}
            onValueChange={setFiltroEstado}
            options={ESTADO_OPCIONES}
            allLabel="Todos los estados"
            className="w-[180px]"
          />
          {hayFiltros && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={limpiarFiltros}
            >
              <RotateCcw className="mr-1 size-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Código</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="w-[200px]">Estado</TableHead>
                <TableHead className="text-right w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FilasCargando columnas={4} />
              ) : isError ? (
                <MensajeSinDatos
                  columnas={4}
                  mensaje="No se pudo cargar. Recarga la pantalla."
                />
              ) : !cursosFiltrados.length ? (
                <MensajeSinDatos
                  columnas={4}
                  mensaje={
                    hayFiltros
                      ? "Sin resultados para los filtros seleccionados."
                      : "Aún no hay cursos registrados."
                  }
                />
              ) : (
                cursosFiltrados.map((curso) => {
                  const estaActivo = curso.accesoId === ACCESO.ACTIVO
                  const bloqueadoFila =
                    !puedeActualizar ||
                    estaBloqueadoPorVigencia ||
                    cambiandoId === curso.idCurso

                  return (
                    <TableRow key={curso.idCurso}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] font-semibold text-muted-foreground"
                        >
                          {curso.codigo || "S/C"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {curso.nombre}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={estaActivo}
                            disabled={bloqueadoFila}
                            onCheckedChange={(checked) =>
                              handleCambiarEstado(curso, checked)
                            }
                            aria-label={`Cambiar estado de ${curso.nombre}`}
                          />
                          <EstadoBadge accesoId={curso.accesoId} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AccionesFila
                          puedeActualizar={
                            puedeActualizar && !estaBloqueadoPorVigencia
                          }
                          puedeEliminar={
                            puedeEliminar && !estaBloqueadoPorVigencia
                          }
                          onEditar={() => {
                            setEditando(curso)
                            setDialogOpen(true)
                          }}
                          onEliminar={() => handleEliminar(curso)}
                          tituloEliminar="Eliminar curso"
                          descripcionEliminar={`Se marcará "${curso.nombre}" como eliminado.`}
                          ariaEditar={`Editar ${curso.nombre}`}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {isError && <BotonReintentar refetch={refetch} />}

        <CursoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          curso={editando}
          crear={crud.crear}
          actualizar={crud.actualizar}
        />

        <ImportarCursosModal
          open={importarOpen}
          onOpenChange={setImportarOpen}
        />
      </CardContent>
    </Card>
  )
}

function CursoDialog({
  open,
  onOpenChange,
  curso,
  crear,
  actualizar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curso?: CursoResponse | null
  crear: ReturnType<typeof useCrudCursos>["crear"]
  actualizar: ReturnType<typeof useCrudCursos>["actualizar"]
}) {
  const esEdicion = !!curso
  const codigo = curso?.codigo ?? ""
  const nombre = curso?.nombre ?? ""
  const accesoId = curso?.accesoId ?? ACCESO.ACTIVO

  const form = useForm<CursoValues>({
    resolver: zodResolver(cursoSchema),
    defaultValues: { codigo, nombre, accesoId },
  })

  useResetAlAbrir(
    open,
    form,
    { codigo, nombre, accesoId },
    [codigo, nombre, accesoId]
  )

  async function onSubmit(values: CursoValues) {
    await guardarConToast(async () => {
      if (esEdicion && curso) {
        await actualizar.mutateAsync({
          id: curso.idCurso,
          data: {
            codigo: values.codigo,
            nombre: values.nombre,
            accesoId: values.accesoId,
          },
        })
        toast.success("Curso actualizado")
      } else {
        await crear.mutateAsync({
          codigo: values.codigo,
          nombre: values.nombre,
          accesoId: ACCESO.ACTIVO,
        })
        toast.success("Curso creado")
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {esEdicion ? "Editar curso" : "Nuevo curso"}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Modifica el código, nombre o estado del curso."
              : "Ingresa el código identificador y nombre del nuevo curso."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Código del curso</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="Ej: 0001: ART Y CULT"
                      autoFocus
                      {...field}
                    />
                    <FieldDescription className="text-xs">
                      Código oficial o abreviado del área curricular.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.codigo]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombre del curso</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Ej: ARTE Y CULTURA" {...field} />
                    <FieldDescription className="text-xs">
                      Nombre oficial de la materia.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            {esEdicion && (
              <Controller
                control={form.control}
                name="accesoId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Estado</FieldLabel>
                    <FieldContent>
                      <CampoAcceso
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FieldContent>
                  </Field>
                )}
              />
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <BotonGuardar
              etiqueta={esEdicion ? "Guardar cambios" : "Crear curso"}
              enviando={form.formState.isSubmitting}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ImportarCursosModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const importar = useImportarCursosExcel()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<CursoImportResponse | null>(null)

  function limpiarEstado() {
    setArchivo(null)
    setResultado(null)
  }

  function handleOpenChange(abierto: boolean) {
    if (!abierto) limpiarEstado()
    onOpenChange(abierto)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx")) {
      toast.error("El archivo debe ser un documento Excel (.xlsx)")
      return
    }
    setArchivo(file)
    setResultado(null)
  }

  async function handleImportar() {
    if (!archivo) {
      toast.warning("Selecciona una plantilla Excel antes de continuar")
      return
    }

    try {
      const res = await importar.mutateAsync(archivo)
      setResultado(res)
      toast.success(
        `Importación completada: ${res.creados} nuevos cursos creados`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al importar cursos"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <FileSpreadsheet className="size-5 text-primary" />
            Importar Cursos desde SIAGIE
          </DialogTitle>
          <DialogDescription>
            Sube el archivo Excel (.xlsx) oficial descargado de SIAGIE para
            sincronizar automáticamente todas las áreas curriculares.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold leading-tight">
                  Sincronización Exitosa
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se procesaron todas las áreas curriculares del archivo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border bg-muted/40 p-3 text-center">
                <span className="text-xl font-bold text-foreground">
                  {resultado.totalDetectados}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Detectados
                </p>
              </div>
              <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-3 text-center">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {resultado.creados}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Creados
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3 text-center">
                <span className="text-xl font-bold text-foreground">
                  {resultado.actualizados}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Actualizados
                </p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="brand"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Entendido
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 p-6 text-center hover:bg-muted/40 transition-colors">
              <Upload className="size-8 text-muted-foreground mb-2" />
              <label
                htmlFor="excel-input"
                className="cursor-pointer text-sm font-semibold text-primary hover:underline"
              >
                Seleccionar archivo .xlsx
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Plantilla oficial de notas SIAGIE
              </p>
              <input
                id="excel-input"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {archivo && (
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCheck className="size-4 shrink-0 text-emerald-600" />
                  <span className="truncate font-medium">{archivo.name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {(archivo.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={importar.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="brand"
                onClick={handleImportar}
                disabled={!archivo || importar.isPending}
              >
                {importar.isPending ? (
                  "Importando..."
                ) : (
                  <>
                    <Upload data-icon="inline-start" />
                    Procesar e importar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
