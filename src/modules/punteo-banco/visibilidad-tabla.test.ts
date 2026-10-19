import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { planificarContinuidad } from "./continuidad-saldo";
import type { EstadoOk } from "./modelo";
import {
  CLASES_VISIBLES_TABLA,
  esTpvCalculable,
  esVisibleEnTabla,
  type ClaseMovimiento,
  type MovimientoInterno,
} from "./movimiento-interno";
import { sumarImportesTpv } from "./paginacion-tpv";

test("la tabla muestra los movimientos ordinarios y deja fuera el TPV", () => {
  const filas = [
    fila("normal", "pendiente", 100, -10, 90),
    fila("credito-cuota", "comprobar", 90, -20, 70),
    fila("pendiente-clasificacion", "ok", 70, -5, 65),
    fila("tpv-ingreso", "pendiente", 65, 30, 95),
    fila("tpv-comision", "pendiente", 95, -1, 94),
    fila("tpv-mantenimiento", "pendiente", 94, -2, 92),
    fila("tpv-devolucion", "pendiente", 92, -3, 89),
  ];

  const visibles = filas.filter((movimiento) => esVisibleEnTabla(movimiento.clase));

  assert.deepEqual(
    visibles.map((movimiento) => movimiento.clase),
    ["normal", "credito-cuota", "pendiente-clasificacion"]
  );
  assert.deepEqual(
    visibles.map((movimiento) => movimiento.ok),
    ["pendiente", "comprobar", "ok"]
  );
  assert.deepEqual(CLASES_VISIBLES_TABLA, ["normal", "credito-cuota", "pendiente-clasificacion"]);
  assert.equal(
    filas.some((movimiento) => movimiento.clase.startsWith("tpv-") && esVisibleEnTabla(movimiento.clase)),
    false
  );

  const plan = planificarContinuidad({
    referencia: {
      banco: "caixabank",
      fecha: "2031-04-01",
      concepto: "Ancla",
      importe: 0,
      saldo: 100,
    },
    existentes: [],
    archivo: filas,
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.nuevos.length, filas.length);
  assert.equal(plan.tpv, 4);
  assert.equal(
    plan.nuevos.filter((movimiento) => esTpvCalculable(movimiento.clase)).length,
    2
  );

  const suma = sumarImportesTpv([
    { clase: "tpv-ingreso", importe_centimos: 3000 },
    { clase: "tpv-comision", importe_centimos: -100 },
    { clase: "tpv-mantenimiento", importe_centimos: -200 },
    { clase: "tpv-devolucion", importe_centimos: -300 },
  ]);

  assert.deepEqual(suma, { ingresosCentimos: 3000, comisionesCentimos: -100 });
});

test("un pendiente de clasificación recién leído conserva el estado pendiente", () => {
  const movimiento = fila("pendiente-clasificacion", "pendiente", 10, -1, 9);

  assert.equal(esVisibleEnTabla(movimiento.clase), true);
  assert.equal(movimiento.ok, "pendiente");

  const tabla = readFileSync(
    new URL("../../app/gestion-diaria/punteo-banco/tabla-movimientos.tsx", import.meta.url),
    "utf8"
  );
  const acceso = readFileSync(new URL("./acceso-oficial.ts", import.meta.url), "utf8");
  const modo = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/use-modo-oficial.ts", import.meta.url), "utf8");

  assert.match(tabla, /pendiente: "border-\[#e3b2aa\] bg-\[#f6d9d4\]/);
  assert.match(acceso, /const CLASES_VISIBLES = CLASES_VISIBLES_TABLA/);
  assert.match(acceso, /\.in\("clase", \[\.\.\.CLASES_VISIBLES\]\)/);
  assert.match(modo, /ok: fila\.estado/);
});

function fila(
  clase: ClaseMovimiento,
  ok: EstadoOk,
  saldoAnterior: number,
  importe: number,
  saldo: number
): MovimientoInterno {
  return {
    id: `${clase}-${saldo}`,
    banco: "caixabank",
    fecha: "2031-04-02",
    fechaValor: "",
    importe,
    concepto: clase,
    conceptoOriginal: clase,
    detallesOriginales: "",
    saldo,
    referencias: [],
    clase,
    observaciones: "",
    ok,
    archivo: "prueba.xls",
    fila: 2,
    orden: saldoAnterior,
  };
}
