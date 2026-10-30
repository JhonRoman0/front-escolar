import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Ejecuta los handlers reales sin añadir dependencias ni montar la interfaz.
const requireModule = createRequire(import.meta.url)
const moduleCache = new Map()
function cargarSchema(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath)
  const exports = {}
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8")
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports,
    require: (name) => name.startsWith("@/")
      ? cargarSchema(`${name.slice(2)}.ts`)
      : requireModule(name),
  })
  moduleCache.set(relativePath, exports)
  return exports
}
const { apoderadoPasoDefault, apoderadosPasoSchema } = cargarSchema("lib/schemas/matricula.ts")
const { REGEX_DNI } = cargarSchema("lib/schemas/comun.ts")
const source = readFileSync(new URL("../components/matricula/paso-apoderado.tsx", import.meta.url), "utf8")
const ast = ts.createSourceFile("paso-apoderado.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const handlers = []
let cleanupSource
function visitar(node) {
  if (ts.isFunctionDeclaration(node) && [
    "apoderadoDesdeBusqueda", "sigueVigente", "comprobarInternamente", "handleBuscar", "handleCambiarDni",
  ].includes(node.name?.text)) handlers.push(node.getText(ast))
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") {
    cleanupSource = `(${node.arguments[0].getText(ast)})()`
  }
  ts.forEachChild(node, visitar)
}
visitar(ast)
assert.equal(handlers.length, 5)
assert.ok(cleanupSource)
const codigo = ts.transpileModule(handlers.join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText

function pendiente() {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
function respuesta(estado = "NUEVO", dni = "12345678") {
  return { estado, documentoIdentidad: dni, hijos: [], idParentesco: null }
}
function formulario({ valores = {}, buscar, consultar, indice = 0 } = {}) {
  const base = `apoderados.${indice}`
  let datos = { ...structuredClone(apoderadoPasoDefault), documentoIdentidad: "12345678", ...valores }
  const errores = new Map()
  const llamadas = { internas: 0, externas: 0 }
  const context = {
    exports: {},
    Error, REGEX_DNI, apoderadoPasoDefault, idAlumno: 42, base,
    version: { current: 0 }, consultaExterna: { current: 0 }, comprobacion: { current: null },
    edicionesNombres: { current: { nombre: 0, apellidoPat: 0, apellidoMat: 0 } },
    consultando: false,
    form: {
      formState: { isSubmitted: false },
      getValues: (path) => path === base ? datos : datos[path.slice(base.length + 1)],
      setValue: (path, value) => {
        if (path === base) datos = value
        else datos[path.slice(base.length + 1)] = value
      },
      clearErrors: (path) => { if (path === base) errores.clear(); else errores.delete(path) },
      setError: (path, error) => errores.set(path, error),
      trigger: async () => true,
    },
    buscar: { mutateAsync: async (request) => {
      llamadas.internas++
      assert.equal(request.idAlumno, 42)
      return buscar ? buscar(request) : respuesta("NUEVO", request.dni)
    } },
    consultarDni: { mutateAsync: async (dni) => {
      llamadas.externas++
      return consultar ? consultar(dni) : {
        dni, nombres: "Maria", apellidoPaterno: "Lopez", apellidoMaterno: "Perez", origen: "RENIEC",
      }
    } },
  }
  for (const campo of ["Comprobando", "Consultando", "AvisoConsulta"]) {
    context[`set${campo}`] = (valor) => { context[campo[0].toLowerCase() + campo.slice(1)] = valor }
  }
  vm.createContext(context)
  vm.runInContext(codigo, context)
  return { context, llamadas, errores, datos: () => datos, desmontar: vm.runInContext(cleanupSource, context) }
}

test("la comprobación interna no consulta RENIEC ni borra los datos manuales", async () => {
  const f = formulario({ valores: { nombre: "Ana", gmail: "ana@colegio.pe", idParentesco: 2 } })
  assert.equal(await f.context.comprobarInternamente(), "NUEVO")
  assert.equal(f.datos().nombre, "Ana")
  assert.equal(f.datos().gmail, "ana@colegio.pe")
  assert.equal(f.datos().idParentesco, 2)
  assert.equal(f.llamadas.externas, 0)
})

test("un DNI inválido no inicia ninguna consulta", async () => {
  const f = formulario({ valores: { documentoIdentidad: "123" } })
  assert.equal(await f.context.comprobarInternamente(), null)
  await f.context.handleBuscar()
  assert.equal(f.llamadas.internas, 0)
  assert.equal(f.llamadas.externas, 0)
})

test("blur y lupa comparten la misma comprobación interna", async () => {
  const busqueda = pendiente()
  const f = formulario({ buscar: () => busqueda.promise })
  const blur = f.context.comprobarInternamente()
  const lupa = f.context.handleBuscar()
  assert.equal(f.context.comprobarInternamente(), blur)
  assert.equal(f.llamadas.internas, 1)
  busqueda.resolve(respuesta())
  await Promise.all([blur, lupa])
  assert.equal(f.llamadas.externas, 1)
  await f.context.comprobarInternamente()
  assert.equal(f.llamadas.internas, 1)
})

test("el error interno bloquea la clasificación y permite reintentar", async () => {
  let fallar = true
  const f = formulario({ buscar: () => { if (fallar) throw new Error("Servicio interno no disponible"); return respuesta() } })
  await f.context.handleBuscar()
  assert.equal(f.datos().estado, "")
  assert.equal(f.context.comprobando, false)
  assert.ok(f.errores.has("apoderados.0.documentoIdentidad"))
  assert.equal(f.llamadas.externas, 0)
  fallar = false
  await f.context.handleBuscar()
  assert.equal(f.datos().estado, "NUEVO")
  assert.equal(f.errores.size, 0)
})

test("una respuesta interna incompleta no equivale a persona nueva", async () => {
  const f = formulario({ buscar: () => ({ ...respuesta(), estado: undefined }) })
  await f.context.handleBuscar()
  assert.equal(f.datos().estado, "")
  assert.equal(f.llamadas.externas, 0)
  assert.equal(f.errores.size, 1)
})

test("el secundario verifica y completa sus propios campos", async () => {
  const principal = formulario({ valores: { nombre: "Principal" } })
  const secundario = formulario({ indice: 1, valores: { documentoIdentidad: "87654321" } })
  await secundario.context.handleBuscar()
  assert.equal(secundario.datos().estado, "NUEVO")
  assert.equal(secundario.datos().nombre, "Maria")
  assert.equal(principal.datos().nombre, "Principal")
  assert.equal(principal.datos().estado, "")
  assert.equal(principal.llamadas.internas, 0)
})

test("una respuesta de otro DNI no verifica ni autocompleta al actual", async () => {
  const interna = formulario({ buscar: () => respuesta("APODERADO", "87654321") })
  await interna.context.comprobarInternamente()
  assert.equal(interna.datos().estado, "")
  assert.equal(interna.errores.size, 1)
  const externa = formulario({ consultar: () => ({ dni: "87654321", nombres: "Otra", origen: "RENIEC" }) })
  await externa.context.handleBuscar()
  assert.equal(externa.datos().estado, "NUEVO")
  assert.equal(externa.datos().nombre, "")
  assert.match(externa.context.avisoConsulta, /manualmente/)
})

for (const estado of ["APODERADO", "USUARIO"]) {
  test(`reutiliza ${estado}, conserva parentesco y no consulta RENIEC`, async () => {
    const f = formulario({ valores: { nombre: "Borrador", idParentesco: 3 }, buscar: () => ({
      ...respuesta(estado), nombre: "Registrada", apellidoPat: "Lopez", apellidoMat: "Perez",
    }) })
    await f.context.handleBuscar()
    assert.equal(f.datos().estado, estado)
    assert.equal(f.datos().nombre, "Registrada")
    assert.equal(f.datos().idParentesco, 3)
    assert.equal(f.llamadas.externas, 0)
  })
}

test("USUARIO conserva el contacto manual si la respuesta no lo aporta", async () => {
  const f = formulario({ valores: { sexo: "F", celular: "987654321", direccion: "Av. Uno" }, buscar: () => respuesta("USUARIO") })
  await f.context.comprobarInternamente()
  assert.equal(f.datos().sexo, "F")
  assert.equal(f.datos().celular, "987654321")
  assert.equal(f.datos().direccion, "Av. Uno")
})

test("RENIEC fallido, no encontrado o deshabilitado no invalida la comprobación interna", async () => {
  for (const message of ["404", "API no configurada", "Error externo"]) {
    const f = formulario({ valores: { nombre: "Manual" }, consultar: () => { throw new Error(message) } })
    await f.context.handleBuscar()
    assert.equal(f.datos().estado, "NUEVO")
    assert.equal(f.datos().nombre, "Manual")
    assert.equal(f.errores.size, 0)
    assert.equal(f.context.consultando, false)
    assert.match(f.context.avisoConsulta, /manualmente/)
  }
})

test("la consulta externa pendiente permite validar datos manuales", async () => {
  const externa = pendiente()
  const valores = { nombre: "Ana", apellidoPat: "Lopez", apellidoMat: "Perez", fechaNaci: "1980-01-01",
    sexo: "F", celular: "987654321", direccion: "Av. Uno", gmail: "ana@example.com", contraseña: "Segura123!", idParentesco: 1 }
  const f = formulario({ valores, consultar: () => externa.promise })
  const consulta = f.context.handleBuscar()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(f.context.consultando, true)
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [f.datos()] }).success, true)
  externa.reject(new Error("Timeout"))
  await consulta
})

