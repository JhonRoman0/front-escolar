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
const fechas = cargar("lib/edades")
const matricula = cargar("lib/schemas/matricula")
const { crearUsuarioSchema } = cargar("lib/schemas/seguridad")
const { crearDocenteSchema } = cargar("lib/schemas/academico")

test("el día del colegio es el de Lima, independientemente de UTC", () => {
  assert.equal(fechas.hoyNacimiento(new Date("2026-11-03T04:59:59Z")), "2026-11-02")
  assert.equal(fechas.hoyNacimiento(new Date("2026-11-03T05:00:00Z")), "2026-11-03")
})

test("alumno: límites inclusivos, fechas futuras y fecha real", () => {
  for (const fecha of ["2000-01-01", "2026-11-02"]) {
    assert.equal(fechas.errorNacimiento(fecha, "alumno", undefined, "2026-11-02"), null)
  }
  assert.match(fechas.errorNacimiento("1999-12-31", "alumno", undefined, "2026-11-02"), /01\/01\/2000/)
  assert.match(fechas.errorNacimiento("2026-11-03", "alumno", undefined, "2026-11-02"), /futura/)
  for (const fecha of ["2026-02-29", "2000-02-30", "2000-13-01", "0000-01-01", "2000-1-1"]) {
    assert.match(fechas.errorNacimiento(fecha, "alumno"), /válida/)
  }
  assert.match(fechas.errorNacimiento("", "alumno"), /obligatoria/)
})

test("adultos: cumpleaños completo, límites del calendario y errores prioritarios", () => {
  for (const hoy of ["2026-11-02", "2026-01-01", "2026-03-01", "2024-02-29"]) {
    const maximo = fechas.nacimientoMaximoAdulto(hoy)
    assert.equal(fechas.calcularEdad(maximo, hoy), 18)
    assert.equal(fechas.errorNacimiento(maximo, "adulto", undefined, hoy), null)
    const siguiente = new Date(`${maximo}T00:00:00Z`)
    siguiente.setUTCDate(siguiente.getUTCDate() + 1)
    assert.match(fechas.errorNacimiento(siguiente.toISOString().slice(0, 10), "adulto", undefined, hoy), /18 años/)
  }
  assert.equal(fechas.calcularEdad("2008-11-01", "2026-11-02"), 18)
  assert.equal(fechas.calcularEdad("2008-11-03", "2026-11-02"), 17)
  assert.match(fechas.errorNacimiento("2026-11-03", "adulto", undefined, "2026-11-02"), /futura/)
})

test("nacidos el 29/02 cumplen el 01/03 en años no bisiestos", () => {
  assert.match(fechas.errorNacimiento("2008-02-29", "adulto", undefined, "2026-02-28"), /18 años/)
  assert.equal(fechas.errorNacimiento("2008-02-29", "adulto", undefined, "2026-03-01"), null)
  assert.equal(fechas.nacimientoMaximoAdulto("2024-02-29"), "2006-02-28")
})

const alumno = { ...matricula.alumnoPasoDefault, documentoIdentidad: "12345678", nombre: "Ana",
  apellidoPat: "Ruiz", apellidoMat: "Perez", sexo: "F", direccion: "Calle Uno", fechaNacimiento: "1999-12-31" }
const apoderado = { ...matricula.apoderadoPasoDefault, estado: "NUEVO", documentoIdentidad: "87654321",
  nombre: "Ana", apellidoPat: "Ruiz", apellidoMat: "Perez", sexo: "F", direccion: "Calle Uno",
  celular: "987654321", gmail: "ana@example.com", idParentesco: 1, fechaNaci: "1980-01-01" }
const usuario = { nombre: "Ana", apellidoPat: "Ruiz", apellidoMat: "Perez", documentoIdentidad: "87654321",
  gmail: "ana@example.com", celular: "987654321", fechaNaci: "1980-01-01", rolIds: [1],
  restablecerContrasena: false, niveles: [1] }

test("alumno histórico: conservar fecha original no permite cambiarla por otra inválida", () => {
  assert.equal(matricula.alumnoPasoSchema.safeParse(alumno).success, false)
  const schema = matricula.crearAlumnoPasoSchema(alumno.fechaNacimiento)
  assert.equal(schema.safeParse(alumno).success, true)
  assert.equal(schema.safeParse({ ...alumno, fechaNacimiento: "1998-01-01" }).success, false)
})

test("principal y secundario nuevos validan la fecha y señalan el índice correcto", () => {
  for (const indice of [0, 1]) {
    const apoderados = [apoderado, { ...apoderado, documentoIdentidad: "11111111" }]
    apoderados[indice] = { ...apoderados[indice], fechaNaci: fechas.hoyNacimiento() }
    const resultado = matricula.apoderadosPasoSchema.safeParse({ apoderados })
    assert.equal(resultado.success, false)
    assert.ok(resultado.error.issues.some((error) => error.path.join(".") === `apoderados.${indice}.fechaNaci`))
  }
})

test("APODERADO y USUARIO reutilizados conservan su fecha sin exigir mayoría de edad", () => {
  for (const estado of ["APODERADO", "USUARIO"]) {
    assert.equal(matricula.apoderadosPasoSchema.safeParse({ apoderados: [{ ...apoderado, estado, fechaNaci: fechas.hoyNacimiento() }] }).success, true)
  }
})

test("editar apoderado: la excepción se limita a la misma persona y fecha", () => {
  const original = { ...apoderado, estado: "EDICION", fechaNaci: fechas.hoyNacimiento() }
  const schema = matricula.crearApoderadosPasoSchema(original)
  assert.equal(schema.safeParse({ apoderados: [original] }).success, true)
  for (const cambios of [{ documentoIdentidad: "11111111" }, { estado: "NUEVO" }, { fechaNaci: "9999-01-01" }]) {
    assert.equal(schema.safeParse({ apoderados: [{ ...original, ...cambios }] }).success, false)
  }
})

test("Usuarios y Docentes comparten mayoría de edad y excepción de fecha intacta", () => {
  for (const crear of [(original) => crearUsuarioSchema(false, original), crearDocenteSchema]) {
    assert.equal(crear().safeParse(usuario).success, true)
    const menor = { ...usuario, fechaNaci: fechas.hoyNacimiento() }
    assert.equal(crear().safeParse(menor).success, false)
    assert.equal(crear(menor.fechaNaci).safeParse(menor).success, true)
    assert.equal(crear(menor.fechaNaci).safeParse({ ...menor, fechaNaci: "9999-01-01" }).success, false)
    assert.equal(crear().safeParse({ ...usuario, fechaNaci: "2001-02-29" }).success, false)
  }
  // La nueva comprobación conserva las exigencias específicas del rol Docente.
  assert.equal(crearUsuarioSchema(true).safeParse(usuario).success, false)
  assert.equal(crearUsuarioSchema(true).safeParse({ ...usuario, gradoAcademicoId: 1,
    tipoContratoId: 1, fechaContratacion: "2026-01-01" }).success, true)
})
