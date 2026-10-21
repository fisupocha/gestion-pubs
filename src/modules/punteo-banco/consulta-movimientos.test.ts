import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  anexarSinDuplicar,
  argumentosConsulta,
  consultarMovimientos,
  recorrerConsulta,
  type ConsultaMovimiento,
} from "./consulta-movimientos";
import { LOCALES_PUNTEO, LOCALES_PUNTEO_GUARDADOS, localReconocido, planGuardarLocal } from "./locales-punteo";

test("los locales de Punteo, incluido Soho, se guardan con la función oficial", () => {
  for (const local of LOCALES_PUNTEO_GUARDADOS) {
    const plan = planGuardarLocal(12, local);
    assert.equal(plan.ok, true);
    if (plan.ok) {
      assert.equal(plan.local, local);
      assert.deepEqual(Object.keys(plan.llamada).sort(), ["funcion", "p_local", "p_movimiento_id"]);
      assert.equal(plan.llamada.funcion, "punteo_guardar_local");
      assert.equal("estado" in plan.llamada, false);
    }
  }

  assert.equal(LOCALES_PUNTEO.includes("Soho"), true);
  assert.equal(localReconocido("Soho").ok, true);
  const soho = planGuardarLocal(12, "Soho");
  assert.equal(soho.ok, true);
  if (soho.ok) {
    assert.equal(soho.llamada.p_local, "Soho");
  }

  assert.equal(planGuardarLocal(12, null).ok, true);
  assert.equal(planGuardarLocal(12, "  ").ok, true);
  assert.equal(planGuardarLocal(12, "Bar").ok, false);
  assert.equal(planGuardarLocal(12, "tarantino").ok, false);
  assert.equal(planGuardarLocal(12, "Fisu extra").ok, false);
});

test("SUA se encuentra aunque esté más allá del primer bloque", () => {
  const filas = Array.from({ length: 150 }, (_, indice) => fila(indice + 1));
  filas[140] = fila(141, { conceptoOriginal: "Pago SUA abril" });
  const pagina = consultarMovimientos(filas, {
    filtroLocal: "todos",
    busqueda: "sua",
    columna: "orden_banco",
    ascendente: false,
    ambito: "ordinarios",
    desde: 0,
    limite: 100,
  });

  assert.deepEqual(
    pagina.filas.map((actual) => actual.id),
    [141]
  );
  assert.equal(pagina.hayMas, false);
});

test("el filtro de local se combina con la búsqueda y no se queda en el primer bloque", () => {
  const filas = [
    fila(1, { conceptoOriginal: "SUA Tarantino", local: "Tarantino" }),
    fila(2, { conceptoOriginal: "SUA Hangar", local: "Hangar" }),
    fila(3, { conceptoOriginal: "Otro Tarantino", local: "Tarantino" }),
    fila(4, { conceptoOriginal: "SUA sin local" }),
  ];
  const pagina = consultarMovimientos(filas, {
    filtroLocal: "Tarantino",
    busqueda: "SUA",
    columna: "orden_banco",
    ascendente: false,
    ambito: "ordinarios",
    desde: 0,
    limite: 100,
  });

  assert.deepEqual(
    pagina.filas.map((actual) => actual.id),
    [1]
  );
});

test("el importe se ordena como número y los empates no saltan filas", () => {
  const filas = [
    fila(1, { importeCentimos: 100000, ordenBanco: 10 }),
    fila(2, { importeCentimos: -100000, ordenBanco: 40 }),
    fila(3, { importeCentimos: 300, ordenBanco: 20 }),
    fila(4, { importeCentimos: 300, ordenBanco: 30 }),
    fila(5, { importeCentimos: 2000, ordenBanco: 15 }),
    fila(6, { importeCentimos: -5000, ordenBanco: 12 }),
  ];
  const ascendente = consultarMovimientos(filas, base({ columna: "importe", ascendente: true }));
  assert.deepEqual(
    ascendente.filas.map((actual) => actual.importeCentimos),
    [-100000, -5000, 300, 300, 2000, 100000]
  );
  assert.deepEqual(
    ascendente.filas.filter((actual) => actual.importeCentimos === 300).map((actual) => actual.ordenBanco),
    [30, 20]
  );

  const descendente = consultarMovimientos(filas, base({ columna: "importe", ascendente: false }));
  assert.deepEqual(
    descendente.filas.map((actual) => actual.importeCentimos),
    [100000, 2000, 300, 300, -5000, -100000]
  );
});