test("autocompleta solo nombres vacíos sin cambios durante la consulta", async () => {
  const externa = pendiente()
  const f = formulario({ consultar: () => externa.promise })
  const consulta = f.context.handleBuscar()
  await new Promise((resolve) => setImmediate(resolve))
  f.context.form.setValue("apoderados.0.nombre", "Manual")
  f.context.edicionesNombres.current.nombre++
  // También debe respetar un campo que se escribió y se volvió a vaciar.
  f.context.edicionesNombres.current.apellidoPat += 2
  externa.resolve({ dni: "12345678", nombres: "Consulta", apellidoPaterno: "Externo", apellidoMaterno: "Perez", origen: "CACHE" })
  await consulta
  assert.equal(f.datos().nombre, "Manual")
  assert.equal(f.datos().apellidoPat, "")
  assert.equal(f.datos().apellidoMat, "Perez")
  assert.match(f.context.avisoConsulta, /caché/)
})

test("no sobrescribe nombres manuales anteriores a la consulta", async () => {
  const f = formulario({ valores: { nombre: "Ana" } })
  await f.context.handleBuscar()
  assert.equal(f.datos().nombre, "Ana")
  assert.equal(f.datos().apellidoPat, "Lopez")
})

test("las respuestas internas fuera de orden no cambian el DNI actual", async () => {
  const anterior = pendiente()
  const f = formulario({ buscar: ({ dni }) => dni === "12345678" ? anterior.promise : respuesta("USUARIO", dni) })
  const consultaAnterior = f.context.comprobarInternamente()
  f.context.handleCambiarDni("87654321")
  await f.context.comprobarInternamente()
  anterior.resolve({ ...respuesta("APODERADO"), nombre: "Anterior" })
  await consultaAnterior
  assert.equal(f.datos().documentoIdentidad, "87654321")
  assert.equal(f.datos().estado, "USUARIO")
  assert.notEqual(f.datos().nombre, "Anterior")
})

