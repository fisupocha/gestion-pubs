import assert from "node:assert/strict";
import test from "node:test";
import { normalizarMovimientoGuardado } from "./almacen-local";
import {
  confirmarCorreccionManual,
  normalizarEstadoOk,
  requiereConfirmacionManual,
  señalarIncidenciaPrograma,
  textoConfirmacionManual,
} from "./decision-estado";
import { ordenarMovimientos } from "./modelo";
import type { MovimientoInterno } from "./movimiento-interno";

function fila(parcial: Pick<MovimientoInterno, "id" | "orden" | "fecha" | "ok"> & Partial<MovimientoInterno>) {
  return {
    banco: "caixabank" as const,
    fechaValor: "",
    importe: 1,
    concepto: parcial.id,
    conceptoOriginal: parcial.id,
    detallesOriginales: "",
    saldo: 1,
    referencias: [],
    clase: "normal" as const,
    observaciones: "nota larga que no debe perderse",
    archivo: "prueba.xls",
    fila: parcial.orden,
    ...parcial,
  };
}

test("el orden original pone el más reciente arriba sin clasificar por fecha", () => {
  const movimientos = [
    fila({ id: "antiguo-mismo-dia", orden: 1, fecha: "2031-04-01", ok: "ok" }),
    fila({ id: "medio-mismo-dia", orden: 2, fecha: "2031-04-01", ok: "pendiente" }),
    fila({ id: "fecha-posterior-pero-antes-en-el-banco", orden: 3, fecha: "2031-04-03", ok: "comprobar" }),
    fila({ id: "ultimo-del-banco", orden: 4, fecha: "2031-04-02", ok: "pendiente" }),
  ];
  const original = ordenarMovimientos(movimientos, "original").map((movimiento) => movimiento.id);

  assert.deepEqual(original, [
    "ultimo-del-banco",
    "fecha-posterior-pero-antes-en-el-banco",
    "medio-mismo-dia",
    "antiguo-mismo-dia",
  ]);
  assert.deepEqual(
    movimientos.map((movimiento) => movimiento.orden),
    [1, 2, 3, 4]
  );
});

test("pendientes arriba agrupa rojo, amarillo y verde y vuelve al orden original", () => {
  const movimientos = [
    fila({ id: "a", orden: 1, fecha: "2031-04-01", ok: "pendiente" }),
    fila({ id: "b", orden: 2, fecha: "2031-04-01", ok: "ok" }),
    fila({ id: "c", orden: 3, fecha: "2031-04-01", ok: "comprobar" }),
    fila({ id: "d", orden: 4, fecha: "2031-04-02", ok: "pendiente" }),
  ];
  const pendientes = ordenarMovimientos(movimientos, "pendientes").map((movimiento) => movimiento.id);
  const otraVez = ordenarMovimientos(movimientos, "original").map((movimiento) => movimiento.id);

  assert.deepEqual(pendientes, ["d", "c", "a", "b"]);
  assert.deepEqual(otraVez, ["d", "c", "b", "a"]);
});

test("un OK normal no pide confirmación y una señal del programa sí", () => {
  const normal = fila({ id: "normal", orden: 1, fecha: "2031-04-01", ok: "pendiente" });
  const señalado = fila({
    id: "senal",
    orden: 2,
    fecha: "2031-04-01",
    ok: "comprobar",
    incidenciaAbierta: { id: "inc-1", motivo: "Posible repetición.", firma: "v1" },
  });

  assert.equal(requiereConfirmacionManual(normal, "ok"), false);
  assert.equal(requiereConfirmacionManual(señalado, "ok"), true);
  assert.equal(
    textoConfirmacionManual("ok"),
    "El programa había señalado este movimiento para comprobar. ¿Confirmas que quieres dejarlo en OK?"
  );
});

test("confirmar un Comprobar deja constancia y la misma incidencia no vuelve a abrir", () => {
  const señalado = fila({
    id: "senal",
    orden: 2,
    fecha: "2031-04-01",
    ok: "comprobar",
    incidenciaAbierta: { id: "inc-1", motivo: "Posible repetición.", firma: "v1" },
  });
  const confirmado = confirmarCorreccionManual(señalado, "ok");
  const repetida = señalarIncidenciaPrograma(confirmado, {
    id: "inc-1",
    motivo: "Posible repetición.",
    firma: "v1",
  });

  assert.equal(confirmado.ok, "ok");
  assert.equal(confirmado.decisionManual, true);
  assert.equal(confirmado.incidenciaAbierta, null);
  assert.equal(confirmado.observaciones, "nota larga que no debe perderse");
  assert.deepEqual(confirmado.incidenciasResueltas, [{ id: "inc-1", motivo: "Posible repetición.", firma: "v1" }]);
  assert.equal(repetida.ok, "ok");
  assert.equal(repetida, confirmado);
});

test("una firma nueva puede volver a señalar Comprobar e indica el dato nuevo", () => {
  const resuelto = fila({
    id: "senal",
    orden: 2,
    fecha: "2031-04-01",
    ok: "ok",
    decisionManual: true,
    incidenciasResueltas: [{ id: "inc-1", motivo: "Posible repetición.", firma: "v1" }],
  });
  const nuevo = señalarIncidenciaPrograma(resuelto, {
    id: "inc-1",
    motivo: "Ha aparecido otra factura con el mismo importe.",
    firma: "v2",
  });

  assert.equal(nuevo.ok, "pendiente");
  assert.equal(nuevo.incidenciaAbierta?.motivo, "Ha aparecido otra factura con el mismo importe.");
  assert.equal(nuevo.incidenciaAbierta?.firma, "v2");
  assert.equal(nuevo.incidenciasResueltas?.length, 1);
  assert.equal(nuevo.observaciones, resuelto.observaciones);
  assert.equal(nuevo.importe, resuelto.importe);
});

test("un estado antiguo Comprobado se lee como OK y no pierde la observación", () => {
  const guardado = normalizarMovimientoGuardado({
    ...fila({ id: "viejo", orden: 8, fecha: "2026-10-02", ok: "pendiente" }),
    ok: "comprobado" as "ok",
    observaciones: "Texto largo del usuario\nsegunda línea",
  });

  assert.equal(normalizarEstadoOk("comprobado"), "ok");
  assert.equal(guardado.ok, "ok");
  assert.equal(guardado.observaciones, "Texto largo del usuario\nsegunda línea");
  assert.equal(guardado.importe, 1);
  assert.equal(guardado.fecha, "2026-10-02");
  assert.deepEqual(guardado.incidenciasResueltas, []);
});

test("Comprobar antiguo se normaliza a Pendiente conservando la incidencia", () => {
 const anterior = fila({id:"legado", orden:9, fecha:"2026-10-29", ok:"comprobar", incidenciaAbierta:{id:"i", firma:"1", motivo:"Revisar"}});
 const actual = normalizarMovimientoGuardado(anterior);
 assert.equal(normalizarEstadoOk("comprobar"), "pendiente");
 assert.equal(actual.ok, "pendiente");
 assert.equal(actual.observaciones, anterior.observaciones);
 assert.deepEqual(actual.incidenciaAbierta, anterior.incidenciaAbierta);
 assert.equal(requiereConfirmacionManual(actual, "ok"), true);
});