test("cualquier orden se recorre entero, sin duplicados, y se puede volver al orden bancario", () => {
  const filas = Array.from({ length: 40 }, (_, indice) =>
    fila(indice + 1, {
      fecha: indice % 3 === 0 ? "2026-05-20" : `2026-06-${String((indice % 27) + 1).padStart(2, "0")}`,
      fechaValor: indice % 5 === 0 ? "" : "2026-05-01",
      importeCentimos: (indice % 7) * 150 - 400,
      conceptoOriginal: indice % 2 === 0 ? "Alfa" : "beta",
      observaciones: indice % 4 === 0 ? "nota" : "",
      local: indice % 4 === 0 ? "Cue" : indice % 4 === 1 ? "Fisu" : null,
      estado: indice % 3 === 0 ? "ok" : indice % 3 === 1 ? "pendiente" : "comprobar",
      ordenBanco: indice + 1,
    })
  );
  const columnas = [
    "orden_banco",
    "fecha_operacion",
    "fecha_valor",
    "importe",
    "concepto",
    "observaciones",
    "local",
    "estado",
  ] as const;

  for (const columna of columnas) {
    for (const ascendente of [true, false]) {
      const recorrido = recorrerConsulta(filas, {
        ...base({ columna, ascendente }),
        tamano: 7,
      });
      assert.equal(recorrido.duplicada, false);
      assert.equal(recorrido.completa, true);
      assert.equal(new Set(recorrido.filas.map((actual) => actual.id)).size, filas.length);
      assert.equal(recorrido.filas.length, filas.length);
    }
  }

  const original = consultarMovimientos(filas, base({ columna: "orden_banco", ascendente: false }));
  assert.deepEqual(
    original.filas.map((actual) => actual.ordenBanco),
    [...filas].map((actual) => actual.ordenBanco).sort((a, b) => b - a)
  );
});

test("las coincidencias TPV no se mezclan con las ordinarias", () => {
  const filas = [
    fila(1, { conceptoOriginal: "SUA ordinario" }),
    fila(2, { conceptoOriginal: "SUA datafono", clase: "tpv-ingreso" }),
    fila(3, { conceptoOriginal: "Comisión", clase: "tpv-comision" }),
  ];
  const ordinarios = consultarMovimientos(filas, base({ busqueda: "sua" }));
  const tpv = consultarMovimientos(filas, base({ busqueda: "sua", ambito: "tpv" }));

  assert.deepEqual(
    ordinarios.filas.map((actual) => actual.id),
    [1]
  );
  assert.deepEqual(
    tpv.filas.map((actual) => actual.id),
    [2]
  );
});

test("la búsqueda encuentra nuestro concepto y el orden por concepto sigue el texto bancario", () => {
  const filas = [
    fila(1, { conceptoOriginal: "Zeta banco", nuestroConcepto: "Alfa propio", local: "Soho" }),
    fila(2, { conceptoOriginal: "Alfa banco", nuestroConcepto: "Zeta propio", local: "Cue" }),
  ];
  const porConcepto = consultarMovimientos(filas, base({ columna: "concepto", ascendente: true, busqueda: "" }));
  assert.deepEqual(
    porConcepto.filas.map((actual) => actual.id),
    [2, 1]
  );

  const propio = consultarMovimientos(filas, base({ busqueda: "alfa propio" }));
  assert.deepEqual(
    propio.filas.map((actual) => actual.id),
    [1]
  );

  const bancario = consultarMovimientos(filas, base({ busqueda: "zeta banco" }));
  assert.deepEqual(
    bancario.filas.map((actual) => actual.id),
    [1]
  );

  const soho = consultarMovimientos(filas, base({ filtroLocal: "Soho" }));
  assert.deepEqual(
    soho.filas.map((actual) => actual.id),
    [1]
  );

  const cue = consultarMovimientos(filas, base({ filtroLocal: "Cue" }));
  assert.deepEqual(
    cue.filas.map((actual) => actual.id),
    [2]
  );
});

