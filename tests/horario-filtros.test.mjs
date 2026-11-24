import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const requireModule = createRequire(import.meta.url)

function cargar(ruta, stubs = {}) {
  const exports = {}
  const fuente = readFileSync(new URL(`../${ruta}.ts`, import.meta.url), "utf8")
  vm.runInNewContext(ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports,
    URLSearchParams,
    require: (nombre) => stubs[nombre] ?? (nombre.startsWith("@/") ? cargar(nombre.slice(2)) : requireModule(nombre)),
  })
  return exports
}

function clase(id, dia = 1) {
  return {
    idHorario: id,
    diaSemana: dia,
    horaInicio: "08:00:00",
    horaFin: "09:00:00",
    aula: "A-101",
    curso: "Matemática",
    docente: "Ana Díaz",
    idDocente: 7,
    grado: "3ro",
    seccion: "A",
    idGradoSeccion: 30,
    turno: "Mañana",
    idAnio: 2,
  }
}

function pagina(content, last) {
  return { content, totalElements: 100, totalPages: 2, size: 100, number: 0, numberOfElements: content.length, first: !last, last, empty: false }
}

test("listar envía docente como parámetro canónico", async () => {
  const urls = []
  const api = {
    apiFetch: async (url) => {
      urls.push(url)
      return pagina([], true)
    },
  }
  const { horarioApi } = cargar("lib/api/horario", { "@/lib/api": api })

  await horarioApi.listar({ page: 0, size: 100, idDocente: 7, idAnio: 2 })

  assert.equal(urls.length, 1)
  assert.match(urls[0], /docente=7/)
  assert.doesNotMatch(urls[0], /idDocente/)
  assert.match(urls[0], /sort=idHorario%2Casc/)
})

test("listarTodo recorre todas las páginas con los mismos filtros y orden estable", async () => {
  const urls = []
  const respuestas = [pagina([clase(9), clase(4)], false), pagina([clase(2)], true)]
  const api = {
    apiFetch: async (url) => {
      urls.push(url)
      return respuestas[urls.length - 1]
    },
  }
  const { horarioApi } = cargar("lib/api/horario", { "@/lib/api": api })

  const horarios = await horarioApi.listarTodo({ idDocente: 7, idAnio: 2 })

  assert.equal(urls.length, 2)
  const [primera, segunda] = urls.map((url) => new URLSearchParams(url.split("?")[1]))
  assert.equal(primera.get("page"), "0")
  assert.equal(segunda.get("page"), "1")
  for (const params of [primera, segunda]) {
    assert.equal(params.get("docente"), "7")
    assert.equal(params.get("idAnio"), "2")
    assert.equal(params.get("sort"), "idHorario,asc")
  }
  assert.deepEqual(Array.from(horarios, (h) => h.idHorario), [2, 4, 9])
})

test("listarTodo no presenta una página intermedia como resultado completo", async () => {
  const urls = []
  const api = {
    apiFetch: async (url) => {
      urls.push(url)
      if (urls.length === 1) return pagina([clase(1)], false)
      throw new Error("falló la página 2")
    },
  }
  const { horarioApi } = cargar("lib/api/horario", { "@/lib/api": api })

  await assert.rejects(() => horarioApi.listarTodo({ idDocente: 7 }), /falló la página 2/)
  assert.equal(urls.length, 2)
})
