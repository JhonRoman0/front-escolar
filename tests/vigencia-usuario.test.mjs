import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const requireModule = createRequire(import.meta.url)
const cache = new Map()
function cargar(ruta) {
  if (cache.has(ruta)) return cache.get(ruta)
  const exports = {}
  const fuente = readFileSync(new URL(`../${ruta}.ts`, import.meta.url), "utf8")
  vm.runInNewContext(ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports,
    require: (nombre) => nombre.startsWith("@/") ? cargar(nombre.slice(2)) : requireModule(nombre),
  })
  cache.set(ruta, exports)
  return exports
}

const fechas = cargar("lib/fechas")
const edades = cargar("lib/edades")
const vigencia = cargar("lib/vigencia")
const sesion = cargar("lib/sesion-bloqueada")
const { crearUsuarioSchema } = cargar("lib/schemas/seguridad")

function hoyEnLima() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value
  return `${valor("year")}-${valor("month")}-${valor("day")}`
}

test("el inicio por defecto es hoy en Lima", () => {
  assert.equal(vigencia.inicioVigenciaPorDefecto(), hoyEnLima())
  assert.equal(vigencia.validarFechaISO(hoyEnLima()), true)
  for (const fecha of ["2026-02-30", "2026-13-01", "2026-1-01", "", null]) {
    assert.equal(vigencia.validarFechaISO(fecha), false)
  }
})

test("vigencia con fin: hoy, límite inclusivo y rango válido", () => {
  const hoy = fechas.fechaHoyISO()
  assert.equal(vigencia.errorVigencia({
    inicio: hoy,
    fin: hoy,
    indefinida: false,
  }), null)
  assert.equal(vigencia.errorVigencia({
    inicio: "2026-01-01",
    fin: "2026-01-02",
    indefinida: false,
  }), null)
})

test("vigencia indefinida: fin vacío o nulo", () => {
  for (const fin of [null, undefined, ""]) {
    assert.equal(vigencia.errorVigencia({
      inicio: "2026-01-01",
      fin,
      indefinida: true,
    }), null)
  }
})

test("vigencia inválida: inicio posterior al fin, fin obligatorio y fin con indefinida", () => {
  assert.match(vigencia.errorVigencia({
    inicio: "2026-02-02",
    fin: "2026-02-01",
    indefinida: false,
  }), /posterior/)
  assert.match(vigencia.errorVigencia({
    inicio: "2026-01-01",
    indefinida: false,
  }), /obligatoria/)
  assert.match(vigencia.errorVigencia({
    inicio: "2026-01-01",
    fin: "",
    indefinida: false,
  }), /obligatoria/)
  assert.match(vigencia.errorVigencia({
    inicio: "2026-01-01",
    fin: "2026-12-31",
    indefinida: true,
  }), /indefinida/)
  assert.match(vigencia.errorVigencia({ inicio: "", indefinida: true }), /inicio/)
})

test("códigos de vigencia se convierten a estados y bloquean la sesión", () => {
  assert.equal(vigencia.codigoVigenciaAEstado("VIGENCIA_NO_INICIADA"), "NO_INICIADA")
  assert.equal(vigencia.codigoVigenciaAEstado("VIGENCIA_VENCIDA"), "VENCIDA")
  assert.equal(vigencia.codigoVigenciaAEstado("VIGENCIA_VIGENTE"), "VIGENTE")
  assert.equal(vigencia.codigoVigenciaAEstado("VIGENCIA_INDEFINIDA"), "INDEFINIDA")
  assert.equal(vigencia.codigoVigenciaAEstado("CAMBIO_CONTRASENA_REQUERIDO"), undefined)
  assert.equal(vigencia.esEstadoVigenciaValido("NO_INICIADA"), true)
  assert.equal(vigencia.esEstadoVigenciaValido("OTRO"), false)
  assert.equal(vigencia.esCodigoBloqueoVigencia("VIGENCIA_VENCIDA"), true)
  assert.equal(vigencia.esCodigoBloqueoVigencia("CAMBIO_CONTRASENA_REQUERIDO"), false)
  for (const codigo of ["VIGENCIA_NO_INICIADA", "VIGENCIA_VENCIDA", "VIGENCIA_CUALQUIERA", "CAMBIO_CONTRASENA_REQUERIDO"]) {
    assert.equal(vigencia.esCodigoBloqueoSesion(codigo), true)
    assert.equal(sesion.esCodigoBloqueoSesion(codigo), true)
  }
  assert.equal(vigencia.esCodigoBloqueoSesion("USUARIO_INACTIVO"), false)
})

