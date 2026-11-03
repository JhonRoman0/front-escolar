import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const codigo = ts.transpileModule(readFileSync(new URL("../hooks/use-validar-dni-persona.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

function guardia({ validar = async () => {}, original, abierta = true } = {}) {
  const limpiezas = []
  const errores = []
  let validos = 0
  let pendiente = false
  const exports = {}
  vm.runInNewContext(codigo, {
    exports, Error,
    require: (nombre) => nombre === "react" ? {
      useRef: (current) => ({ current }),
      useCallback: (callback) => callback,
      useState: () => [false, (valor) => { pendiente = valor }],
      useEffect: (effect) => limpiezas.push(effect()),
    } : { REGEX_DNI: /^\d{8}$/ },
  })
  const hook = exports.useValidarDniPersona({ validar, original, abierta,
    onError: (error) => errores.push(error), onValido: () => validos++ })
  return { ...hook, errores, validos: () => validos, pendiente: () => pendiente,
    cerrar: () => limpiezas.forEach((limpieza) => limpieza?.()) }
}

function diferida() {
  let resolve, reject
  const promise = new Promise((ok, error) => { resolve = ok; reject = error })
  return { promise, resolve, reject }
}

test("un DNI incompleto y un formulario cerrado no consultan", async () => {
  let llamadas = 0
  const validar = async () => { llamadas++ }
  for (const dni of ["", "123", "1234567A"]) assert.equal(await guardia({ validar }).comprobar(dni), false)
  assert.equal(await guardia({ validar, abierta: false }).comprobar("12345678"), false)
  assert.equal(llamadas, 0)
})

test("DNI original intacto se conserva, pero una reactivación siempre consulta", async () => {
  let llamadas = 0
  const g = guardia({ original: "12345678", validar: async () => { llamadas++; throw new Error("DNI de alumno") } })
  assert.equal(await g.comprobar("12345678"), true)
  assert.equal(llamadas, 0)
  assert.equal(await g.comprobar("12345678", true), false)
  assert.deepEqual(g.errores, ["DNI de alumno"])
  assert.equal(llamadas, 1)
})

test("blur y guardar comparten la comprobación pendiente", async () => {
  const respuesta = diferida()
  let llamadas = 0
  const g = guardia({ validar: () => { llamadas++; return respuesta.promise } })
  const blur = g.comprobar("12345678")
  const guardar = g.comprobar("12345678")
  await Promise.resolve()
  assert.equal(llamadas, 1)
  assert.equal(g.pendiente(), true)
  respuesta.resolve()
  assert.equal(await blur, true)
  assert.equal(await guardar, true)
  assert.equal(g.pendiente(), false)
})

test("un cambio de DNI invalida tanto éxitos como errores anteriores", async () => {
  for (const falla of [false, true]) {
    const anterior = diferida()
    const g = guardia({ validar: (dni) => dni === "12345678" ? anterior.promise : Promise.resolve() })
    const vieja = g.comprobar("12345678")
    const sigueVigente = g.capturarVigencia()
    g.invalidar()
    assert.equal(sigueVigente(), false)
    assert.equal(await g.comprobar("87654321"), true)
    if (falla) anterior.reject(new Error("Error anterior"))
    else anterior.resolve()
    assert.equal(await vieja, false)
    assert.equal(g.validos(), 1)
    assert.deepEqual(g.errores, [])
    assert.equal(g.pendiente(), false)
  }
})

test("cerrar invalida respuestas internas y autocompletados pendientes", async () => {
  const respuesta = diferida()
  const g = guardia({ validar: () => respuesta.promise })
  const consulta = g.comprobar("12345678")
  const vigente = g.capturarVigencia()
  g.cerrar()
  respuesta.resolve()
  assert.equal(await consulta, false)
  assert.equal(vigente(), false)
  assert.equal(g.validos(), 0)
})

test("un error de red no habilita el guardado y permite reintentar", async () => {
  let llamadas = 0
  const g = guardia({ validar: () => {
    llamadas++
    if (llamadas === 1) throw new Error("Sin conexión")
    return Promise.resolve()
  } })
  assert.equal(await g.comprobar("12345678"), false)
  assert.equal(g.pendiente(), false)
  assert.equal(await g.comprobar("12345678"), true)
  assert.deepEqual(g.errores, ["Sin conexión"])
})

test("guardar vuelve a comprobar: los éxitos anteriores no son una autorización permanente", async () => {
  let llamadas = 0
  const g = guardia({ validar: async () => {
    if (++llamadas > 1) throw new Error("Ahora está registrado")
  } })
  assert.equal(await g.comprobar("12345678"), true)
  assert.equal(await g.comprobar("12345678"), false)
  assert.equal(llamadas, 2)
})

test("la confirmación de reactivación conserva el modal ante rechazo interno o del guardado", async () => {
  function funcion(ruta, nombre) {
    const fuente = readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8")
    const ast = ts.createSourceFile(ruta, fuente, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let texto
    function visitar(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === nombre) texto = node.getText(ast)
      ts.forEachChild(node, visitar)
    }
    visitar(ast)
    assert.ok(texto, nombre)
    return texto
  }
  const handlers = ts.transpileModule([
    funcion("components/seguridad/usuario-form-dialog.tsx", "handleConfirmarReactivacion"),
    funcion("components/seguridad/confirmar-eliminar.tsx", "handleConfirm"),
  ].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  for (const internaValida of [false, true]) {
    let cerrado = false
    let cargando = false
    let guardados = 0
    const mensajes = []
    const contexto = vm.createContext({
      Error,
      reactivacion: { idUsuario: 1, request: { documentoIdentidad: "12345678" } },
      comprobacionDni: { comprobar: async () => internaValida, capturarVigencia: () => () => true },
      form: { getFieldState: () => ({ error: { message: "DNI incompatible" } }) },
      reactivar: { mutateAsync: async () => { guardados++; throw new Error("DNI incompatible") } },
      toast: { error: (mensaje) => mensajes.push(mensaje), loading: () => 1 },
      setOpen: () => { cerrado = true }, setCargando: (valor) => { cargando = valor },
    })
    vm.runInContext(handlers + "\nconst onConfirm = handleConfirmarReactivacion", contexto)
    await vm.runInContext("handleConfirm()", contexto)
    assert.equal(cerrado, false)
    assert.equal(cargando, false)
    assert.equal(guardados, internaValida ? 1 : 0)
    assert.deepEqual(mensajes, ["DNI incompatible"])
  }
})
