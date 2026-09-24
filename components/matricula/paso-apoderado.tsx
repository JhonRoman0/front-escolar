"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Search, Trash2 } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import { useApoderadoPorDocumento } from "@/hooks/use-estudiantes"
import { useConsultarDni } from "@/hooks/use-reniec"
import { MENSAJE_CONTRASENA_SEGURA, REGEX_CONTRASENA_SEGURA } from "@/lib/schemas/comun"
import { ApiError } from "@/lib/api"
import type { ApoderadoResponse } from "@/lib/api/estudiantes"

export interface ApoderadoSlotData {
  existe: boolean
  apoderado?: ApoderadoResponse
  nombre?: string
  apellidoPat?: string
  apellidoMat?: string
  gmail?: string
  contraseña?: string
  fechaNaci?: string
  documentoIdentidad?: string
  celular?: string
  direccion?: string
  parentesco?: string
}

export interface PasoApoderadoData {
  principal: ApoderadoSlotData
  secundario?: ApoderadoSlotData
}

const PARENTESCOS = [
  "Madre",
  "Padre",
  "Hermano/a",
  "Abuelo/a",
  "Tío/a",
  "Padrino/Madrina",
  "Tutor/a",
  "Otro",
]

const apoderadoSlotSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(50),
    apellidoPat: z.string().trim().min(1, "El apellido paterno es obligatorio").max(50),
    apellidoMat: z.string().trim().min(1, "El apellido materno es obligatorio").max(50),
    gmail: z.string().email("Correo inválido").max(60).optional().or(z.literal("")),
    contraseña: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .superRefine((val, ctx) => {
        if (!val) return
        if (val.length < 8) {
          ctx.addIssue({ code: "custom", message: "La contraseña debe tener al menos 8 caracteres" })
          return
        }
        if (!REGEX_CONTRASENA_SEGURA.test(val)) {
          ctx.addIssue({ code: "custom", message: MENSAJE_CONTRASENA_SEGURA })
        }
      }),
    fechaNaci: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida (aaaa-mm-dd)"),
    documentoIdentidad: z.string().max(20).optional().or(z.literal("")).nullable(),
    celular: z.string().max(20).optional().or(z.literal("")),
    direccion: z.string().max(100).optional().or(z.literal("")),
    parentesco: z.string().min(1, "El parentesco es obligatorio").max(50),
  })

type ApoderadoSlotValues = z.infer<typeof apoderadoSlotSchema>

const defaultSlotValues: ApoderadoSlotValues = {
  nombre: "",
  apellidoPat: "",
  apellidoMat: "",
  gmail: "",
  contraseña: "",
  fechaNaci: "",
  documentoIdentidad: "",
  celular: "",
  direccion: "",
  parentesco: "",
}

interface PasoApoderadoProps {
  value: PasoApoderadoData | null
  onChange: (data: PasoApoderadoData) => void
  onBack: () => void
  onNext: () => void
}