test("una respuesta externa anterior no sobrescribe el nuevo formulario", async () => {
  const externa = pendiente()
  const f = formulario({ consultar: () => externa.promise })
  const consulta = f.context.handleBuscar()
  await new Promise((resolve) => setImmediate(resolve))
  f.context.handleCambiarDni("87654321")
  f.context.form.setValue("apoderados.0.nombre", "Otra persona")
  externa.resolve({ dni: "12345678", nombres: "Anterior", origen: "RENIEC" })
  await consulta
  assert.equal(f.datos().nombre, "Otra persona")
  assert.equal(f.datos().estado, "")
  assert.equal(f.context.avisoConsulta, "")
})

test("desmontar invalida respuestas pendientes internas y externas", async () => {
  const interna = pendiente()
  const f = formulario({ buscar: () => interna.promise })
  const consulta = f.context.comprobarInternamente()
  f.desmontar()
  interna.resolve(respuesta())
  await consulta
  assert.equal(f.datos().estado, "")

  const externa = pendiente()
  const g = formulario({ consultar: () => externa.promise })
  const autocompletar = g.context.handleBuscar()
  await new Promise((resolve) => setImmediate(resolve))
  g.desmontar()
  externa.resolve({ dni: "12345678", nombres: "Tardio", origen: "RENIEC" })
  await autocompletar
  assert.equal(g.datos().nombre, "")
})

test("los errores antiguos no reemplazan un resultado interno nuevo", async () => {
  const anterior = pendiente()
  const f = formulario({ buscar: ({ dni }) => dni === "12345678" ? anterior.promise : respuesta("NUEVO", dni) })
  const consulta = f.context.comprobarInternamente()
  f.context.handleCambiarDni("87654321")
  await f.context.comprobarInternamente()
  anterior.reject(new Error("Error anterior"))
  await consulta
  assert.equal(f.datos().estado, "NUEVO")
  assert.equal(f.errores.size, 0)
})

test("el schema exige la comprobación interna y conserva las reglas de persona nueva", () => {
  const nuevo = { ...structuredClone(apoderadoPasoDefault), documentoIdentidad: "12345678", nombre: "Ana",
    apellidoPat: "Lopez", apellidoMat: "Perez", fechaNaci: "1980-01-01", sexo: "F", celular: "987654321",
    direccion: "Av. Uno", gmail: "ana@example.com", contraseña: "Segura123!", idParentesco: 1 }
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [nuevo] }).success, false)
  nuevo.estado = "NUEVO"
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [nuevo] }).success, true)
  for (const [campo, valor] of [["documentoIdentidad", "123"], ["gmail", "incorrecto"], ["contraseña", "123"],
    ["idParentesco", 0], ["celular", "12"], ["fechaNaci", ""], ["nombre", "Ana1"], ["direccion", ""], ["sexo", ""]]) {
    assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [{ ...nuevo, [campo]: valor }] }).success, false, campo)
  }
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [nuevo, { ...nuevo }] }).success, false)
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [nuevo, { ...nuevo, documentoIdentidad: "87654321" }] }).success, true)
})

test("APODERADO requiere parentesco y USUARIO requiere contacto, sin credenciales nuevas", () => {
  const base = { ...structuredClone(apoderadoPasoDefault), documentoIdentidad: "12345678", idParentesco: 1 }
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [{ ...base, estado: "APODERADO" }] }).success, true)
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [{ ...base, estado: "APODERADO", idParentesco: 0 }] }).success, false)
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [{ ...base, estado: "USUARIO" }] }).success, false)
  assert.equal(apoderadosPasoSchema.safeParse({ apoderados: [{ ...base, estado: "USUARIO", sexo: "F", direccion: "Av. Uno", celular: "987654321" }] }).success, true)
})
