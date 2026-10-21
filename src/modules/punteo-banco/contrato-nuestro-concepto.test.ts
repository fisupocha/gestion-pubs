import assert from "node:assert/strict";
import test from "node:test";
import {
  asignarLocal,
  coincideBusqueda,
  filaTrasAnadirColumna,
  filtrarLocal,
  guardarNuestroConcepto,
  paginar,
  type MovimientoFicticio,
} from "./contrato-nuestro-concepto";

const base = {
  id: 7,
  banco: "caixabank" as const,
  fecha: "2026-02-13",
  fechaValor: "2026-02-14",
  importe: -882216,
  saldo: -1359317,
  conceptoBancario: "PAGARE TRUN. 6018695",
  detalles: "Recibos varios",
  observaciones: "Pago factura A-02430/2025 de diciembre de 2025, correspondiente a Tarantino, Cue y Hangar.",
  local: "Riverocio",
  estado: "comprobar" as const,
  clase: "normal",
};

const tpv = {
  id: 8,
  banco: "ibercaja" as const,
  fecha: "2026-05-02",
  fechaValor: "2026-05-02",
  importe: 6200,
  saldo: 10000,
  conceptoBancario: "COMPRAS CON TARJETA IBERCAJA",
  detalles: "ABONO TPV",
  observaciones: "",
  local: null,
  estado: "ok" as const,
  clase: "tpv-ingreso",
};

function intacto(antes: Omit<MovimientoFicticio, "nuestroConcepto">, despues: MovimientoFicticio) {
  assert.equal(despues.id, antes.id);
  assert.equal(despues.banco, antes.banco);
  assert.equal(despues.fecha, antes.fecha);
  assert.equal(despues.fechaValor, antes.fechaValor);
  assert.equal(despues.importe, antes.importe);
  assert.equal(despues.saldo, antes.saldo);
  assert.equal(despues.conceptoBancario, antes.conceptoBancario);
  assert.equal(despues.detalles, antes.detalles);
  assert.equal(despues.observaciones, antes.observaciones);
  assert.equal(despues.local, antes.local);
  assert.equal(despues.estado, antes.estado);
  assert.equal(despues.clase, antes.clase);
}

test("añadir la columna deja el texto vacío y no toca el resto", () => {
  const fila = filaTrasAnadirColumna(base);
  intacto(base, fila);
  assert.equal(fila.nuestroConcepto, "");
});

test("guardar, leer, editar y vaciar nuestro concepto conserva banco, estado y local", () => {
  const inicial = filaTrasAnadirColumna(base);
  const creado = guardarNuestroConcepto(inicial, "  Distribuciones La Bajada  ", true);
  assert.equal(creado.ok, true);
  if (!creado.ok) return;
  assert.equal(creado.fila.nuestroConcepto, "Distribuciones La Bajada");
  intacto(base, creado.fila);

  const leido = creado.fila.nuestroConcepto;
  assert.equal(leido, "Distribuciones La Bajada");

  const editado = guardarNuestroConcepto(creado.fila, "La Bajada resto diciembre", true);
  assert.equal(editado.ok, true);
  if (!editado.ok) return;
  assert.equal(editado.fila.nuestroConcepto, "La Bajada resto diciembre");
  assert.equal(editado.fila.observaciones, base.observaciones);
  assert.equal(editado.fila.conceptoBancario, base.conceptoBancario);

  const vacio = guardarNuestroConcepto(editado.fila, "   ", true);
  assert.equal(vacio.ok, true);
  if (!vacio.ok) return;
  assert.equal(vacio.fila.nuestroConcepto, "");
  assert.equal(vacio.fila.estado, "comprobar");
  assert.equal(vacio.fila.local, "Riverocio");
});

test("un texto demasiado largo y una sesión sin permiso no escriben", () => {
  const fila = filaTrasAnadirColumna(base);
  const largo = guardarNuestroConcepto(fila, "a".repeat(501), true);
  assert.equal(largo.ok, false);
  assert.equal(largo.fila.nuestroConcepto, "");

  const ajeno = guardarNuestroConcepto(fila, "Distribuciones La Bajada", false);
  assert.equal(ajeno.ok, false);
  assert.equal(ajeno.fila.conceptoBancario, "PAGARE TRUN. 6018695");
  assert.equal(ajeno.fila.estado, "comprobar");
});

test("la búsqueda encuentra nuestro concepto y también el texto del banco", () => {
  const fila = { ...filaTrasAnadirColumna(base), nuestroConcepto: "Distribuciones La Bajada" };
  assert.equal(coincideBusqueda(fila, "bajada"), true);
  assert.equal(coincideBusqueda(fila, "6018695"), true);
  assert.equal(coincideBusqueda(fila, "no-esta"), false);
});

test("Soho se asigna a una fila ficticia y el filtro no mueve a las demás", () => {
  const ordinaria = filaTrasAnadirColumna(base);
  const asignada = asignarLocal(ordinaria, "Soho", true);
  assert.equal(asignada.ok, true);
  if (!asignada.ok) return;
  assert.equal(asignada.fila.local, "Soho");
  assert.equal(asignada.fila.estado, "comprobar");
  assert.equal(asignada.fila.conceptoBancario, base.conceptoBancario);

  const rechazada = asignarLocal(ordinaria, "Soho", false);
  assert.equal(rechazada.ok, false);
  assert.equal(rechazada.fila.local, "Riverocio");

  const otra = filaTrasAnadirColumna({ ...base, id: 9, local: "Cue" });
  const visibles = filtrarLocal([asignada.fila, otra], "Soho");
  assert.deepEqual(visibles.map((fila) => fila.id), [7]);
  assert.equal(otra.local, "Cue");
  assert.equal(otra.estado, "comprobar");
});

test("paginación, orden y un TPV ficticio no cambian de importe ni de estado", () => {
  const filas = [
    { ...filaTrasAnadirColumna(base), id: 3 },
    { ...filaTrasAnadirColumna(tpv), id: 1 },
    { ...filaTrasAnadirColumna({ ...base, id: 2, conceptoBancario: "Otro" }), id: 2 },
  ].sort((a, b) => b.id - a.id);

  assert.deepEqual(paginar(filas, 0, 2).map((fila) => fila.id), [3, 2]);
  assert.deepEqual(paginar(filas, 2, 2).map((fila) => fila.id), [1]);

  const tarjeta = filas.find((fila) => fila.clase === "tpv-ingreso");
  assert.ok(tarjeta);
  const tocada = guardarNuestroConcepto(tarjeta, "Abono del sábado", true);
  assert.equal(tocada.ok, true);
  if (!tocada.ok) return;
  assert.equal(tocada.fila.clase, "tpv-ingreso");
  assert.equal(tocada.fila.estado, "ok");
  assert.equal(tocada.fila.importe, 6200);
  assert.equal(tocada.fila.conceptoBancario, "COMPRAS CON TARJETA IBERCAJA");
});
