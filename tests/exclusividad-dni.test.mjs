import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const codigo = ts.transpileModule(readFileSync(new URL("../hooks/use-validar-dni-persona.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

function guardia(opciones = {}) {
  let props = { validar: async () => {}, abierta: true, ...opciones }
  const slots = []
  const efectos = []
  let cursor = 0
  let pendientes = []
  let cambio = false
  let hook
  const errores = []
  let validos = 0
  const exports = {}
  const distintos = (a, b) => !a || b.some((valor, i) => !Object.is(valor, a[i]))
  vm.runInNewContext(codigo, {
    exports, Error,
    require: (nombre) => nombre === "react" ? {
      useRef: (current) => { const i = cursor++; return slots[i] ?? (slots[i] = { current }) },
      useCallback: (fn, deps) => {
        const i = cursor++
        if (!slots[i] || distintos(slots[i].deps, deps)) slots[i] = { fn, deps }
        return slots[i].fn
      },
      useState: (inicial) => {
        const i = cursor++
        if (!(i in slots)) slots[i] = typeof inicial === "function" ? inicial() : inicial
        return [slots[i], (valor) => {
          const siguiente = typeof valor === "function" ? valor(slots[i]) : valor
          if (!Object.is(siguiente, slots[i])) { slots[i] = siguiente; cambio = true }
        }]
      },
      useLayoutEffect: (fn, deps) => {
        const i = cursor++
        if (!efectos[i] || distintos(efectos[i].deps, deps)) pendientes.push(() => {
          efectos[i]?.limpieza?.()
          efectos[i] = { deps, limpieza: fn() }
        })
      },
    } : { REGEX_DNI: /^\d{8}$/ },
  })
  function render() {
    let vueltas = 0
    do {
      assert.ok(++vueltas < 20, "El hook debe estabilizar sus renderizados")
      cambio = false
      cursor = 0
      pendientes = []
      hook = exports.useValidarDniPersona({ ...props,
        onError: (error) => errores.push(error), onValido: () => validos++ })
    } while (cambio)
    pendientes.forEach((efecto) => efecto())
    return hook
  }
  render()
  return {
    comprobar: (...args) => render().comprobar(...args),
    invalidar: () => render().invalidar(),
    capturarVigencia: () => render().capturarVigencia(),
    ejecutarBusqueda: (tarea) => render().ejecutarBusqueda(tarea),
    errores, validos: () => validos,
    pendiente: () => render().comprobando,
    get comprobando() { return render().comprobando },
    get buscando() { return render().buscando },
    actualizar: (cambios) => { props = { ...props, ...cambios }; render() },
    cerrar: () => efectos.forEach((efecto) => efecto?.limpieza?.()),
  }
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

test("cambiar original libera la carga y descarta la respuesta pendiente", async () => {
  for (const falla of [false, true]) {
    const respuesta = diferida()
    const g = guardia({ validar: () => respuesta.promise })
    const consulta = g.comprobar("12345678")
    assert.equal(g.pendiente(), true)
    g.actualizar({ original: "12345678" })
    assert.equal(g.pendiente(), false)
    if (falla) respuesta.reject(new Error("Respuesta anterior"))
    else respuesta.resolve()
    assert.equal(await consulta, false)
    assert.equal(g.pendiente(), false)
    assert.deepEqual(g.errores, [])
    assert.equal(g.validos(), 0)
    assert.equal(await g.comprobar("12345678"), true)
  }
})

test("cerrar y reabrir no revive la carga ni permite que una respuesta vieja limpie la nueva", async () => {
  const antigua = diferida()
  const nueva = diferida()
  let llamadas = 0
  const g = guardia({ validar: () => ++llamadas === 1 ? antigua.promise : nueva.promise })
  const primera = g.comprobar("12345678")
  await Promise.resolve()
  g.actualizar({ abierta: false })
  assert.equal(g.pendiente(), false)
  g.actualizar({ abierta: true })
  assert.equal(g.pendiente(), false)
  const segunda = g.comprobar("12345678")
  assert.equal(g.pendiente(), true)
  antigua.resolve()
  assert.equal(await primera, false)
  assert.equal(g.pendiente(), true)
  nueva.resolve()
  assert.equal(await segunda, true)
  assert.equal(g.pendiente(), false)
})

test("dos consultas distintas en el mismo contexto conservan el dueño de la carga", async () => {
  const antigua = diferida()
  const nueva = diferida()
  const g = guardia({ validar: (dni) => dni === "12345678" ? antigua.promise : nueva.promise })
  const primera = g.comprobar("12345678")
  const segunda = g.comprobar("87654321")
  antigua.reject(new Error("Error anterior"))
  assert.equal(await primera, false)
  assert.deepEqual(g.errores, [])
  assert.equal(g.pendiente(), true)
  nueva.resolve()
  assert.equal(await segunda, true)
  assert.equal(g.pendiente(), false)
})

test("una búsqueda explícita antigua no modifica la carga de otra después de invalidar", async () => {
  const antigua = diferida()
  const nueva = diferida()
  const g = guardia()
  let vigenteAntigua
  const primera = g.ejecutarBusqueda(async (vigente) => { vigenteAntigua = vigente; await antigua.promise })
  assert.equal(g.buscando, true)
  g.invalidar()
  assert.equal(g.buscando, false)
  const segunda = g.ejecutarBusqueda(async () => { await nueva.promise })
  antigua.resolve()
  await primera
  assert.equal(vigenteAntigua(), false)
  assert.equal(g.buscando, true)
  nueva.resolve()
  await segunda
  assert.equal(g.buscando, false)
})

test("cambiar propiedades también libera e invalida una búsqueda explícita", async () => {
  const respuesta = diferida()
  const g = guardia()
  let vigente
  const busqueda = g.ejecutarBusqueda(async (actual) => { vigente = actual; await respuesta.promise })
  g.actualizar({ abierta: false })
  assert.equal(g.buscando, false)
  g.actualizar({ abierta: true, original: "12345678" })
  assert.equal(g.buscando, false)
  assert.equal(vigente(), false)
  respuesta.resolve()
  await busqueda
  assert.equal(g.buscando, false)
})

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

function astDe(ruta) {
  return ts.createSourceFile(ruta, readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function atributo(ruta, etiqueta, nombre) {
  const ast = astDe(ruta)
  let expresion
  function visitar(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === etiqueta) {
      const atributo = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(ast) === nombre)
      if (atributo) expresion = atributo.initializer.expression.getText(ast)
    }
    ts.forEachChild(node, visitar)
  }
  visitar(ast)
  assert.ok(expresion, `${ruta}: ${nombre}`)
  return expresion
}

const formularios = [
  ["Alumno", "components/matricula/paso-alumno.tsx", "handleBuscar"],
  ["Usuarios", "components/seguridad/usuario-form-dialog.tsx", "handleBuscarDni"],
  ["Docentes", "components/academico/docentes-tab.tsx", "handleBuscarDni"],
]

function formulario(ruta, nombre, { mini, externa, encontrado } = {}) {
  let datos = { documentoIdentidad: "12345678", nombre: "", apellidoPat: "", apellidoMat: "" }
  const llamadas = { mini: 0, ficha: 0, externa: 0 }
  const validarDni = async () => { llamadas.mini++; return mini?.promise }
  const contexto = vm.createContext({
    Error, REGEX_DNI: /^\d{8}$/,
    matriculasApi: { validarDniAlumno: validarDni }, usuariosApi: { validarDni }, docentesApi: { validarDni },
    form: {
      getValues: (campo) => campo ? datos[campo] : { ...datos },
      setValue: (campo, valor) => { datos[campo] = valor },
      reset: (valores) => { datos = { ...valores } }, clearErrors: () => {}, setError: () => {},
    },
    buscarAlumno: { mutateAsync: async () => { llamadas.ficha++; return encontrado ?? { existe: false } } },
    consultarDni: { mutateAsync: async () => {
      llamadas.externa++
      return externa ? externa.promise : { nombres: "Ana", apellidoPaterno: "Ruiz", apellidoMaterno: "Perez" }
    } },
    setFechaOriginal: () => {}, setExistente: () => {}, setApoderadosPrevios: () => {}, setFoto: () => {}, setPreview: () => {},
    toast: { error: () => {}, success: () => {} },
  })
  const ast = astDe(ruta)
  let validar
  function visitar(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "useValidarDniPersona") {
      validar = node.arguments[0].properties.find((p) => p.name.getText(ast) === "validar").initializer.getText(ast)
    }
    ts.forEachChild(node, visitar)
  }
  visitar(ast)
  const g = guardia({ validar: vm.runInContext(`(${validar})`, contexto) })
  contexto.comprobacionDni = g
  vm.runInContext(ts.transpileModule(funcion(ruta, nombre), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, contexto)
  const carga = atributo(ruta, "CampoDni", "cargando")
  const disabled = atributo("components/shared/buscar-dni-button.tsx", "Button", "disabled")
  return { g, llamadas, datos: () => datos, escribir: (campo, valor) => { datos[campo] = valor },
    buscar: () => vm.runInContext(`${nombre}()`, contexto),
    lupaDeshabilitada: () => Boolean(vm.runInNewContext(disabled, {
      dniValido: true, cargando: vm.runInContext(carga, contexto), disabled: false,
    })),
  }
}

for (const [modulo, ruta, handler] of formularios) {
  test(`${modulo}: blur pendiente permite el primer clic y evita búsquedas explícitas duplicadas`, async () => {
    const mini = diferida()
    const externa = diferida()
    const f = formulario(ruta, handler, { mini, externa })
    const blur = f.g.comprobar("12345678")
    await Promise.resolve()
    assert.equal(f.lupaDeshabilitada(), false)
    assert.equal(f.llamadas.ficha, 0)
    const primera = f.buscar()
    const segunda = f.buscar()
    assert.equal(f.lupaDeshabilitada(), true)
    mini.resolve()
    assert.equal(await blur, true)
    await new Promise(setImmediate)
    assert.equal(f.llamadas.mini, 1)
    assert.equal(f.llamadas.externa, 1)
    assert.equal(f.llamadas.ficha, modulo === "Alumno" ? 1 : 0)
    assert.equal(f.lupaDeshabilitada(), true)
    externa.resolve({ nombres: "Ana", apellidoPaterno: "Ruiz", apellidoMaterno: "Perez" })
    await Promise.all([primera, segunda])
    assert.equal(f.datos().nombre, "Ana")
    assert.equal(f.lupaDeshabilitada(), false)
  })

  test(`${modulo}: una comprobación interna fallida bloquea el autocompletado y libera la lupa`, async () => {
    const mini = diferida()
    const f = formulario(ruta, handler, { mini })
    const blur = f.g.comprobar("12345678")
    const busqueda = f.buscar()
    mini.reject(new Error("DNI incompatible"))
    await Promise.all([blur, busqueda])
    assert.equal(f.llamadas.externa, 0)
    assert.equal(f.llamadas.ficha, 0)
    assert.deepEqual(f.g.errores, ["DNI incompatible"])
    assert.equal(f.lupaDeshabilitada(), false)
  })

  test(`${modulo}: RENIEC conserva los cambios manuales y descarta respuestas de otro DNI`, async () => {
    for (const cambiaDni of [false, true]) {
      const externa = diferida()
      const f = formulario(ruta, handler, { externa })
      const busqueda = f.buscar()
      await new Promise(setImmediate)
      if (cambiaDni) { f.g.invalidar(); f.escribir("documentoIdentidad", "87654321") }
      f.escribir("nombre", "Manual")
      externa.resolve({ nombres: "Anterior", apellidoPaterno: "Viejo", apellidoMaterno: "Viejo" })
      await busqueda
      assert.equal(f.datos().nombre, "Manual")
      assert.equal(f.lupaDeshabilitada(), false)
    }
  })

  test(`${modulo}: un fallo de RENIEC libera la búsqueda y mantiene la validación interna independiente`, async () => {
    const externa = diferida()
    const f = formulario(ruta, handler, { externa })
    const busqueda = f.buscar()
    await new Promise(setImmediate)
    externa.reject(new Error("RENIEC no disponible"))
    await busqueda
    assert.equal(f.lupaDeshabilitada(), false)
    assert.deepEqual(f.g.errores, [])
    f.escribir("nombre", "Manual")
    assert.equal(await f.g.comprobar("12345678"), true)
    assert.equal(f.datos().nombre, "Manual")
  })
}

test("Alumno: solo la lupa recupera los datos completos y reutiliza la persona existente", async () => {
  const f = formulario(formularios[0][1], formularios[0][2], { encontrado: {
    existe: true, idAlumno: 7, nombre: "Alumno", apellidoPat: "Ruiz", apellidoMat: "Perez",
    fechaNacimiento: "1999-01-01", apoderados: [{ idApoderado: 9 }],
  } })
  assert.equal(await f.g.comprobar("12345678"), true)
  assert.equal(f.llamadas.ficha, 0)
  await f.buscar()
  assert.equal(f.llamadas.ficha, 1)
  assert.equal(f.llamadas.externa, 0)
  assert.equal(f.datos().fechaNacimiento, "1999-01-01")
})

test("la confirmación de reactivación conserva el modal ante rechazo interno o del guardado", async () => {
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
