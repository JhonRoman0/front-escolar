import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

// Se ejercitan los handlers y expresiones de producción, sin dependencias nuevas.
const source = readFileSync(new URL("../components/pagos/montos-matricula-tab.tsx", import.meta.url), "utf8")
const ast = ts.createSourceFile("montos.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const declaraciones = {}
const handlers = []
const propsConfirmacion = {}
function visitar(node) {
  if (ts.isFunctionDeclaration(node) && ["handleGuardar", "confirmarGuardado"].includes(node.name?.text)) {
    handlers.push(node.getText(ast))
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    declaraciones[node.name.text] = node.initializer.getText(ast)
  }
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "ConfirmarEliminar") {
    for (const prop of node.attributes.properties) {
      if (ts.isJsxAttribute(prop) && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
        propsConfirmacion[prop.name.text] = prop.initializer.expression.getText(ast)
      }
    }
  }
  ts.forEachChild(node, visitar)
}
visitar(ast)
assert.equal(handlers.length, 2)
const codigo = ts.transpileModule(handlers.join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText
const sharedSource = readFileSync(new URL("../components/seguridad/confirmar-eliminar.tsx", import.meta.url), "utf8")
const sharedAst = ts.createSourceFile("confirmar.tsx", sharedSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let sharedHandler
let sharedComponent
function visitarConfirmacion(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "handleConfirm") sharedHandler = node.getText(sharedAst)
  if (ts.isFunctionDeclaration(node) && node.name?.text === "ConfirmarEliminar") sharedComponent = node.getText(sharedAst)
  ts.forEachChild(node, visitarConfirmacion)
}
visitarConfirmacion(sharedAst)
assert.ok(sharedHandler)
assert.ok(sharedComponent)
const contenidoJs = ts.transpileModule(`(${propsConfirmacion.contenido})`, {
  fileName: "contenido.tsx",
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText

function diferida() {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const niveles = [
  { idNivel: 11, nivel: "Inicial", monto: 100, sugerido: null },
  { idNivel: 22, nivel: "Primaria", monto: 200, sugerido: null },
  { idNivel: 33, nivel: "Secundaria", monto: 300, sugerido: null },
]
function formulario({ montos = niveles, mutate } = {}) {
  const llamadas = [], errores = [], exitos = [], cierres = []
  const context = {
    React,
    idAnio: 77, anioTexto: "2035 · Por comenzar", anioCerrado: false, puedeActualizar: true,
    montos: structuredClone(montos), guardados: structuredClone(montos),
    valores: Object.fromEntries(montos.map((m) => [m.idNivel, String(m.monto ?? m.sugerido ?? "")])),
    pendiente: null, envio: { current: null },
    guardar: { isPending: false, mutateAsync: async (request) => {
      llamadas.push(structuredClone(request))
      if (mutate) return mutate(request)
      return request.montos.map((m) => ({ ...m, nivel: montos.find((n) => n.idNivel === m.idNivel)?.nivel, sugerido: null }))
    } },
    toast: { error: (message) => errores.push(message), success: (message) => exitos.push(message) },
    setPendiente: (value) => { context.pendiente = value },
    setGuardados: (value) => { context.guardados = value },
    setValores: (value) => { context.valores = value },
    setCargando: (value) => { context.cargando = value },
    setOpen: (open) => { cierres.push(open); context.cancelar(open) },
  }
  vm.createContext(context)
  for (const name of ["editable", "hayCambios", "copiados"]) {
    Object.defineProperty(context, name, { get: () => vm.runInContext(declaraciones[name], context) })
  }
  vm.runInContext(codigo, context)
  context.cancelar = vm.runInContext(`(${propsConfirmacion.onOpenChange})`, context)
  context.onConfirm = context.confirmarGuardado
  vm.runInContext(sharedHandler, context)
  const descripcion = () => vm.runInContext(propsConfirmacion.descripcion, context)
  const contenido = () => vm.runInContext(contenidoJs, context)
  return {
    context, llamadas, errores, exitos, cierres, descripcion, contenido,
    resumen: () => `${descripcion()} ${renderToStaticMarkup(contenido())}`,
  }
}

test("sin cambios y con formatos numéricos equivalentes no abre confirmación", () => {
  const f = formulario()
  f.context.valores[11] = "100.00"
  f.context.valores[22] = "0200.0"
  assert.equal(f.context.hayCambios, false)
  f.context.handleGuardar()
  assert.equal(f.context.pendiente, null)
  assert.equal(f.llamadas.length, 0)
  f.context.valores[11] = "120"
  assert.equal(f.context.hayCambios, true)
  f.context.valores[11] = "100"
  assert.equal(f.context.hayCambios, false)
})

test("permite aplicar sugerencias sin editarlas, comparando con lo persistido", async () => {
  const f = formulario({ montos: niveles.map((m) => ({ ...m, sugerido: m.monto, monto: null })) })
  assert.equal(f.context.copiados, true)
  assert.equal(f.context.hayCambios, true)
  f.context.handleGuardar()
  assert.ok(f.context.pendiente)
  assert.equal(f.llamadas.length, 0)
  await f.context.handleConfirm()
  assert.equal(f.llamadas.length, 1)
  assert.equal(f.context.hayCambios, false)
  assert.equal(f.context.copiados, false)
})

test("los campos vacíos sin montos guardados no son cambios ni ceros válidos", () => {
  const f = formulario({ montos: [{ idNivel: 11, nivel: "Inicial", monto: null, sugerido: null }] })
  assert.equal(f.context.hayCambios, false)
  f.context.handleGuardar()
  assert.equal(f.context.pendiente, null)
  f.context.valores[11] = "0"
  assert.equal(f.context.hayCambios, true)
  f.context.handleGuardar()
  assert.equal(f.context.pendiente, null)
  assert.equal(f.errores.length, 1)
})

test("rechaza vacíos, ceros, negativos, no finitos e importes inferiores al mínimo", () => {
  for (const value of ["", " ", "0", "-1", "NaN", "Infinity", "0.001"]) {
    const f = formulario()
    f.context.valores[22] = value
    f.context.handleGuardar()
    assert.equal(f.context.pendiente, null, value)
    assert.equal(f.llamadas.length, 0, value)
    assert.equal(f.errores.length, 1, value)
    assert.match(f.errores[0], /Primaria/)
  }
})

test("admite el mínimo sin redondear otros decimales válidos", () => {
  const f = formulario()
  f.context.valores[11] = "0.01"
  f.context.valores[22] = "200.125"
  f.context.handleGuardar()
  assert.equal(f.context.pendiente.montos[0].monto, 0.01)
  assert.equal(f.context.pendiente.montos[1].monto, 200.125)
  assert.match(f.resumen(), /200[.,]125/)
})

test("el resumen usa el año, los nombres y todos los niveles reales", () => {
  const f = formulario({ montos: [niveles[1], { idNivel: 99, nivel: "Nivel adicional", monto: 400, sugerido: null }] })
  f.context.valores[22] = "210"
  f.context.handleGuardar()
  const resumen = f.resumen()
  assert.match(resumen, /2035 · Por comenzar/)
  assert.match(resumen, /Primaria/)
  assert.match(resumen, /Nivel adicional/)
  assert.doesNotMatch(resumen, /Inicial|Secundaria/)
  assert.equal(f.context.pendiente.montos.length, 2)
  assert.match(f.descripcion(), /2035 · Por comenzar/)
  assert.doesNotMatch(f.descripcion(), /Primaria|Nivel adicional/)
  const lista = f.contenido()
  assert.equal(lista.type, "dl")
  const filas = React.Children.toArray(lista.props.children)
  assert.equal(filas.length, 2)
  const celdas = filas.map((fila) => React.Children.toArray(fila.props.children))
  assert.deepEqual(celdas.map(([nombre]) => nombre.type), ["dt", "dt"])
  assert.deepEqual(celdas.map(([nombre]) => nombre.props.children), ["Primaria", "Nivel adicional"])
  assert.deepEqual(celdas.map(([, importe]) => importe.type), ["dd", "dd"])
  assert.match(celdas[0][1].props.children, /210[.,]00/)
})

test("la lista mantiene nombres largos e importes sin redondearlos", () => {
  const nombre = "Nivel con un nombre extenso para comprobar la distribución responsive"
  const f = formulario({ montos: [{ idNivel: 91, nivel: nombre, monto: 50, sugerido: null }] })
  f.context.valores[91] = "51.12345"
  f.context.handleGuardar()
  const [fila] = React.Children.toArray(f.contenido().props.children)
  const [nivel, importe] = React.Children.toArray(fila.props.children)
  assert.equal(nivel.props.children, nombre)
  assert.match(importe.props.children, /51[.,]12345/)
  assert.match(nivel.props.className, /break-words/)
  assert.match(importe.props.className, /text-right/)
})

test("la confirmación compartida conserva su estructura sin contenido opcional", () => {
  const context = { React, exports: {}, useState: (value) => [value, () => {}] }
  for (const tag of ["Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription",
    "DialogFooter", "DialogTrigger", "Button", "Trash2", "Loader2"]) context[tag] = tag
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(sharedComponent, {
    fileName: "confirmacion.tsx",
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, context)
  const props = { titulo: "Confirmar", descripcion: "Descripción existente", open: true, onConfirm: async () => {} }
  const sinContenido = context.exports.ConfirmarEliminar(props)
  const [popup] = React.Children.toArray(sinContenido.props.children)
  const bloques = React.Children.toArray(popup.props.children)
  assert.deepEqual(bloques.map((b) => b.type), ["DialogHeader", "DialogFooter"])
  const [, descripcion] = React.Children.toArray(bloques[0].props.children)
  assert.equal(descripcion.type, "DialogDescription")
  assert.equal(descripcion.props.children, "Descripción existente")
  const lista = React.createElement("dl", null, React.createElement("dt", null, "Inicial"))
  const conContenido = context.exports.ConfirmarEliminar({ ...props, contenido: lista })
  const [nuevoPopup] = React.Children.toArray(conContenido.props.children)
  assert.deepEqual(React.Children.toArray(nuevoPopup.props.children).map((b) => b.type), ["DialogHeader", "dl", "DialogFooter"])
})

test("cancelar o cerrar antes de confirmar no guarda y conserva las ediciones", () => {
  const f = formulario()
  f.context.valores[11] = "125"
  f.context.handleGuardar()
  f.context.cancelar(false)
  assert.equal(f.context.pendiente, null)
  assert.equal(f.llamadas.length, 0)
  assert.equal(f.context.valores[11], "125")
  assert.equal(f.context.hayCambios, true)
})

test("el envío contiene la copia aprobada y no valores modificados después", async () => {
  const f = formulario()
  f.context.valores[11] = "125"
  f.context.handleGuardar()
  f.context.valores[11] = "999"
  f.context.idAnio = 88
  await f.context.handleConfirm()
  assert.equal(f.llamadas[0].idAnio, 77)
  assert.deepEqual(f.llamadas[0].montos.map((m) => m.monto), [125, 200, 300])
  assert.deepEqual(Object.keys(f.llamadas[0].montos[0]), ["idNivel", "monto"])
  assert.equal(f.context.valores[11], "125")
  assert.equal(f.context.hayCambios, false)
  assert.equal(f.exitos.length, 1)
  assert.equal(f.context.pendiente, null)
})

test("dobles confirmaciones comparten promesa y no permiten cerrar durante el envío", async () => {
  const request = diferida()
  const f = formulario({ mutate: () => request.promise })
  f.context.valores[11] = "125"
  f.context.handleGuardar()
  const primera = f.context.confirmarGuardado()
  const segunda = f.context.confirmarGuardado()
  assert.equal(primera, segunda)
  assert.equal(f.llamadas.length, 1)
  f.context.cancelar(false)
  assert.ok(f.context.pendiente)
  request.resolve(niveles.map((m) => ({ ...m, monto: m.idNivel === 11 ? 125 : m.monto })))
  await primera
  assert.equal(f.context.envio.current, null)
  assert.equal(f.context.pendiente, null)
  assert.equal(f.context.hayCambios, false)
})

test("un fallo conserva el modal, muestra un error y permite reintentar", async () => {
  let fallar = true
  const f = formulario({ mutate: async (request) => {
    if (fallar) throw new Error("Error del servidor")
    return request.montos.map((m) => ({ ...m, sugerido: null }))
  } })
  f.context.valores[11] = "125"
  f.context.handleGuardar()
  await f.context.handleConfirm()
  assert.ok(f.context.pendiente)
  assert.equal(f.errores.length, 1)
  assert.equal(f.cierres.length, 0)
  assert.equal(f.context.cargando, false)
  assert.equal(f.context.envio.current, null)
  assert.equal(f.context.hayCambios, true)
  fallar = false
  await f.context.handleConfirm()
  assert.equal(f.llamadas.length, 2)
  assert.equal(f.exitos.length, 1)
  assert.equal(f.context.pendiente, null)
  assert.equal(f.context.hayCambios, false)
})

test("actualiza los valores con la respuesta real del servidor", async () => {
  const f = formulario({ mutate: async () => niveles.map((m) => ({ ...m, monto: m.idNivel === 11 ? 125.13 : m.monto })) })
  f.context.valores[11] = "125.125"
  f.context.handleGuardar()
  await f.context.handleConfirm()
  assert.equal(f.context.valores[11], "125.13")
  assert.equal(f.context.hayCambios, false)
  f.context.handleGuardar()
  assert.equal(f.llamadas.length, 1)
})

test("sin niveles, sin permiso o con año cerrado no se abre la confirmación", () => {
  const vacio = formulario({ montos: [] })
  vacio.context.handleGuardar()
  assert.equal(vacio.context.pendiente, null)
  for (const patch of [{ puedeActualizar: false }, { anioCerrado: true }, { anioTexto: "" }]) {
    const f = formulario()
    Object.assign(f.context, patch)
    f.context.valores[11] = "125"
    f.context.handleGuardar()
    assert.equal(f.context.pendiente, null)
    assert.equal(f.llamadas.length, 0)
  }
})

test("recomprueba permiso y año editable al confirmar, sin bloquear la cancelación", async () => {
  for (const patch of [{ puedeActualizar: false }, { anioCerrado: true }]) {
    const f = formulario()
    f.context.valores[11] = "125"
    f.context.handleGuardar()
    Object.assign(f.context, patch)
    await f.context.handleConfirm()
    assert.equal(f.llamadas.length, 0)
    assert.ok(f.context.pendiente)
    assert.equal(f.errores.length, 1)
    assert.equal(f.context.cargando, false)
    f.context.cancelar(false)
    assert.equal(f.context.pendiente, null)
  }
})

test("un nivel aún sin monto sigue pendiente aunque otros ya estén configurados", () => {
  const f = formulario({ montos: [niveles[0], { ...niveles[1], monto: null, sugerido: null }] })
  assert.equal(f.context.hayCambios, false)
  f.context.valores[22] = "200"
  assert.equal(f.context.hayCambios, true)
  f.context.handleGuardar()
  assert.ok(f.context.pendiente)
})