export function PasoApoderado({ value, onChange, onBack, onNext }: PasoApoderadoProps) {
  const buscarApoderado = useApoderadoPorDocumento()
  const reniec = useConsultarDni()
  const [busqueda, setBusqueda] = useState(value?.principal?.documentoIdentidad ?? "")
  const [apoderadoSel, setApoderadoSel] = useState<ApoderadoResponse | null>(
    value?.principal?.existe ? (value.principal.apoderado ?? null) : null
  )
  const [haySecundario, setHaySecundario] = useState(!!value?.secundario)

  const formPrincipal = useForm<ApoderadoSlotValues>({
    resolver: zodResolver(apoderadoSlotSchema),
    defaultValues: value?.principal?.existe
      ? defaultSlotValues
      : {
          nombre: value?.principal?.nombre ?? "",
          apellidoPat: value?.principal?.apellidoPat ?? "",
          apellidoMat: value?.principal?.apellidoMat ?? "",
          gmail: value?.principal?.gmail ?? "",
          contraseña: value?.principal?.contraseña ?? "",
          fechaNaci: value?.principal?.fechaNaci ?? "",
          documentoIdentidad: value?.principal?.documentoIdentidad ?? "",
          celular: value?.principal?.celular ?? "",
          direccion: value?.principal?.direccion ?? "",
          parentesco: value?.principal?.parentesco ?? "",
        },
  })

  const formSecundario = useForm<ApoderadoSlotValues>({
    resolver: zodResolver(apoderadoSlotSchema),
    defaultValues: {
      nombre: value?.secundario?.nombre ?? "",
      apellidoPat: value?.secundario?.apellidoPat ?? "",
      apellidoMat: value?.secundario?.apellidoMat ?? "",
      gmail: value?.secundario?.gmail ?? "",
      contraseña: value?.secundario?.contraseña ?? "",
      fechaNaci: value?.secundario?.fechaNaci ?? "",
      documentoIdentidad: value?.secundario?.documentoIdentidad ?? "",
      celular: value?.secundario?.celular ?? "",
      direccion: value?.secundario?.direccion ?? "",
      parentesco: value?.secundario?.parentesco ?? "",
    },
  })

  const [busquedaSec, setBusquedaSec] = useState(value?.secundario?.documentoIdentidad ?? "")
  const [apoderadoSecSel, setApoderadoSecSel] = useState<ApoderadoResponse | null>(
    value?.secundario?.existe ? (value.secundario.apoderado ?? null) : null
  )

  async function buscarPorDocumento() {
    const dni = busqueda.trim()
    if (!dni) return
    try {
      const apoderado = await buscarApoderado.mutateAsync(dni)
      setApoderadoSel(apoderado)
      onChange({
        principal: { existe: true, apoderado },
        secundario: haySecundario ? value?.secundario : undefined,
      })
      toast.success(
        `Apoderado encontrado: ${apoderado.nombre} ${apoderado.apellidoPat} ${apoderado.apellidoMat}`
      )
    } catch (error) {
      const isNotFound =
        (error instanceof ApiError && error.status === 404) ||
        (error instanceof Error && error.message.toLowerCase().includes("no encontrado"))
      if (isNotFound) {
        if (/^\d{8}$/.test(dni)) {
          try {
            const r = await reniec.mutateAsync(dni)
            setApoderadoSel(null)
            formPrincipal.setValue("documentoIdentidad", r.dni ?? dni)
            formPrincipal.setValue("nombre", r.nombres ?? "", { shouldValidate: true })
            formPrincipal.setValue("apellidoPat", r.apellidoPaterno ?? "", { shouldValidate: true })
            formPrincipal.setValue("apellidoMat", r.apellidoMaterno ?? "", { shouldValidate: true })
            const origen = r.origen === "CACHE" || r.origen === "RENIEC" ? "RENIEC" : r.origen
            toast.success(`Datos cargados desde ${origen}`)
            return
          } catch (reniecError) {
            if (reniecError instanceof ApiError && reniecError.status === 404) {
              setApoderadoSel(null)
              formPrincipal.setValue("documentoIdentidad", dni)
              toast.info("DNI no encontrado en RENIEC: completa los datos manualmente")
              return
            }
            toast.error(reniecError instanceof Error ? reniecError.message : "No se pudo consultar RENIEC")
            return
          }
        }
        setApoderadoSel(null)
        formPrincipal.setValue("documentoIdentidad", dni)
        toast.info("No existe un apoderado con ese DNI. Completa los datos.")
      } else {
        const msg = error instanceof Error ? error.message : ""
        toast.error(msg || "No se pudo buscar el apoderado")
      }
    }
  }

  function cambiarApoderado() {
    setApoderadoSel(null)
    setBusqueda("")
    onChange({
      principal: { existe: false },
      secundario: haySecundario ? value?.secundario : undefined,
    })
  }

  async function buscarSecundario() {
    const dni = busquedaSec.trim()
    if (!dni) return
    try {
      const apoderado = await buscarApoderado.mutateAsync(dni)
      setApoderadoSecSel(apoderado)
      toast.success(
        `Apoderado secundario encontrado: ${apoderado.nombre} ${apoderado.apellidoPat}`
      )
    } catch (error) {
      const isNotFound =
        (error instanceof ApiError && error.status === 404) ||
        (error instanceof Error && error.message.toLowerCase().includes("no encontrado"))
      if (isNotFound) {
        if (/^\d{8}$/.test(dni)) {
          try {
            const r = await reniec.mutateAsync(dni)
            setApoderadoSecSel(null)
            formSecundario.setValue("documentoIdentidad", r.dni ?? dni)
            formSecundario.setValue("nombre", r.nombres ?? "", { shouldValidate: true })
            formSecundario.setValue("apellidoPat", r.apellidoPaterno ?? "", { shouldValidate: true })
            formSecundario.setValue("apellidoMat", r.apellidoMaterno ?? "", { shouldValidate: true })
            const origen = r.origen === "CACHE" || r.origen === "RENIEC" ? "RENIEC" : r.origen
            toast.success(`Datos cargados desde ${origen}`)
            return
          } catch (reniecError) {
            if (reniecError instanceof ApiError && reniecError.status === 404) {
              setApoderadoSecSel(null)
              formSecundario.setValue("documentoIdentidad", dni)
              toast.info("DNI no encontrado en RENIEC: completa los datos manualmente")
              return
            }
            toast.error(reniecError instanceof Error ? reniecError.message : "No se pudo consultar RENIEC")
            return
          }
        }
        setApoderadoSecSel(null)
        formSecundario.setValue("documentoIdentidad", dni)
        toast.info("No existe un apoderado con ese DNI. Completa los datos.")
      } else {
        const msg = error instanceof Error ? error.message : ""
        toast.error(msg || "No se pudo buscar el apoderado")
      }
    }
  }

  function handleSiguiente() {
    if (!apoderadoSel) {
      formPrincipal.handleSubmit((vals) => {
        const principalData: ApoderadoSlotData = {
          existe: false,
          nombre: vals.nombre,
          apellidoPat: vals.apellidoPat,
          apellidoMat: vals.apellidoMat,
          gmail: vals.gmail || undefined,
          contraseña: vals.contraseña || undefined,
          fechaNaci: vals.fechaNaci,
          documentoIdentidad: vals.documentoIdentidad || busqueda || undefined,
          celular: vals.celular || undefined,
          direccion: vals.direccion || undefined,
          parentesco: vals.parentesco,
        }
        continuarConSecundario(principalData)
      })()
    } else {
      continuarConSecundario({ existe: true, apoderado: apoderadoSel })
    }
  }

  function continuarConSecundario(principalData: ApoderadoSlotData) {
    let secundarioData: ApoderadoSlotData | undefined

    if (haySecundario) {
      if (apoderadoSecSel) {
        secundarioData = { existe: true, apoderado: apoderadoSecSel }
      } else {
        formSecundario.handleSubmit((vals) => {
          secundarioData = {
            existe: false,
            nombre: vals.nombre,
            apellidoPat: vals.apellidoPat,
            apellidoMat: vals.apellidoMat,
            gmail: vals.gmail || undefined,
            contraseña: vals.contraseña || undefined,
            fechaNaci: vals.fechaNaci,
            documentoIdentidad: vals.documentoIdentidad || busquedaSec || undefined,
            celular: vals.celular || undefined,
            direccion: vals.direccion || undefined,
            parentesco: vals.parentesco,
          }
          onChange({ principal: principalData, secundario: secundarioData })
          onNext()
        })()
        return
      }
    }

    onChange({ principal: principalData, secundario: secundarioData })
    onNext()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Paso 2 — Apoderado</h3>
        <p className="text-sm text-muted-foreground">
          Busca el apoderado por DNI o regístralo si es nuevo.
        </p>
      </div>

      {apoderadoSel ? (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">
              {apoderadoSel.nombre} {apoderadoSel.apellidoPat} {apoderadoSel.apellidoMat}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {apoderadoSel.documentoIdentidad ?? "S/D"}
              {apoderadoSel.parentesco ? ` · ${apoderadoSel.parentesco}` : ""}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={cambiarApoderado}>
            Cambiar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar apoderado por DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarPorDocumento()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={buscarPorDocumento}
              disabled={buscarApoderado.isPending}
            >
              {buscarApoderado.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o completa los datos</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              control={formPrincipal.control}
              name="nombre"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Nombres</FieldLabel>
                  <FieldContent>
                    <Input placeholder="María" {...field} />
                    <FieldError errors={[formPrincipal.formState.errors.nombre]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={formPrincipal.control}
              name="apellidoPat"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. paterno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="García" {...field} />
                    <FieldError errors={[formPrincipal.formState.errors.apellidoPat]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={formPrincipal.control}
              name="apellidoMat"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Ap. materno</FieldLabel>
                  <FieldContent>
                    <Input placeholder="Ríos" {...field} />
                    <FieldError errors={[formPrincipal.formState.errors.apellidoMat]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={formPrincipal.control}
              name="documentoIdentidad"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Documento de identidad</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="DNI"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <FieldError errors={[formPrincipal.formState.errors.documentoIdentidad]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={formPrincipal.control}
              name="fechaNaci"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Fecha de nacimiento</FieldLabel>
                  <FieldContent>
                    <Input type="date" {...field} />
                    <FieldError errors={[formPrincipal.formState.errors.fechaNaci]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={formPrincipal.control}
              name="celular"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Celular</FieldLabel>
                  <FieldContent>
                    <Input placeholder="987654321" {...field} />
                    <FieldError errors={[formPrincipal.formState.errors.celular]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={formPrincipal.control}
              name="parentesco"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Parentesco</FieldLabel>
                  <FieldContent>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARENTESCOS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[formPrincipal.formState.errors.parentesco]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              control={formPrincipal.control}
              name="gmail"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Correo electrónico</FieldLabel>
                  <FieldContent>
                    <Input
                      type="email"
                      placeholder="apoderado@correo.com"
                      {...field}
                    />
                    <FieldError errors={[formPrincipal.formState.errors.gmail]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              control={formPrincipal.control}
              name="contraseña"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Contraseña</FieldLabel>
                  <FieldContent>
                    <Input
                      type="password"
                      placeholder="Mín 8: mayúscula, número y símbolo"
                      {...field}
                    />
                    <FieldError errors={[formPrincipal.formState.errors.contraseña]} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <Controller
            control={formPrincipal.control}
            name="direccion"
            render={({ field }) => (
              <Field>
                <FieldLabel>Dirección</FieldLabel>
                <FieldContent>
                  <Input placeholder="Opcional" {...field} />
                  <FieldError errors={[formPrincipal.formState.errors.direccion]} />
                </FieldContent>
              </Field>
            )}
          />
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Apoderado secundario</p>
          <p className="text-xs text-muted-foreground">Opcional, solo si aplica</p>
        </div>
        <Switch
          checked={haySecundario}
          onCheckedChange={(checked) => {
            setHaySecundario(checked)
            if (!checked) {
              setApoderadoSecSel(null)
              setBusquedaSec("")
            }
          }}
        />
      </div>

      {haySecundario && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Apoderado secundario</p>

          {apoderadoSecSel ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {apoderadoSecSel.nombre} {apoderadoSecSel.apellidoPat}{" "}
                  {apoderadoSecSel.apellidoMat}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {apoderadoSecSel.documentoIdentidad ?? "S/D"}
                  {apoderadoSecSel.parentesco ? ` · ${apoderadoSecSel.parentesco}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApoderadoSecSel(null)}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar apoderado secundario por DNI..."
                  value={busquedaSec}
                  onChange={(e) => setBusquedaSec(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarSecundario()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={buscarSecundario}
                  disabled={buscarApoderado.isPending}
                >
                  {buscarApoderado.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Search />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Controller
                  control={formSecundario.control}
                  name="nombre"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Nombres</FieldLabel>
                      <FieldContent>
                        <Input placeholder="María" {...field} />
                        <FieldError errors={[formSecundario.formState.errors.nombre]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={formSecundario.control}
                  name="apellidoPat"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Ap. paterno</FieldLabel>
                      <FieldContent>
                        <Input placeholder="García" {...field} />
                        <FieldError errors={[formSecundario.formState.errors.apellidoPat]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={formSecundario.control}
                  name="apellidoMat"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Ap. materno</FieldLabel>
                      <FieldContent>
                        <Input placeholder="Ríos" {...field} />
                        <FieldError errors={[formSecundario.formState.errors.apellidoMat]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                  control={formSecundario.control}
                  name="documentoIdentidad"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Documento de identidad</FieldLabel>
                      <FieldContent>
                        <Input
                          placeholder="DNI"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                        <FieldError errors={[formSecundario.formState.errors.documentoIdentidad]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={formSecundario.control}
                  name="fechaNaci"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Fecha de nacimiento</FieldLabel>
                      <FieldContent>
                        <Input type="date" {...field} />
                        <FieldError errors={[formSecundario.formState.errors.fechaNaci]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                  control={formSecundario.control}
                  name="celular"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Celular</FieldLabel>
                      <FieldContent>
                        <Input placeholder="987654321" {...field} />
                        <FieldError errors={[formSecundario.formState.errors.celular]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={formSecundario.control}
                  name="parentesco"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Parentesco</FieldLabel>
                      <FieldContent>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            {PARENTESCOS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[formSecundario.formState.errors.parentesco]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                  control={formSecundario.control}
                  name="gmail"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Correo electrónico</FieldLabel>
                      <FieldContent>
                        <Input
                          type="email"
                          placeholder="apoderado@correo.com"
                          {...field}
                        />
                        <FieldError errors={[formSecundario.formState.errors.gmail]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  control={formSecundario.control}
                  name="contraseña"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Contraseña</FieldLabel>
                      <FieldContent>
                        <Input
                          type="password"
                          placeholder="Mín 8: mayúscula, número y símbolo"
                          {...field}
                        />
                        <FieldError errors={[formSecundario.formState.errors.contraseña]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={formSecundario.control}
                name="direccion"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Dirección</FieldLabel>
                    <FieldContent>
                      <Input placeholder="Opcional" {...field} />
                      <FieldError errors={[formSecundario.formState.errors.direccion]} />
                    </FieldContent>
                  </Field>
                )}
              />
            </>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button type="button" onClick={handleSiguiente}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
