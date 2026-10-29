import assert from "node:assert/strict";
import test from "node:test";
import { cambiarOrden, ordenarReferencias, COLUMNAS_MERCADERIAS } from "./orden";
import type { ReferenciaMercaderia } from "./modelo";

function fila(producto: string, n: number): ReferenciaMercaderia {
  return { clave: producto, producto, formato: "70 cl", compradas: n, bonificadas: n, recibidas: n * 2,
    importeCentimos: n * 100, precioCompra: n, costeReal: n, lineas: [] };
}
test("cada columna numérica ordena por valor, invierte y no modifica el original", () => {
  const filas = [fila("Dos", 2), fila("Diez", 10), fila("Uno", 1)];
  for (const c of COLUMNAS_MERCADERIAS.filter(c => c.campo !== "producto")) {
    assert.deepEqual(ordenarReferencias(filas, { campo: c.campo, descendente: true }).map(f => f.compradas), [10, 2, 1]);
    assert.deepEqual(ordenarReferencias(filas, { campo: c.campo, descendente: false }).map(f => f.compradas), [1, 2, 10]);
  }
  assert.deepEqual(filas.map(f => f.compradas), [2, 10, 1]);
});
test("producto permite Z–A y A–Z; cambiar de columna empieza descendente", () => {
  const filas = [fila("Alfa", 1), fila("Zeta", 1)];
  assert.equal(ordenarReferencias(filas, { campo: "producto", descendente: true })[0].producto, "Zeta");
  assert.equal(ordenarReferencias(filas, { campo: "producto", descendente: false })[0].producto, "Alfa");
  assert.deepEqual(cambiarOrden({ campo: "compradas", descendente: true }, "compradas"), { campo: "compradas", descendente: false });
  assert.deepEqual(cambiarOrden({ campo: "compradas", descendente: false }, "costeReal"), { campo: "costeReal", descendente: true });
});
test("precios sin compras quedan al final en ambos sentidos", () => {
  const gratis = { ...fila("Regalo", 0), precioCompra: null };
  for (const descendente of [true, false]) {
    assert.equal(ordenarReferencias([gratis, fila("Compra", 1)], { campo: "precioCompra", descendente })[1].producto, "Regalo");
  }
});
