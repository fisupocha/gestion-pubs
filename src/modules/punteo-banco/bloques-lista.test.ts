import assert from "node:assert/strict";
import test from "node:test";
import { ordenContinuo, unirBloque, type FilaOrdenada } from "./bloques-lista";
import { CLASES_VISIBLES_TABLA } from "./movimiento-interno";

test("dos bloques se unen sin duplicar y el orden bancario sigue bajando", () => {
  const primero = filas([500, 499, 498]);
  const segundo = filas([498, 497, 496]);
  const unidos = unirBloque(primero, segundo);

  assert.deepEqual(
    unidos.map((fila) => fila.ordenBanco),
    [500, 499, 498, 497, 496]
  );
  assert.deepEqual(
    unidos.map((fila) => fila.id),
    [500, 499, 498, 497, 496]
  );
  assert.equal(ordenContinuo(unidos), true);
  assert.equal(new Set(unidos.map((fila) => fila.id)).size, unidos.length);
});

test("un bloque desordenado o repetido no se cuela entre los ya visibles", () => {
  const unidos = unirBloque(filas([80, 79]), filas([90, 79, 78]));

  assert.deepEqual(
    unidos.map((fila) => fila.id),
    [80, 79, 78]
  );
  assert.equal(ordenContinuo(unidos), true);
});

test("cambiar de banco o de año sustituye la lista y conserva el borrador de otro identificador", () => {
  const borradores = new Map<number, string>([
    [10, "Nota de CaixaBank"],
    [20, "Nota de Ibercaja"],
  ]);
  const ibercaja = filas([40, 39]).map((fila) => ({
    ...fila,
    observaciones: borradores.get(fila.id) ?? "",
    estado: "pendiente" as const,
  }));

  assert.equal(ibercaja.every((fila) => fila.estado === "pendiente"), true);
  assert.equal(borradores.get(10), "Nota de CaixaBank");
  assert.equal(borradores.get(20), "Nota de Ibercaja");
  assert.equal(
    CLASES_VISIBLES_TABLA.some((clase) => clase.startsWith("tpv-")),
    false
  );
});

function filas(ordenes: number[]): FilaOrdenada[] {
  return ordenes.map((orden) => ({ id: orden, ordenBanco: orden }));
}