test("el estado efectivo evalúa primero los datos inválidos y el inicio", () => {
  const hoy = "2026-11-21"
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: "2026-11-22", fin: null, hoy }), "NO_INICIADA")
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: "2026-11-22", fin: "2026-12-01", hoy }), "NO_INICIADA")
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: null, fin: null, hoy }), "VENCIDA")
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: "2026-12-01", fin: "2026-11-30", hoy }), "VENCIDA")
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: "2026-11-20", fin: null, hoy }), "INDEFINIDA")
  assert.equal(vigencia.estadoVigenciaEfectivo({ inicio: "2026-11-20", fin: hoy, hoy }), "VIGENTE")
})

test("token obsoleto y vigencia no disponible no comparten tratamiento", () => {
  const codigos = vigencia.CODIGOS_VIGENCIA
  assert.equal(vigencia.esCodigoSesionObsoleta(codigos.TOKEN_OBSOLETO), true)
  assert.equal(vigencia.esCodigoBloqueoVigencia(codigos.TOKEN_OBSOLETO), false)
  assert.equal(vigencia.esCodigoBloqueoSesion(codigos.TOKEN_OBSOLETO), true)
  assert.equal(vigencia.esCodigoBloqueoVigencia(codigos.NO_DISPONIBLE), true)
  assert.equal(vigencia.tituloBloqueoVigencia(codigos.NO_DISPONIBLE), "No se pudo verificar la vigencia")
  assert.equal(vigencia.MENSAJE_NO_DISPONIBLE, "No se pudo verificar la vigencia de su cuenta.")
})

test("el esquema exige fin cuando no es indefinida y lo prohíbe cuando sí lo es", () => {
  const base = {
    nombre: "Ana",
    apellidoPat: "Ruiz",
    apellidoMat: "Perez",
    documentoIdentidad: "87654321",
    gmail: "ana@example.com",
    celular: "987654321",
    fechaNaci: edades.nacimientoMaximoAdulto(),
    rolIds: [1],
    restablecerContrasena: false,
    niveles: [1],
    fechaInicioVigencia: "2026-01-01",
    vigenciaIndefinida: false,
  }
  const esquema = crearUsuarioSchema(false)
  assert.equal(esquema.safeParse({ ...base, fechaFinVigencia: "2026-12-31" }).success, true)
  assert.equal(esquema.safeParse({
    ...base,
    fechaFinVigencia: null,
    vigenciaIndefinida: true,
  }).success, true)
  assert.equal(esquema.safeParse({
    ...base,
    fechaFinVigencia: "",
    vigenciaIndefinida: true,
  }).success, true)

  const sinFin = esquema.safeParse({ ...base, fechaFinVigencia: "" })
  assert.equal(sinFin.success, false)
  assert.ok(sinFin.error.issues.some((issue) => issue.path.join(".") === "fechaFinVigencia"))

  const conFinIndefinida = esquema.safeParse({
    ...base,
    fechaFinVigencia: "2026-12-31",
    vigenciaIndefinida: true,
  })
  assert.equal(conFinIndefinida.success, false)
  assert.ok(conFinIndefinida.error.issues.some((issue) => issue.path.join(".") === "fechaFinVigencia"))

  const invertido = esquema.safeParse({ ...base, fechaFinVigencia: "2025-12-31" })
  assert.equal(invertido.success, false)
  assert.ok(invertido.error.issues.some((issue) => issue.path.join(".") === "fechaFinVigencia"))

  const sinInicio = esquema.safeParse({
    ...base,
    fechaInicioVigencia: "",
    fechaFinVigencia: "2026-12-31",
  })
  assert.equal(sinInicio.success, false)
  assert.ok(sinInicio.error.issues.some((issue) => issue.path.join(".") === "fechaInicioVigencia"))
})