test("la consulta pide a Supabase el desplazamiento, el local y el texto", () => {
  assert.deepEqual(
    argumentosConsulta({
      banco: "ibercaja",
      anio: 2026,
      filtroLocal: "Fisu",
      busqueda: "SUA",
      columna: "importe",
      ascendente: true,
      ambito: "ordinarios",
      desde: 100,
      limite: 100,
    }),
    {
      p_banco: "ibercaja",
      p_anio: 2026,
      p_filtro_local: "Fisu",
      p_busqueda: "SUA",
      p_orden: "importe",
      p_ascendente: true,
      p_ambito: "ordinarios",
      p_desde: 100,
      p_limite: 100,
    }
  );
  assert.equal("p_nuestro_concepto" in argumentosConsulta({
    banco: "ibercaja",
    anio: 2026,
    filtroLocal: "Soho",
    busqueda: "",
    columna: "orden_banco",
    ascendente: false,
    ambito: "ordinarios",
    desde: 0,
    limite: 100,
  }), false);
  assert.deepEqual(anexarSinDuplicar([{ id: 3 }, { id: 2 }], [{ id: 2 }, { id: 1 }]), [
    { id: 3 },
    { id: 2 },
    { id: 1 },
  ]);
});

test("el SQL deja el local en NULL, rechaza valores ajenos y ordena el importe en céntimos", () => {
  const sql = readFileSync(new URL("../../../sql/punteo-banco/LOCAL-busqueda-orden.sql", import.meta.url), "utf8");
  const guardar = sql.slice(
    sql.indexOf("function public.punteo_guardar_local"),
    sql.indexOf("comment on function public.punteo_guardar_local")
  );
  const consultar = sql.slice(sql.indexOf("function public.punteo_consultar_movimientos"));
  const tabla = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/tabla-movimientos.tsx", import.meta.url), "utf8");

  assert.match(sql, /add column if not exists local text/);
  assert.match(sql, /local is null or local in \('Tarantino', 'Hangar', 'Cue', 'Riverocio', 'Fisu'\)/);
  assert.match(guardar, /set local = v_local/);
  assert.equal(guardar.includes("estado ="), false);
  assert.match(guardar, /punteo.accion', 'local'/);
  assert.match(guardar, /exigir_admin/);
  assert.match(consultar, /importe_centimos end asc/);
  assert.match(consultar, /offset v_desde/);
  assert.equal(consultar.includes("update public.punteo_movimientos"), false);
  assert.match(tabla, /pendiente: "border-\[#e3b2aa\] bg-\[#f6d9d4\]/);
  assert.match(tabla, /Riverocio: "border-\[#9ed9c8\] bg-\[#d4f3ea\]/);
  assert.equal(tabla.includes("bg-[#d9efd6]") && tabla.includes("bg-[#d4f3ea]"), true);
});

function base(parcial: Partial<Parameters<typeof consultarMovimientos>[1]> = {}) {
  return {
    filtroLocal: "todos" as const,
    busqueda: "",
    columna: "orden_banco" as const,
    ascendente: false,
    ambito: "ordinarios" as const,
    desde: 0,
    limite: 100,
    ...parcial,
  };
}

function fila(id: number, parcial: Partial<ConsultaMovimiento> = {}): ConsultaMovimiento {
  return {
    id,
    fecha: "2026-05-02",
    fechaValor: "2026-05-02",
    importeCentimos: id * 10,
    saldoCentimos: 1000,
    concepto: `Concepto ${id}`,
    conceptoOriginal: `Concepto ${id}`,
    conceptoNormalizado: `concepto ${id}`,
    detallesOriginales: "",
    observaciones: "",
    local: null,
    estado: "pendiente",
    clase: "normal",
    motivoEstado: "",
    origenEstado: "importacion",
    referencias: [],
    ordenBanco: id,
    filaExcel: id,
    ...parcial,
  };
}
